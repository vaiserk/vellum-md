import React from 'react';
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, Quote, List, Table, Image as ImageIcon, Link as LinkIcon, SquareFunction, GitBranch, Sparkles } from 'lucide-react';

import { useVaultStore } from '../../store/vault.store';

export function EditorToolbar() {
  const { editorView, aiPanelOpen, setAiPanelOpen } = useVaultStore();

  const handleAction = (action: string) => {
    if (!editorView) return;
    
    const state = editorView.state;
    const selection = state.selection.main;
    const text = state.doc.sliceString(selection.from, selection.to);
    
    let prefix = '';
    let suffix = '';
    let isBlock = false;

    switch (action) {
      case 'bold': prefix = '**'; suffix = '**'; break;
      case 'italic': prefix = '*'; suffix = '*'; break;
      case 'strikethrough': prefix = '~~'; suffix = '~~'; break;
      case 'code': prefix = '`'; suffix = '`'; break;
      case 'h1': prefix = '# '; isBlock = true; break;
      case 'h2': prefix = '## '; isBlock = true; break;
      case 'h3': prefix = '### '; isBlock = true; break;
      case 'quote': prefix = '> '; isBlock = true; break;
      case 'list': prefix = '- '; isBlock = true; break;
      case 'latex': prefix = '$$\n'; suffix = '\n$$'; break;
      case 'mermaid': prefix = '```mermaid\ngraph TD\n  A --> B\n```\n'; break;
      case 'table': prefix = '\n| Col 1 | Col 2 | Col 3 |\n|---|---|---|\n|  |  |  |\n'; break;
      case 'link': prefix = '['; suffix = '](url)'; break;
      case 'image': prefix = '!['; suffix = '](url)'; break;
    }

    if (isBlock) {
      const line = state.doc.lineAt(selection.from);
      const lineText = line.text;
      
      if (lineText.startsWith(prefix)) {
        editorView.dispatch({
          changes: { from: line.from, to: line.from + prefix.length, insert: '' }
        });
      } else {
        editorView.dispatch({
          changes: { from: line.from, insert: prefix },
          selection: { anchor: selection.from + prefix.length, head: selection.to + prefix.length }
        });
      }
    } else {
      if (text.startsWith(prefix) && text.endsWith(suffix) && text.length >= prefix.length + suffix.length) {
        const innerText = text.slice(prefix.length, text.length - suffix.length);
        editorView.dispatch({
          changes: { from: selection.from, to: selection.to, insert: innerText },
          selection: { anchor: selection.from, head: selection.from + innerText.length }
        });
      } else {
        editorView.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: prefix + text + suffix
          },
          selection: { 
            anchor: selection.from + prefix.length, 
            head: selection.to + prefix.length 
          }
        });
      }
    }
    editorView.focus();
  };

  return (
    <div className="editor-toolbar">
      <button onClick={() => handleAction('bold')} title="Bold"><Bold size={16} /></button>
      <button onClick={() => handleAction('italic')} title="Italic"><Italic size={16} /></button>
      <button onClick={() => handleAction('strikethrough')} title="Strikethrough"><Strikethrough size={16} /></button>
      <div className="toolbar-divider" />
      <button onClick={() => handleAction('h1')} title="Heading 1"><Heading1 size={16} /></button>
      <button onClick={() => handleAction('h2')} title="Heading 2"><Heading2 size={16} /></button>
      <button onClick={() => handleAction('h3')} title="Heading 3"><Heading3 size={16} /></button>
      <div className="toolbar-divider" />
      <button onClick={() => handleAction('quote')} title="Quote"><Quote size={16} /></button>
      <button onClick={() => handleAction('list')} title="List"><List size={16} /></button>
      <button onClick={() => handleAction('code')} title="Code"><Code size={16} /></button>
      <div className="toolbar-divider" />
      <button onClick={() => handleAction('latex')} title="LaTeX"><SquareFunction size={16} /></button>
      <button onClick={() => handleAction('mermaid')} title="Mermaid"><GitBranch size={16} /></button>
      <button onClick={() => handleAction('table')} title="Table"><Table size={16} /></button>
      <button onClick={() => handleAction('link')} title="Link"><LinkIcon size={16} /></button>
      <button onClick={() => handleAction('image')} title="Image"><ImageIcon size={16} /></button>
      <div className="toolbar-divider" />
      <button onClick={() => setAiPanelOpen(!aiPanelOpen)} title="Assistente IA (Ctrl+Shift+A)" className={aiPanelOpen ? 'active' : ''}><Sparkles size={16} /></button>
    </div>
  );
}
