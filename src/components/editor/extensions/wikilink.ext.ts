import {
  ViewPlugin,
  Decoration,
  DecorationSet,
  EditorView,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { useVaultStore } from '../../../store/vault.store';

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

// Cache the known-notes set so we don't re-walk the file tree on every viewport update
let _lastFiles: any[] = [];
let _knownNotes: Set<string> = new Set();

function getKnownNotes(files: any[]): Set<string> {
  if (files === _lastFiles) return _knownNotes;
  _lastFiles = files;
  _knownNotes = new Set();
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.type === 'file') _knownNotes.add(n.name.replace(/\.md$/i, '').toLowerCase());
      if (n.children) walk(n.children);
    }
  };
  walk(files);
  return _knownNotes;
}

function buildDecorations(view: EditorView): DecorationSet {
  const { files } = useVaultStore.getState();
  const knownNotes = getKnownNotes(files);
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    WIKILINK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WIKILINK_RE.exec(text)) !== null) {
      const noteName = match[1];
      const exists = knownNotes.has(noteName.toLowerCase());
      builder.add(
        from + match.index,
        from + match.index + match[0].length,
        Decoration.mark({
          class: exists ? 'cm-wikilink' : 'cm-wikilink-broken',
          attributes: {
            title: exists
              ? `Ctrl+Click para abrir: ${noteName}`
              : `Nota não encontrada: ${noteName}`,
            'data-wikilink': noteName,
          },
        })
      );
    }
  }
  return builder.finish();
}

export const wikilinkHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: any) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    eventHandlers: {
      mousedown(event: MouseEvent) {
        const target = event.target as HTMLElement;
        const wikilink = target.closest('[data-wikilink]');
        if (event.ctrlKey && wikilink) {
          event.preventDefault();
          const noteName = wikilink.getAttribute('data-wikilink');
          if (noteName) {
            window.dispatchEvent(new CustomEvent('vellum:open-note', { detail: { name: noteName } }));
          }
        }
      },
    },
  }
);
