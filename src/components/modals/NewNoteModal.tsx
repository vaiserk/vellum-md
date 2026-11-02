import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVaultStore } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { AIService } from '../../services/ai.service';
import { flattenFiles } from '../../utils/files';

// Caracteres proibidos em nome de arquivo no Windows. Sem esta validacao,
// "Cap 2: Metodologia" fazia o processo principal lancar e a rejeicao nao
// tratada deixava o modal aberto sem mensagem nenhuma.
const INVALID_NAME_RE = /[\\/:*?"<>|]/;

export function NewNoteModal() {
  // useShallow: o modal fica sempre montado no App — não deve re-renderizar a cada tecla
  const { vaultPath, files, tagIndex, setFiles, setActiveFile, newNoteModalOpen, setNewNoteModalOpen } = useVaultStore(
    useShallow(s => ({
      vaultPath: s.vaultPath, files: s.files, tagIndex: s.tagIndex,
      setFiles: s.setFiles, setActiveFile: s.setActiveFile,
      newNoteModalOpen: s.newNoteModalOpen, setNewNoteModalOpen: s.setNewNoteModalOpen,
    }))
  );
  const apiKey = useSettingsStore(s => s.apiKey);

  const [noteName, setNoteName] = useState('Nova Nota');
  const [aiPrompt, setAiPrompt] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  // Guard de geracao: se o usuario fechar o modal durante a geracao por IA,
  // o `await` continuava e a nota era criada e aberta por cima da que ele
  // estava editando. Qualquer abertura/fechamento invalida a criacao em voo.
  const createGenRef = useRef(0);

  const allFiles = useMemo(() => flattenFiles(files), [files]);
  const allTags = useMemo(() => Array.from(new Set([...tagIndex.values()].flat())).sort(), [tagIndex]);
  const aiAvailable = !!apiKey;

  useEffect(() => {
    createGenRef.current++;
    if (newNoteModalOpen) {
      setNoteName('Nova Nota');
      setAiPrompt('');
      setError('');
      setGenerating(false);
      setTimeout(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
      }, 50);
    }
  }, [newNoteModalOpen]);

  if (!newNoteModalOpen) return null;

  const toFileName = (name: string) =>
    name.trim().endsWith('.md') ? name.trim() : `${name.trim()}.md`;

  // .normalize('NFC'): "Metodologia" digitado com acento composto (NFD) nao
  // batia com o nome vindo do disco (NFC) e a duplicata passava.
  const isDuplicate = (name: string) => {
    const fileName = toFileName(name).normalize('NFC').toLowerCase();
    return allFiles.some(f => f.name.normalize('NFC').toLowerCase() === fileName);
  };

  // Fechar o modal e proibido enquanto a IA gera (o overlay nao tinha guarda,
  // so os botoes tinham `disabled`)
  const handleClose = () => {
    if (generating) return;
    setNewNoteModalOpen(false);
  };

  const handleNameChange = (val: string) => {
    setNoteName(val);
    if (error && val.trim()) setError('');
  };

  const buildDefaultFrontmatter = (name: string) => {
    const now = new Date().toISOString();
    return `---\ntitle: "${name.trim()}"\ncreated: ${now}\nmodified: ${now}\ntags: []\naliases: []\n---\n\n`;
  };

  const generateFrontmatter = async (name: string, prompt: string): Promise<string> => {
    const now = new Date().toISOString();
    const tagsContext = allTags.length > 0
      ? `Tags já existentes no vault: ${allTags.join(', ')}. Reutilize as relevantes e crie novas livremente.`
      : 'Ainda não há tags no vault. Crie tags apropriadas livremente.';

    const raw = await AIService.chat([
      {
        role: 'system',
        content: `Você gera frontmatter YAML para notas markdown. Retorne SOMENTE o bloco YAML delimitado por ---, sem texto extra, sem blocos de código.
${tagsContext}
Formato obrigatório:
---
title: "Título gerado"
created: ${now}
modified: ${now}
tags: [tag1, tag2]
aliases: []
---`,
      },
      {
        role: 'user',
        content: `Nome do arquivo: ${name.trim()}\nDescrição da nota: ${prompt.trim()}`,
      },
    ]);

    // Extract the YAML block (handles both with and without leading/trailing text)
    const match = raw.match(/---\n([\s\S]*?)\n---/);
    if (!match) throw new Error('A IA não retornou um frontmatter válido.');
    return `---\n${match[1]}\n---\n\n`;
  };

  const handleCreate = async (useAI: boolean) => {
    if (!vaultPath) return;
    const name = noteName.trim();
    if (!name) { setError('O nome da nota não pode estar vazio.'); return; }
    const illegal = name.match(INVALID_NAME_RE);
    if (illegal) {
      setError(`O nome não pode conter \\ / : * ? " < > |  (encontrado: "${illegal[0]}").`);
      return;
    }
    if (isDuplicate(name)) { setError(`Já existe uma nota chamada "${toFileName(name)}".`); return; }

    const filePath = `${vaultPath}/${toFileName(name)}`;
    const generation = ++createGenRef.current;
    let content: string;

    if (useAI && aiPrompt.trim()) {
      setGenerating(true);
      try {
        content = await generateFrontmatter(name, aiPrompt);
      } catch (e: any) {
        setError(`Erro ao gerar com IA: ${e.message}`);
        setGenerating(false);
        return;
      }
      setGenerating(false);
    } else {
      content = buildDefaultFrontmatter(name);
    }

    // O usuário desistiu enquanto a IA gerava — não cria nem abre nada
    if (generation !== createGenRef.current) return;

    try {
      // fs.createFile tem a guarda `if (fs.existsSync) return false` no
      // processo principal — é a única proteção real contra sobrescrever uma
      // nota existente. isDuplicate() compara contra a árvore em memória,
      // que fica até 1,5 s desatualizada (debounce do watcher).
      // Uma única escrita atômica: createFile só grava se o arquivo ainda não
      // existir, e agora recebe o conteúdo real — sem a janela em que a nota
      // existia vazia, com frontmatter errado.
      const created = await window.electron.fs.createFile(filePath, content);
      if (!created) {
        setError(`Já existe uma nota chamada "${toFileName(name)}".`);
        return;
      }
    } catch (e: any) {
      setError(`Não foi possível criar a nota: ${e?.message ?? e}`);
      return;
    }

    const updatedFiles = await window.electron.fs.readDir(vaultPath);
    setFiles(updatedFiles);
    setActiveFile(filePath, content);
    setNewNoteModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
    if (e.key === 'Enter' && !e.shiftKey && e.target === nameRef.current) {
      e.preventDefault();
      handleCreate(false);
    }
  };

  return (
    <div className="command-palette-overlay" onClick={handleClose}>
      <div
        className="settings-modal"
        style={{ width: '480px', padding: '24px' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h3 style={{ marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>Nova Nota</h3>

        {/* Note name */}
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Nome da nota
        </label>
        <input
          ref={nameRef}
          type="text"
          value={noteName}
          onChange={e => handleNameChange(e.target.value)}
          className="search-input"
          style={{ width: '100%', marginBottom: '16px' }}
          placeholder="Nome da nota..."
        />

        {/* AI prompt */}
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Descreva o conteúdo para preencher o cabeçalho com IA{' '}
          <span style={{ opacity: 0.55 }}>(opcional)</span>
        </label>
        <textarea
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          placeholder={
            aiAvailable
              ? 'Ex: nota sobre técnicas de sobrevivência na floresta, incluindo como fazer fogo e encontrar água...'
              : 'Configure uma chave de IA em Configurações para usar esta funcionalidade.'
          }
          disabled={!aiAvailable}
          style={{
            width: '100%',
            minHeight: '80px',
            resize: 'vertical',
            padding: '8px 10px',
            background: 'var(--editor-bg)',
            color: aiAvailable ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            marginBottom: '8px',
            boxSizing: 'border-box',
            opacity: aiAvailable ? 1 : 0.6,
          }}
        />

        {/* Existing tags hint */}
        {allTags.length > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Tags existentes:{' '}
            <span style={{ color: 'var(--accent)' }}>{allTags.slice(0, 12).join(', ')}{allTags.length > 12 ? '…' : ''}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            fontSize: '12px',
            color: '#e06c75',
            background: 'rgba(224,108,117,0.1)',
            border: '1px solid rgba(224,108,117,0.3)',
            borderRadius: '6px',
            padding: '8px 10px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={handleClose}
            style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
            disabled={generating}
          >
            Cancelar
          </button>
          <button
            onClick={() => handleCreate(false)}
            style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
            disabled={generating}
          >
            Criar
          </button>
          <button
            onClick={() => handleCreate(true)}
            disabled={!aiAvailable || !aiPrompt.trim() || generating}
            title={!aiAvailable ? 'Configure uma chave de IA em Configurações' : ''}
            style={{ opacity: (!aiAvailable || !aiPrompt.trim()) ? 0.5 : 1 }}
          >
            {generating ? 'Gerando…' : '✦ Criar com IA'}
          </button>
        </div>
      </div>
    </div>
  );
}
