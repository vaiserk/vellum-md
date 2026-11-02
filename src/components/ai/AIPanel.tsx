import { useState, useRef, useEffect, useMemo, ReactElement, KeyboardEvent } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeReact from 'rehype-react';
import * as prod from 'react/jsx-runtime';
import { useShallow } from 'zustand/react/shallow';
import { useVaultStore, AIMessage } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { AIService } from '../../services/ai.service';
import { Send, Sparkles, FileText, CheckCircle, LayoutList, HelpCircle, CreditCard, X, Trash2, GitFork, Table, AlertCircle } from 'lucide-react';

function MarkdownContent({ content }: { content: string }) {
  const rendered = useMemo(() => {
    try {
      return unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeHighlight)
        .use(rehypeReact, { ...prod } as any)
        .processSync(content).result as ReactElement;
    } catch {
      return <span>{content}</span>;
    }
  }, [content]);

  return <div className="ai-markdown">{rendered}</div>;
}

const quickActions = [
  { label: 'Expandir',   icon: <Sparkles size={14} />,     prompt: 'Expanda o parágrafo selecionado com mais detalhes e exemplos' },
  { label: 'Resumir',    icon: <FileText size={14} />,      prompt: 'Resuma o conteúdo desta nota em 3 bullet points principais' },
  { label: 'Corrigir',   icon: <CheckCircle size={14} />,   prompt: 'Corrija erros gramaticais e de ortografia neste texto' },
  { label: 'Organizar',  icon: <LayoutList size={14} />,    prompt: 'Reorganize esta nota com uma estrutura de headings clara' },
  { label: 'Perguntas',  icon: <HelpCircle size={14} />,    prompt: 'Quais perguntas um leitor teria após ler esta nota?' },
  { label: 'Flashcards', icon: <CreditCard size={14} />,    prompt: 'Gere 5 flashcards Q&A no formato de tabela Markdown com o conteúdo desta nota' },
  { label: 'Diagrama',   icon: <GitFork size={14} />,       prompt: 'Crie um diagrama mermaid (graph TD) que ilustre o fluxo principal ou a estrutura descrita nesta nota. Siga estritamente as regras do mermaid 11 informadas no seu contexto.' },
  { label: 'Tabela',     icon: <Table size={14} />,         prompt: 'Organize as informações desta nota em uma ou mais tabelas Markdown com colunas e linhas relevantes.' },
  { label: 'Callout',    icon: <AlertCircle size={14} />,   prompt: 'Identifique o ponto mais importante desta nota e reformule-o como um callout VellumMD apropriado (ex: [!IMPORTANT], [!TIP], [!WARNING]).' },
];

