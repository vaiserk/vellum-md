import { ViewPlugin, EditorView } from '@codemirror/view';
import { AIService } from '../../../services/ai.service';

interface MenuItem {
  label: string;
  icon: string;
  buildPrompt: (selected: string) => string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Reescrever seleção',
    icon: '✏️',
    buildPrompt: (text) =>
      `Reescreva o texto abaixo de forma mais clara e precisa. Responda APENAS com o texto reescrito, sem explicações:\n\n${text}`,
  },
  {
    label: 'Explicar',
    icon: '💡',
    buildPrompt: (text) =>
      `Explique de forma concisa e clara o seguinte trecho:\n\n${text}`,
  },
  {
    label: 'Traduzir para PT-BR',
    icon: '🌐',
    buildPrompt: (text) =>
      `Traduza o texto abaixo para Português do Brasil. Responda APENAS com a tradução:\n\n${text}`,
  },
];

let activeMenu: HTMLElement | null = null;

function removeMenu() {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
}

function showMenu(view: EditorView, x: number, y: number, selectedText: string, from: number, to: number) {
  removeMenu();

  const menu = document.createElement('div');
  menu.className = 'ai-context-menu';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  MENU_ITEMS.forEach(item => {
    const btn = document.createElement('div');
    btn.className = 'ai-context-menu-item';
    btn.textContent = `${item.icon} ${item.label}`;

    btn.addEventListener('click', async () => {
      btn.className = 'ai-context-menu-item loading';
      btn.textContent = '⏳ Processando...';

      try {
        const result = await AIService.chat([
          { role: 'system', content: 'Você é um assistente de escrita. Siga as instruções do usuário com precisão.' },
          { role: 'user', content: item.buildPrompt(selectedText) },
        ]);

        if (item.label === 'Explicar') {
          // Append explanation after selection
          view.dispatch({
            changes: { from: to, insert: `\n\n> 💡 **Explicação:** ${result.trim()}\n` },
          });
        } else {
          // Replace selection with result
          view.dispatch({
            changes: { from, to, insert: result.trim() },
            selection: { anchor: from + result.trim().length },
          });
        }
      } catch (e) {
        btn.textContent = '✕ Erro na IA';
        setTimeout(removeMenu, 1500);
        return;
      }

      removeMenu();
    });

    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  activeMenu = menu;

  // Close on outside click or Escape
  const closeOnOutside = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      removeMenu();
      document.removeEventListener('mousedown', closeOnOutside);
    }
  };
  const closeOnEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      removeMenu();
      document.removeEventListener('keydown', closeOnEscape);
    }
  };
  // Delay to avoid immediately closing on the same mousedown that opened it
  setTimeout(() => {
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
  }, 0);
}

export const aiContextMenuExtension = ViewPlugin.fromClass(
  class {
    destroy() {
      removeMenu();
    }
  },
  {
    eventHandlers: {
      contextmenu(event: MouseEvent, view: EditorView) {
        const sel = view.state.selection.main;
        if (sel.empty) return; // No selection — let browser handle normally

        const selectedText = view.state.doc.sliceString(sel.from, sel.to).trim();
        if (!selectedText) return;

        event.preventDefault();
        showMenu(view, event.clientX, event.clientY, selectedText, sel.from, sel.to);
      },
    },
  }
);
