import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { useVaultStore } from '../../store/vault.store';
import { wikilinkHighlighter } from './extensions/wikilink.ext';
import { typewriterExtension, toggleTypewriter } from './extensions/typewriter.ext';
import { slashCommandsExtension } from './extensions/slash-commands.ext';

declare global {
  interface Window {
    electron: {
      fs: {
        openVault: () => Promise<string>;
        readDir: (path: string) => Promise<any[]>;
        readFile: (path: string) => Promise<string>;
        writeFile: (path: string, content: string) => Promise<boolean>;
        createFile: (path: string) => Promise<boolean>;
        renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
        deleteFile: (path: string) => Promise<boolean>;
        restoreLastDeleted: (vaultPath: string) => Promise<boolean>;
      }
    }
  }
}

export function Editor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>();
  const { 
    activeFile, activeContent, setActiveContent, setEditorView,
    setSaveStatus, setCursorPosition
  } = useVaultStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!editorRef.current) return;

    const onUpdate = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString();
        setActiveContent(content);
        setSaveStatus('saving');
        
        // Auto-save debounce (800ms per spec)
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          if (activeFile) {
            try {
              await window.electron.fs.writeFile(activeFile, content);
              setSaveStatus('saved');
            } catch (e) {
              setSaveStatus('error');
            }
          }
        }, 800);
      }
      
      // Update cursor position
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        setCursorPosition({ line: line.number, col: pos - line.from + 1 });
      }
    });

    // Custom keybindings
    const vellumKeymap = keymap.of([
      {
        key: 'Ctrl-b',
        run: (view) => {
          const sel = view.state.selection.main;
          const text = view.state.doc.sliceString(sel.from, sel.to);
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: `**${text}**` },
            selection: { anchor: sel.from + 2, head: sel.to + 2 }
          });
          return true;
        }
      },
      {
        key: 'Ctrl-i',
        run: (view) => {
          const sel = view.state.selection.main;
          const text = view.state.doc.sliceString(sel.from, sel.to);
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: `*${text}*` },
            selection: { anchor: sel.from + 1, head: sel.to + 1 }
          });
          return true;
        }
      },
      {
        key: 'Ctrl-Shift-t',
        run: (view) => {
          toggleTypewriter(view);
          const store = useVaultStore.getState();
          store.setTypewriterMode(!store.typewriterMode);
          return true;
        }
      },
      {
        key: 'Ctrl-\\',
        run: () => {
          useVaultStore.getState().cycleLayoutMode();
          return true;
        }
      },
      {
        key: 'Ctrl-p',
        run: () => {
          useVaultStore.getState().setCommandPaletteOpen(true);
          return true;
        }
      },
      {
        key: 'Ctrl-s',
        run: (view) => {
          // Manual save
          const content = view.state.doc.toString();
          if (activeFile) {
            setSaveStatus('saving');
            window.electron.fs.writeFile(activeFile, content).then(() => {
              setSaveStatus('saved');
            }).catch(() => setSaveStatus('error'));
          }
          return true;
        }
      },
      {
        key: 'Ctrl-Shift-m',
        run: (view) => {
          const pos = view.state.selection.main.head;
          view.dispatch({
            changes: { from: pos, insert: '$$\n\n$$' },
            selection: { anchor: pos + 3 }
          });
          return true;
        }
      },
      {
        key: 'Ctrl-Shift-d',
        run: (view) => {
          const pos = view.state.selection.main.head;
          view.dispatch({
            changes: { from: pos, insert: '```mermaid\ngraph TD\n  A --> B\n```' },
            selection: { anchor: pos + 10 }
          });
          return true;
        }
      },
    ]);

    const state = EditorState.create({
      doc: activeContent,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        closeBrackets(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        vellumKeymap,
        markdown(),
        EditorView.lineWrapping,
        wikilinkHighlighter,
        ...typewriterExtension,
        slashCommandsExtension,
        onUpdate,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    
    viewRef.current = view;
    setEditorView(view);

    return () => {
      view.destroy();
      setEditorView(null);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [activeFile]);

  if (!activeFile) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
        Selecione um arquivo para editar.
      </div>
    );
  }

  return <div ref={editorRef} style={{ height: '100%', overflow: 'auto' }} />;
}
