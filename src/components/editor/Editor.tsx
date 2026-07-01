import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { useShallow } from 'zustand/react/shallow';
import { useVaultStore } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { wikilinkHighlighter } from './extensions/wikilink.ext';
import { typewriterExtension, toggleTypewriter } from './extensions/typewriter.ext';
import { slashCommandsExtension } from './extensions/slash-commands.ext';
import { aiContextMenuExtension } from './extensions/ai-context-menu.ext';

export function Editor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>();
  const lineNumbersCompartment = useRef(new Compartment());
  const {
    activeFile, activeContent, setActiveContent, setEditorView,
    setSaveStatus, setCursorPosition,
  } = useVaultStore(useShallow(s => ({
    activeFile: s.activeFile, activeContent: s.activeContent,
    setActiveContent: s.setActiveContent, setEditorView: s.setEditorView,
    setSaveStatus: s.setSaveStatus, setCursorPosition: s.setCursorPosition,
  })));
  const { showLineNumbers, autoSaveDelay } = useSettingsStore(useShallow(s => ({
    showLineNumbers: s.showLineNumbers, autoSaveDelay: s.autoSaveDelay,
  })));
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Refs let the auto-save closure always see the latest values without
  // being included in the editor setup effect's dependency array.
  const autoSaveDelayRef = useRef(autoSaveDelay);
  autoSaveDelayRef.current = autoSaveDelay;
  const activeFileRef = useRef(activeFile);
  activeFileRef.current = activeFile;
  // Último conteúdo emitido PELO editor — permite pular o efeito de sync
  // externo (que faz doc.toString() O(n)) quando a mudança veio do próprio editor.
  const lastFromEditorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Captura o arquivo deste editor no closure (NÃO usar activeFileRef no cleanup:
    // quando o cleanup roda, a ref já aponta para o PRÓXIMO arquivo, e o flush
    // gravaria o conteúdo da nota antiga por cima da nova).
    const fileForThisEditor = activeFile;

    const onUpdate = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString();
        lastFromEditorRef.current = content;
        setActiveContent(content);
        setSaveStatus('saving');

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          const file = activeFileRef.current;
          if (file) {
            try {
              await window.electron.fs.writeFile(file, content);
              setSaveStatus('saved');
            } catch {
              setSaveStatus('error');
            }
          }
        }, autoSaveDelayRef.current);
      }

      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        setCursorPosition({ line: line.number, col: pos - line.from + 1 });
      }
    });

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
          const content = view.state.doc.toString();
          const file = activeFileRef.current;
          if (file) {
            setSaveStatus('saving');
            window.electron.fs.writeFile(file, content)
              .then(() => setSaveStatus('saved'))
              .catch(() => setSaveStatus('error'));
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
        lineNumbersCompartment.current.of(showLineNumbers ? lineNumbers() : []),
        history(),
        bracketMatching(),
        closeBrackets(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        vellumKeymap,
        markdown(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ spellcheck: 'true' }),
        wikilinkHighlighter,
        ...typewriterExtension,
        slashCommandsExtension,
        aiContextMenuExtension,
        onUpdate,
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;
    setEditorView(view);

    return () => {
      // Flush do auto-save pendente: se havia um salvamento agendado (debounce),
      // grava IMEDIATAMENTE antes de destruir o editor. Sem isso, trocar de nota
      // dentro da janela do debounce descartava as últimas alterações digitadas.
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
        if (fileForThisEditor) {
          const content = view.state.doc.toString();
          window.electron.fs.writeFile(fileForThisEditor, content)
            .then(() => setSaveStatus('saved'))
            .catch(() => setSaveStatus('error'));
        }
      }
      view.destroy();
      setEditorView(null);
    };
  }, [activeFile]);

  // Reactively toggle line numbers without rebuilding the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: lineNumbersCompartment.current.reconfigure(showLineNumbers ? lineNumbers() : []),
    });
  }, [showLineNumbers]);

  // Sync external content changes (e.g., checkbox toggles from Preview)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // Mudança originada no próprio editor — nada a sincronizar (evita
    // doc.toString() + comparação O(n) a cada tecla digitada)
    if (activeContent === lastFromEditorRef.current) return;
    const docContent = view.state.doc.toString();
    if (docContent !== activeContent) {
      view.dispatch({
        changes: { from: 0, to: docContent.length, insert: activeContent },
      });
    }
  }, [activeContent]);

  if (!activeFile) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
        Selecione um arquivo para editar.
      </div>
    );
  }

  return <div ref={editorRef} style={{ height: '100%', overflow: 'auto' }} />;
}
