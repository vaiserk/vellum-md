import React, { useState } from 'react';
import { useVaultStore } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { X, FileText, Presentation, Globe, Download, Loader } from 'lucide-react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { SlideEditorModal } from './SlideEditorModal';

type ExportTab = 'pdf' | 'slides' | 'site';

// ─── Markdown → HTML (unified pipeline) ─────────────────────────────────────
async function mdToHtml(markdown: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeStringify);
  const file = await processor.process(markdown);
  return String(file);
}

// ─── Collect all .md files recursively from the vault ────────────────────────
function collectMdFiles(nodes: any[]): Array<{ name: string; path: string }> {
  const results: Array<{ name: string; path: string }> = [];
  const walk = (items: any[]) => {
    for (const item of items) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        results.push({ name: item.name.replace(/\.md$/, ''), path: item.path });
      } else if (item.type === 'folder' && item.children && !item.name.startsWith('.')) {
        walk(item.children);
      }
    }
  };
  walk(nodes);
  return results;
}

// ─── Convert a file name to a URL slug ───────────────────────────────────────
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ExportModal({ onClose }: { onClose: () => void }) {
  const { activeContent, activeFile, files, vaultPath } = useVaultStore();
  const { pdfFormat, pdfOrientation, setPdfFormat, setPdfOrientation } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<ExportTab>('pdf');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ msg: string; ok: boolean } | null>(null);

  // Slide editor modal
  const [slideEditorOpen, setSlideEditorOpen] = useState(false);
  const [slidesExporting, setSlidesExporting] = useState(false);
  const [slidesResult, setSlidesResult] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── PDF ────────────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    setResult(null);
    try {
      const htmlContent = await mdToHtml(activeContent);
      const response = await window.electron.export.pdf({
        htmlContent,
        format: pdfFormat,
        orientation: pdfOrientation,
      });
      setResult(response.success
        ? { ok: true, msg: `✅ PDF salvo em: ${response.path}` }
        : { ok: false, msg: `❌ Erro: ${response.error}` });
    } catch (err: any) {
      setResult({ ok: false, msg: `❌ Erro: ${err.message}` });
    } finally {
      setExporting(false);
    }
  };

  // ── Slides ─────────────────────────────────────────────────────────────────
  const handleDoExportSlides = async (htmlSlides: string[], theme: string, transition: string) => {
    if (!activeFile) return;
    setSlidesExporting(true);
    setSlidesResult(null);
    try {
      const title = activeFile.split(/[\\/]/).pop()?.replace(/\.md$/, '') || 'slides';
      const response = await window.electron.export.slides({ htmlSlides, theme, transition, title });
      setSlidesResult(response.success
        ? { ok: true, msg: `✅ Slides salvos em: ${response.path}` }
        : { ok: false, msg: `❌ Erro: ${response.error}` });
      if (response.success) setSlideEditorOpen(false);
    } catch (err: any) {
      setSlidesResult({ ok: false, msg: `❌ Erro: ${err.message}` });
    } finally {
      setSlidesExporting(false);
    }
  };

  // ── Static Site ────────────────────────────────────────────────────────────
  const handleExportSite = async () => {
    if (!vaultPath || !files.length) {
      setResult({ ok: false, msg: '❌ Nenhum vault aberto.' });
      return;
    }
    setExporting(true);
    setResult(null);
    try {
      const mdFiles = collectMdFiles(files);
      if (mdFiles.length === 0) {
        setResult({ ok: false, msg: '❌ Nenhum arquivo .md encontrado no vault.' });
        setExporting(false);
        return;
      }

      const pages: Array<{ title: string; slug: string; html: string }> = [];
      for (const f of mdFiles) {
        const content = await window.electron.fs.readFile(f.path);
        const html = await mdToHtml(content);
        pages.push({
          title: f.name,
          slug: toSlug(f.name),
          html,
        });
      }

      const vaultName = vaultPath.split(/[\\/]/).pop() || 'vault';
      const response = await window.electron.export.site({ pages, vaultName });
      setResult(response.success
        ? { ok: true, msg: `✅ Site exportado para: ${response.path}` }
        : { ok: false, msg: `❌ Erro: ${response.error}` });
    } catch (err: any) {
      setResult({ ok: false, msg: `❌ Erro: ${err.message}` });
    } finally {
      setExporting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="settings-header">
          <h3>📤 Exportar</h3>
          <button onClick={onClose} className="settings-close"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="export-tabs">
          <button
            className={`export-tab ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => { setActiveTab('pdf'); setResult(null); }}
          >
            <FileText size={14} /> PDF
          </button>
          <button
            className={`export-tab ${activeTab === 'slides' ? 'active' : ''}`}
            onClick={() => { setActiveTab('slides'); setResult(null); }}
          >
            <Presentation size={14} /> Slides
          </button>
          <button
            className={`export-tab ${activeTab === 'site' ? 'active' : ''}`}
            onClick={() => { setActiveTab('site'); setResult(null); }}
          >
            <Globe size={14} /> Site
          </button>
        </div>

        <div className="settings-body">
          {/* ── PDF Tab ───────────────────────────────── */}
          {activeTab === 'pdf' && (
            <div className="settings-section">
              <h4>Exportar nota como PDF</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Diagramas Mermaid e fórmulas KaTeX são incluídos automaticamente.
              </p>
              <div className="settings-row">
                <label>Formato</label>
                <select value={pdfFormat} onChange={e => setPdfFormat(e.target.value as any)}>
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="A5">A5</option>
                </select>
              </div>
              <div className="settings-row">
                <label>Orientação</label>
                <select value={pdfOrientation} onChange={e => setPdfOrientation(e.target.value as any)}>
                  <option value="portrait">Retrato</option>
                  <option value="landscape">Paisagem</option>
                </select>
              </div>
              <button
                onClick={handleExportPDF}
                disabled={exporting || !activeFile}
                style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {exporting ? <><Loader size={14} className="spin" /> Gerando PDF...</> : <><Download size={14} /> Exportar PDF</>}
              </button>
            </div>
          )}

          {/* ── Slides Tab ────────────────────── */}
          {activeTab === 'slides' && (
            <div className="settings-section">
              <h4>Exportar como Slides (Reveal.js)</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
                Abre um <strong>editor de slides</strong> onde você pode dividir a nota
                em slides usando <code>---</code> como separador, com preview em tempo real.
                A <strong>nota original não será alterada</strong>.
              </p>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                📄 <strong>Nota:</strong> {activeFile ? activeFile.split(/[\\\/]/).pop() : '—'}
              </div>
              <button
                onClick={() => { setSlidesResult(null); setSlideEditorOpen(true); }}
                disabled={!activeFile || !activeContent}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Presentation size={14} /> Abrir Editor de Slides
              </button>
              {slidesResult && (
                <div style={{
                  padding: '10px 12px', fontSize: '12px', borderRadius: '6px', marginTop: '10px',
                  background: slidesResult.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                  color: slidesResult.ok ? '#3fb950' : '#f85149',
                  border: `1px solid ${slidesResult.ok ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
                  wordBreak: 'break-all',
                }}>
                  {slidesResult.msg}
                </div>
              )}
            </div>
          )}

          {/* ── Site Tab ──────────────────────────────── */}
          {activeTab === 'site' && (
            <div className="settings-section">
              <h4>Exportar Vault como Site Estático</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Converte <strong>todos os arquivos .md</strong> do vault em um site HTML navegável.
                O resultado é uma pasta com <code>index.html</code> e uma página por nota.
              </p>
              <div style={{
                background: 'rgba(108,99,255,0.08)',
                border: '1px solid rgba(108,99,255,0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                marginBottom: '12px',
              }}>
                <div><strong>Vault:</strong> {vaultPath ? vaultPath.split(/[\\/]/).pop() : '—'}</div>
                <div><strong>Notas encontradas:</strong> {collectMdFiles(files).length} arquivos</div>
              </div>
              <button
                onClick={handleExportSite}
                disabled={exporting || !vaultPath}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {exporting ? <><Loader size={14} className="spin" /> Gerando Site...</> : <><Globe size={14} /> Exportar Site Estático</>}
              </button>
            </div>
          )}

        {/* Result message (PDF / Site) */}
          {result && (
            <div style={{
              padding: '10px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              marginTop: '8px',
              background: result.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
              color: result.ok ? '#3fb950' : '#f85149',
              border: `1px solid ${result.ok ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
              wordBreak: 'break-all',
            }}>
              {result.msg}
            </div>
          )}
        </div>
      </div>

      {/* Slide Editor Modal — rendered on top, note is never modified */}
      {slideEditorOpen && activeFile && (
        <SlideEditorModal
          initialContent={activeContent}
          title={activeFile.split(/[\\/]/).pop()?.replace(/\.md$/, '') || 'slides'}
          onClose={() => setSlideEditorOpen(false)}
          onExport={handleDoExportSlides}
          exporting={slidesExporting}
        />
      )}
    </div>
  );
}
