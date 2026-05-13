import React, { useState, useRef, useEffect } from 'react';
import { useVaultStore, AIMessage } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { AIService } from '../../services/ai.service';
import { Send, Sparkles, FileText, CheckCircle, LayoutList, HelpCircle, CreditCard, X, Trash2 } from 'lucide-react';

const quickActions = [
  { label: 'Expandir', icon: <Sparkles size={14} />, prompt: 'Expanda o parágrafo selecionado com mais detalhes e exemplos' },
  { label: 'Resumir', icon: <FileText size={14} />, prompt: 'Resuma o conteúdo desta nota em 3 bullet points principais' },
  { label: 'Corrigir', icon: <CheckCircle size={14} />, prompt: 'Corrija erros gramaticais e de ortografia neste texto' },
  { label: 'Organizar', icon: <LayoutList size={14} />, prompt: 'Reorganize esta nota com uma estrutura de headings clara' },
  { label: 'Perguntas', icon: <HelpCircle size={14} />, prompt: 'Quais perguntas um leitor teria após ler esta nota?' },
  { label: 'Flashcards', icon: <CreditCard size={14} />, prompt: 'Gere 5 flashcards Q&A no formato de tabela MD com o conteúdo desta nota' },
];

export function AIPanel({ onClose }: { onClose: () => void }) {
  const { activeContent, activeFile, editorView, aiMessages, setAiMessages } = useVaultStore();
  const { apiKey } = useSettingsStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, streamingText]);

  const getSystemPrompt = () => {
    const title = activeFile?.split('/').pop()?.replace('.md', '') || 'Sem título';
    return `Você é um assistente de escrita inteligente. O usuário está editando a seguinte nota:

Título: ${title}
Conteúdo:
---
${activeContent.slice(0, 4000)}
---

Responda sempre em português. Seja conciso e direto. Ao sugerir texto, formate em Markdown. Quando apropriado, use LaTeX para fórmulas.`;
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

      setAiMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
            <div className="ai-message-content">{msg.content}</div>
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
            <div className="ai-message-content">{streamingText}</div>
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