export function AIPanel({ onClose }: { onClose: () => void }) {
  // NÃO assina activeContent/activeFile: antes, cada tecla digitada no editor
  // re-renderizava o painel inteiro (incluindo o histórico de mensagens).
  // O conteúdo da nota é lido via getState() apenas no momento do envio.
  const { editorView, aiMessages, setAiMessages } = useVaultStore(useShallow(s => ({
    editorView: s.editorView, aiMessages: s.aiMessages, setAiMessages: s.setAiMessages,
  })));
  const apiKey = useSettingsStore(s => s.apiKey);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, streamingText]);

  // Trecho selecionado no editor. Três das ações rápidas falam explicitamente
  // da seleção ("Expanda o parágrafo selecionado", "Corrija... neste texto"),
  // mas ela nunca era lida — a IA operava sempre sobre a nota inteira e
  // parecia que selecionar não fazia efeito.
  const getSelecao = (): string => {
    const view = useVaultStore.getState().editorView;
    if (!view) return '';
    const sel = view.state.selection.main;
    if (sel.empty) return '';
    return view.state.doc.sliceString(sel.from, sel.to).trim();
  };

  // Teto de contexto enviado à IA. O valor anterior (4000) cortava um capítulo
  // de TCC em ~1,5 página e o "Resumir" saía incompleto sem nenhum aviso.
  const LIMITE_CONTEXTO = 24000;

  const getSystemPrompt = () => {
    // Lê a nota ativa no momento do envio (não via subscription — ver comentário acima)
    const { activeContent, activeFile } = useVaultStore.getState();
    const title = activeFile?.split(/[/\\]/).pop()?.replace('.md', '') || 'Sem título';
    const truncada = activeContent.length > LIMITE_CONTEXTO;
    const selecao = getSelecao();
    return `Você é um assistente de escrita especializado no VellumMD — um app de notas Markdown com recursos avançados de renderização.
O usuário está editando: **${title}**

<nota_atual>
${activeContent.slice(0, LIMITE_CONTEXTO)}
</nota_atual>${truncada ? `
<aviso>A nota foi truncada: você está vendo apenas os primeiros ${LIMITE_CONTEXTO} caracteres de ${activeContent.length}. Se a tarefa exigir a nota inteira, diga isso ao usuário em vez de responder parcialmente como se tivesse lido tudo.</aviso>` : ''}${selecao ? `

<selecao>
${selecao}
</selecao>
O usuário SELECIONOU o trecho acima. Quando a tarefa falar em "selecionado", "este texto" ou "este trecho", opere sobre <selecao>, usando <nota_atual> apenas como contexto.` : ''}

## Regras de resposta
- Responda sempre em português, seja conciso e direto
- Formate respostas em Markdown válido para o VellumMD
- Ao gerar código, use blocos de código com a linguagem correta

## Recursos disponíveis no VellumMD (use-os quando relevante)

### Mermaid ${"`"}11.14.0${"`"} — REGRAS OBRIGATÓRIAS (nunca quebre estas regras)
- Todo label com acentos, espaços, ?, :, (), <>, /, \\ ou qualquer símbolo especial DEVE estar entre aspas duplas: A["Texto com acento é obrigatório"]
- NUNCA use tags HTML (<br>, <b>, etc.) dentro de labels. Para quebra de linha use \\n dentro de aspas: A["linha1\\nlinha2"]
- Nomes de subgrafo com espaços ou acentos: subgraph id["Rótulo com Espaço"] — id deve ser alfanumérico (sem espaços)
- Edge labels com símbolos: A -- "rótulo: especial?" --> B
- Símbolos matemáticos em labels: substituir ≥ por >=, ≤ por <=, → por ->
- Nunca repita um subgrafo com o mesmo id no mesmo diagrama
- Exemplo de diagrama válido:
\`\`\`mermaid
graph TD
    subgraph inicio["Início"]
        A["Upload de Arquivo\\n(mp4/avi/mov)"]
    end
    subgraph processamento["Processamento"]
        A --> B{"Arquivo válido?"}
        B -- "SIM" --> C["Processar"]
        B -- "NÃO" --> D["Mostrar erro"]
    end
\`\`\`

### Fórmulas LaTeX (KaTeX)
- Inline: $E = mc^2$ ou $\\frac{a}{b}$
- Bloco centralizado: $$\\int_0^\\infty f(x)\\,dx$$

### Callouts
\`\`\`
> [!NOTE] Informação adicional
> [!TIP] Dica útil para o leitor
> [!WARNING] Atenção necessária
> [!CAUTION] Cuidado com isto
> [!IMPORTANT] Ponto essencial
> [!DANGER] Perigo crítico
\`\`\`

### Wikilinks
- [[Nome da Nota]] — link para outra nota do vault
- Sugira conexões com outras notas quando fizer sentido

### Task lists interativas
- [ ] tarefa pendente
- [x] tarefa concluída

### Tabelas GFM
| Coluna A | Coluna B | Coluna C |
|----------|----------|----------|
| valor    | valor    | valor    |

### Blocos de código com syntax highlight
\`\`\`python
# python, typescript, javascript, c, sql, bash, etc.
\`\`\`
`;
  };

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return;
    if (!apiKey) {
      setAiMessages(prev => [...prev, 
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '⚠️ API key não configurada. Vá em ⚙️ Configurações para adicionar.' }
      ]);
      return;
    }

    const newMessages: AIMessage[] = [...aiMessages, { role: 'user', content: userMessage }];
    setAiMessages(newMessages);
    setInput('');
    setLoading(true);
    setStreamingText('');

    try {
      const chatMessages = [
        { role: 'system' as const, content: getSystemPrompt() },
        ...newMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ];

      let fullResponse = '';
      await AIService.chat(chatMessages, (chunk) => {
        fullResponse += chunk;
        setStreamingText(fullResponse);
      });

      // Resposta vazia acontece quando o provedor bloqueia por filtro de
      // conteúdo ou estoura o limite de tokens. Sem esta checagem, surgia uma
      // bolha em branco com botão "Inserir" — o usuário não sabia se tinha
      // travado, falhado, ou se a IA não tinha nada a dizer; e "Inserir"
      // colava duas linhas vazias na nota.
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: fullResponse.trim()
          ? fullResponse
          : '⚠️ A IA não retornou conteúdo. Pode ter sido bloqueio do filtro de conteúdo do provedor ou limite de tokens atingido. Tente reformular a pergunta.',
      }]);
      setStreamingText('');
    } catch (err: any) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${err.message}` }]);
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const insertInEditor = (text: string) => {
    if (!editorView) return;
    const pos = editorView.state.selection.main.head;
    editorView.dispatch({
      changes: { from: pos, insert: '\n' + text + '\n' },
    });
    editorView.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <span>🤖 Assistente IA</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setAiMessages([])} className="ai-close" title="Limpar conversa">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="ai-close" title="Fechar painel">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="ai-quick-actions">
        {quickActions.map(action => (
          <button 
            key={action.label}
            className="ai-quick-btn"
            onClick={() => handleQuickAction(action.prompt)}
            title={action.prompt}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div className="ai-chat-messages">
        {aiMessages.length === 0 && !loading && (
          <div className="ai-empty">
            Pergunte algo sobre sua nota ou use as ações rápidas acima.
          </div>
        )}
        {aiMessages.map((msg, i) => (
          <div key={i} className={`ai-message ai-message-${msg.role}`}>
            {msg.role === 'assistant'
              ? <MarkdownContent content={msg.content} />
              : <div className="ai-message-content">{msg.content}</div>
            }
            {msg.role === 'assistant' && (
              <button
                className="ai-insert-btn"
                onClick={() => insertInEditor(msg.content)}
                title="Inserir no editor"
              >
                Inserir ↗
              </button>
            )}
          </div>
        ))}
        {streamingText && (
          <div className="ai-message ai-message-assistant">
            <MarkdownContent content={streamingText} />
          </div>
        )}
        {loading && !streamingText && (
          <div className="ai-message ai-message-assistant">
            <div className="ai-message-content ai-typing">Pensando...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="ai-input-area">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo..."
          rows={2}
          className="ai-input"
        />
        <button 
          onClick={() => sendMessage(input)} 
          disabled={loading || !input.trim()}
          className="ai-send-btn"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
