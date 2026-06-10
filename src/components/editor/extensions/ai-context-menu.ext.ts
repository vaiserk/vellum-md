import { ViewPlugin, EditorView } from '@codemirror/view';
import { AIService } from '../../../services/ai.service';

interface AIMenuItem {
  label: string;
  icon: string;
  buildPrompt: (selected: string) => string;
  isExplanation?: boolean;
}

const AI_MENU_ITEMS: AIMenuItem[] = [
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
    isExplanation: true,
  },
  {
    label: 'Traduzir para PT-BR',
    icon: '🌐',
    buildPrompt: (text) =>
      `Traduza o texto abaixo para Português do Brasil. Responda APENAS com a tradução:\n\n${text}`,
  },
];

let activeMenu: HTMLElement | null = null;
let stopListeners: (() => void) | null = null;

function removeMenu() {
  // Cancel listeners BEFORE removing the element to avoid re-entrant calls
  const stop = stopListeners;
  stopListeners = null;
  stop?.();
  activeMenu?.remove();
  activeMenu = null;
}

function clampToViewport(el: HTMLElement, x: number, y: number) {
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.min(x, window.innerWidth  - r.width  - 8)}px`;
  el.style.top  = `${Math.min(y, window.innerHeight - r.height - 8)}px`;
}

function attachCloseListeners(el: HTMLElement) {
  const onOutside = (e: MouseEvent) => {
    if (!el.contains(e.target as Node)) removeMenu();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') removeMenu(); };
  // Delay so the click that opened the menu doesn't immediately close it
  const tid = setTimeout(() => {
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown',   onKey);
  }, 0);
  stopListeners = () => {
    clearTimeout(tid);
    document.removeEventListener('mousedown', onOutside);
    document.removeEventListener('keydown',   onKey);
  };
}

// ─── Preview panel (shown after AI responds) ──────────────────────────────────
function showPreviewPanel(
  view: EditorView,
  x: number, y: number,
  result: string,
  from: number, to: number,
  isExplanation: boolean
) {
  removeMenu();

  const panel = document.createElement('div');
  panel.className = 'ai-preview-panel';
  panel.style.left = '-9999px';

  const header = document.createElement('div');
  header.className = 'ai-preview-header';
  header.textContent = isExplanation ? '💡 Explicação gerada' : '✏️ Resultado da IA';

  const resultEl = document.createElement('div');
  resultEl.className = 'ai-preview-result';
  resultEl.textContent = result;

  const actions = document.createElement('div');
  actions.className = 'ai-preview-actions';

  const applyBtn = document.createElement('button');
  applyBtn.className = 'ai-preview-apply';
  applyBtn.textContent = '✓ Aplicar';
  applyBtn.addEventListener('click', () => {
    if (isExplanation) {
      view.dispatch({ changes: { from: to, insert: `\n\n> 💡 **Explicação:** ${result}\n` } });
    } else {
      view.dispatch({
        changes: { from, to, insert: result },
        selection: { anchor: from + result.length },
      });
    }
    removeMenu();
    view.focus();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'ai-preview-cancel';
  cancelBtn.textContent = '✕ Cancelar';
  cancelBtn.addEventListener('click', () => { removeMenu(); view.focus(); });

  actions.appendChild(applyBtn);
  actions.appendChild(cancelBtn);
  panel.appendChild(header);
  panel.appendChild(resultEl);
  panel.appendChild(actions);

  clampToViewport(panel, x, y);
  activeMenu = panel;
  attachCloseListeners(panel);
}

// ─── Main context menu ────────────────────────────────────────────────────────
function showContextMenu(
  view: EditorView,
  x: number, y: number,
  selectedText: string,
  from: number, to: number
) {
  removeMenu();

  const menu = document.createElement('div');
  menu.className = 'ai-context-menu';
  menu.style.left = '-9999px';

  const addItem = (icon: string, label: string, disabled: boolean, onClick: () => void) => {
    const row = document.createElement('div');
    row.className = 'ai-context-menu-item' + (disabled ? ' disabled' : '');
    row.innerHTML = `<span class="ctx-icon">${icon}</span><span>${label}</span>`;
    if (!disabled) row.addEventListener('click', onClick);
    menu.appendChild(row);
  };

  const addSep = () => {
    const sep = document.createElement('div');
    sep.className = 'ai-context-menu-sep';
    menu.appendChild(sep);
  };

  const hasSelection = selectedText.length > 0;

  // Native edit actions
  addItem('✂️', 'Recortar', !hasSelection, () => { removeMenu(); document.execCommand('cut'); });
  addItem('📋', 'Copiar',   !hasSelection, () => { removeMenu(); document.execCommand('copy'); });
  addItem('📌', 'Colar', false, () => {
    removeMenu();
    navigator.clipboard.readText().then(text => {
      const pos = view.state.selection.main.head;
      view.dispatch({ changes: { from: pos, insert: text } });
      view.focus();
    });
  });

  // AI actions (only when text is selected)
  if (hasSelection) {
    addSep();

    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'ai-context-menu-label';
    sectionLabel.textContent = '✨ Assistente IA';
    menu.appendChild(sectionLabel);

    AI_MENU_ITEMS.forEach(item => {
      const row = document.createElement('div');
      row.className = 'ai-context-menu-item';
      row.innerHTML = `<span class="ctx-icon">${item.icon}</span><span>${item.label}</span>`;
      row.addEventListener('click', async () => {
        row.classList.add('loading');
        row.innerHTML = '<span class="ctx-icon">⏳</span><span>Processando...</span>';
        try {
          const result = await AIService.chat([
            { role: 'system', content: 'Você é um assistente de escrita. Siga as instruções do usuário com precisão.' },
            { role: 'user', content: item.buildPrompt(selectedText) },
          ]);
          showPreviewPanel(view, x, y, result.trim(), from, to, !!item.isExplanation);
        } catch {
          row.innerHTML = '<span class="ctx-icon">✕</span><span>Erro na IA</span>';
          setTimeout(removeMenu, 1500);
        }
      });
      menu.appendChild(row);
    });
  }

  clampToViewport(menu, x, y);
  activeMenu = menu;
  attachCloseListeners(menu);
}

// ─── CodeMirror extension ─────────────────────────────────────────────────────
export const aiContextMenuExtension = ViewPlugin.fromClass(
  class { destroy() { removeMenu(); } },
  {
    eventHandlers: {
      contextmenu(event: MouseEvent, view: EditorView) {
        event.preventDefault();
        const sel = view.state.selection.main;
        const selectedText = sel.empty ? '' : view.state.doc.sliceString(sel.from, sel.to).trim();
        showContextMenu(view, event.clientX, event.clientY, selectedText, sel.from, sel.to);
      },
    },
  }
);
