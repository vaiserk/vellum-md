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
import { latexInlinePreview } from './extensions/latex.ext';
import { mermaidInlinePreview } from './extensions/mermaid.ext';
import { tableInlinePreview } from './extensions/table.ext';

export function Editor() {
  // O editor só pode gravar notas. A árvore de arquivos também lista imagens
  // (png/jpg/gif/svg/webp) e, ao abrir uma, o editor recebe um embed markdown;
  // sem esta guarda, qualquer tecla digitada agendava um auto-save que
  // SOBRESCREVIA o arquivo de imagem com texto.
  const gravavel = (caminho: string | null | undefined): caminho is string =>
    !!caminho && /\.(md|txt)$/i.test(caminho);

  // Flush ao fechar a janela.
  // O auto-save é debounced (200–2000 ms). Fechar o app NÃO desmonta o React,
  // então o cleanup do efeito do editor — que já faz flush ao trocar de nota —
  // nunca roda, e o timeout pendente era simplesmente descartado: a última
  // frase digitada se perdia em silêncio. A gravação precisa ser síncrona,
  // porque em beforeunload uma Promise não chega a resolver.
  useEffect(() => {
    const aoFechar = () => {
      const pendente = pendenteRef.current;
      if (!pendente) return;
      try {
        window.electron.fs.writeFileSync(pendente.file, pendente.content);
        pendenteRef.current = null;
      } catch {
        /* nada a fazer: a janela está fechando */
      }
    };
    window.addEventListener('beforeunload', aoFechar);
    return () => window.removeEventListener('beforeunload', aoFechar);
  }, []);

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
  /** Última edição ainda não gravada em disco — usada no flush ao fechar. */
  const pendenteRef = useRef<{ file: string; content: string } | null>(null);

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
        if (gravavel(fileForThisEditor)) pendenteRef.current = { file: fileForThisEditor, content };
        saveTimeoutRef.current = setTimeout(async () => {
          // Zera a ref ANTES de gravar: sem isso ela guardava o id de um
          // timeout já disparado, e o cleanup do efeito regravava o arquivo a
          // cada troca de nota. Isso mudava o mtime sem alteração real, o que
          // invalidava a entrada no cache de embeddings e fazia a nota ser
          // reembedada (custo de API) só por ter sido visitada.
          saveTimeoutRef.current = undefined;
          const file = activeFileRef.current;
          if (gravavel(file)) {
            try {
              await window.electron.fs.writeFile(file, content);
              pendenteRef.current = null;
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

    // O Markdown nao aceita espaco antes do delimitador de fechamento:
    // "**texto **" nao vira negrito. Como o duplo clique costuma levar o
    // espaco junto, os espacos das pontas ficam fora dos marcadores.
    const envolverSelecao = (view: EditorView, marca: string): boolean => {
      const sel = view.state.selection.main;
      const texto = view.state.doc.sliceString(sel.from, sel.to);
      const miolo = texto.trim();
      // Sem selecao (ou so espacos): insere o par de marcadores e poe o
      // cursor no meio, para a pessoa digitar ja formatado.
      if (!miolo) {
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: `${marca}${marca}` },
          selection: { anchor: sel.from + marca.length }
        });
        return true;
      }
      const inicio = sel.from + (texto.length - texto.trimStart().length);
      const fim = sel.to - (texto.length - texto.trimEnd().length);
      view.dispatch({
        changes: { from: inicio, to: fim, insert: `${marca}${miolo}${marca}` },
        selection: { anchor: inicio + marca.length, head: inicio + marca.length + miolo.length }
      });
      return true;
    };

    const vellumKeymap = keymap.of([
      {
        key: 'Ctrl-b',
        run: (view) => envolverSelecao(view, '**')
      },
      {
        key: 'Ctrl-i',
        run: (view) => envolverSelecao(view, '*')
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
      // Ctrl+\ e Ctrl+P NÃO são registrados aqui de propósito.
      // O CodeMirror só interrompe a propagação do evento quando o binding
      // declara stopPropagation: true. Sem isso, a tecla era tratada aqui E
      // subia até o listener global de App.tsx, alternando o layout DUAS vezes
      // por toque — o modo "editor" ficava inalcançável pelo atalho. O handler
      // global já cobre o editor, então basta ele.
      {
        key: 'Ctrl-s',
        run: (view) => {
          const content = view.state.doc.toString();
          const file = activeFileRef.current;
          if (gravavel(file)) {
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
        // Preview inline de LaTeX, Mermaid e tabelas no próprio editor (fora do
        // cursor): fórmulas, diagramas e tabelas renderizam no lugar do
        // código-fonte; clicar no widget devolve o código editável. Cumpre o
        // requisito do projeto de renderização "diretamente no editor".
        latexInlinePreview,
        mermaidInlinePreview,
        tableInlinePreview,
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
        if (gravavel(fileForThisEditor)) {
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
