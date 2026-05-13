import React, { useState } from 'react';
import { useVaultStore } from '../../store/vault.store';
import { useSettingsStore } from '../../store/settings.store';
import { X, FileText, Presentation, Globe } from 'lucide-react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

declare global {
  interface Window {
    electron: {
      fs: any;
      export: {
        pdf: (options: any) => Promise<{ success: boolean; path?: string; error?: string }>;
      };
    };
  }
}

type ExportTab = 'pdf' | 'slides' | 'site';

export function ExportModal({ onClose }: { onClose: () => void }) {
  const { activeContent, activeFile } = useVaultStore();
  const { pdfFormat, pdfOrientation, setPdfFormat, setPdfOrientation } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<ExportTab>('pdf');
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<string>('');

  const generateHtml = async (): Promise<string> => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ['yaml', 'toml'])
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeKatex)
      .use(rehypeHighlight, { ignoreMissing: true })
      .use(rehypeStringify);

    const file = await processor.process(activeContent);
    return String(file);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    setResult('');
    try {
      const htmlContent = await generateHtml();
      const response = await window.electron.export.pdf({
        htmlContent,
        format: pdfFormat,
        orientation: pdfOrientation,
      });
      if (response.success) {
        setResult(`✅ PDF salvo em: ${response.path}`);
      } else {
        setResult(`❌ Erro: ${response.error}`);
      }
    } catch (err: any) {
      setResult(`❌ Erro: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>📤 Exportar</h3>
          <button onClick={onClose} className="settings-close"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="export-tabs">
          <button
            className={`export-tab ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            <FileText size={14} /> PDF
          </button>
          <button
            className={`export-tab ${activeTab === 'slides' ? 'active' : ''}`}
            onClick={() => setActiveTab('slides')}
          >
            <Presentation size={14} /> Slides
          </button>
          <button
            className={`export-tab ${activeTab === 'site' ? 'active' : ''}`}
            onClick={() => setActiveTab('site')}
          >
            <Globe size={14} /> Site
          </button>
        </div>

        <div className="settings-body">
          {activeTab === 'pdf' && (
            <div className="settings-section">
              <h4>Exportar como PDF</h4>
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
                style={{ width: '100%', marginTop: '12px' }}
              >
                {exporting ? 'Exportando...' : 'Exportar PDF'}
              </button>
            </div>
          )}

          {activeTab === 'slides' && (
            <div className="settings-section">
              <h4>Exportar como Slides</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Utilize separadores <code>---</code> para delimitar slides.
                Esta funcionalidade será implementada com Reveal.js na próxima fase.
              </p>
            </div>
          )}

          {activeTab === 'site' && (
            <div className="settings-section">
              <h4>Exportar como Site Estático</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Exporta todo o vault como um site HTML navegável.
                Esta funcionalidade será implementada na próxima fase.
              </p>
            </div>
          )}

          {result && (
            <div style={{ padding: '8px 0', fontSize: '12px' }}>
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
