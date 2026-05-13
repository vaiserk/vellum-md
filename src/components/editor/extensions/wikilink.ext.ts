import { 
  ViewPlugin, 
  Decoration, 
  DecorationSet,
  EditorView,
  WidgetType,
  MatchDecorator
} from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';

// Wikilink decoration: matches [[...]] and styles them
const wikilinkMatcher = new MatchDecorator({
  regexp: /\[\[([^\]]+)\]\]/g,
  decoration: (match) => {
    return Decoration.mark({
      class: 'cm-wikilink',
      attributes: {
        title: `Abrir: ${match[1]}`,
        'data-wikilink': match[1],
      }
    });
  }
});

export const wikilinkHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = wikilinkMatcher.createDeco(view);
    }
    update(update: any) {
      this.decorations = wikilinkMatcher.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
    eventHandlers: {
      click(event: MouseEvent, view: EditorView) {
        const target = event.target as HTMLElement;
        if (event.ctrlKey && target.classList.contains('cm-wikilink')) {
          const noteName = target.getAttribute('data-wikilink');
          if (noteName) {
            // Dispatch custom event so the app can handle navigation
            window.dispatchEvent(new CustomEvent('vellum:open-note', { detail: { name: noteName } }));
          }
        }
      }
    }
  }
);
