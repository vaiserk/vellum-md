import React, { useEffect, useRef, useState } from 'react';
import { useVaultStore } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { AIService } from '../../services/ai.service';

function flattenFiles(nodes: any[]): any[] {
  const result: any[] = [];
  for (const node of nodes) {
    if (node.type === 'file') result.push(node);
    if (node.children) result.push(...flattenFiles(node.children));
  }
  return result;
}

export function NewNoteModal() {
  const { vaultPath, files, tagIndex, setFiles, setActiveFile, newNoteModalOpen, setNewNoteModalOpen } = useVaultStore();
  const { apiKey } = useSettingsStore();

  const [noteName, setNoteName] = useState('Nova Nota');
  const [aiPrompt, setAiPrompt] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const allFiles = flattenFiles(files);
  const allTags = Array.from(new Set([...tagIndex.values()].flat())).sort();
  const aiAvailable = !!apiKey;

  useEffect(() => {
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

  const isDuplicate = (name: string) => {
    const fileName = toFileName(name);
    return allFiles.some(f => f.name.toLowerCase() === fileName.toLowerCase());
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
    if (isDuplicate(name)) { setError(`Já existe uma nota chamada "${toFileName(name)}".`); return; }

    const filePath = `${vaultPath}/${toFileName(name)}`;
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

    await window.electron.fs.writeFile(filePath, content);
    const updatedFiles = await window.electron.fs.readDir(vaultPath);
    setFiles(updatedFiles);
    setActiveFile(filePath, content);
    setNewNoteModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setNewNoteModalOpen(false); }
    if (e.key === 'Enter' && !e.shiftKey && e.target === nameRef.current) {
      e.preventDefault();
      handleCreate(false);
    }
  };

  return (
    <div className="command-palette-overlay" onClick={() => setNewNoteModalOpen(false)}>
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
            onClick={() => setNewNoteModalOpen(false)}
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
