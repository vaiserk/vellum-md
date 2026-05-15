import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Loader, Plus } from 'lucide-react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import 'katex/dist/katex.min.css';

// ─── Callouts plugin (GitHub-style > [!NOTE]) ─────────────────────────────────
function remarkCallouts() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any) => {
      if (!node.children?.length) return;
      const firstP = node.children[0];
      if (firstP.type !== 'paragraph' || !firstP.children?.length) return;
      const firstText = firstP.children[0];
      if (firstText.type !== 'text') return;
      const match = firstText.value.match(/^\[!(NOTE|TIP|WARNING|CAUTION|DANGER|IMPORTANT)\]/i);
      if (!match) return;
      const type = match[1].toLowerCase();
      firstText.value = firstText.value.substring(match[0].length).trimStart();
      node.data = node.data || {};
      node.data.hName = 'div';
      node.data.hProperties = { className: `callout callout-${type}` };
      const icons: any = { note: 'ℹ️', tip: '💡', warning: '⚠️', caution: '🛑', danger: '🛑', important: '⭐' };
      const titleText = type.charAt(0).toUpperCase() + type.slice(1);
      node.children.unshift({
        type: 'element',
        data: { hName: 'div', hProperties: { className: 'callout-title' } },
        children: [{ type: 'text', value: `${icons[type] || 'ℹ️'} ${titleText}` }]
      });
    });
  };
}

// ─── Wikilinks plugin [[Note]] ────────────────────────────────────────────────
function remarkWikilinks() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: any, parent: any) => {
      if (!parent || !node.value) return;
      const regex = /\[\[([^\]]+)\]\]/g;
      const matches = [...node.value.matchAll(regex)];
      if (!matches.length) return;
      const children: any[] = [];
      let lastIndex = 0;
      for (const match of matches) {
        if (match.index > lastIndex) children.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        children.push({
          type: 'element',
          data: { hName: 'span', hProperties: { className: 'slide-wikilink' } },
          children: [{ type: 'text', value: match[1] }]
        });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < node.value.length) children.push({ type: 'text', value: node.value.slice(lastIndex) });
      parent.children.splice(index, 1, ...children);
    });
  };
}

// ─── Strip YAML/TOML frontmatter from the beginning of a string ───────────────
function stripFrontmatter(source: string): string {
  // Frontmatter: starts with ---, ends with --- on its own line
  const fm = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
  return source.replace(fm, '').trimStart();
}

// ─── Markdown → HTML (full pipeline) ─────────────────────────────────────────
async function mdToHtml(markdown: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkBreaks)
    .use(remarkCallouts)
    .use(remarkWikilinks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeHighlight, { ignoreMissing: true })
    .use(rehypeStringify);
  return String(await processor.process(markdown));
}

// ─── Split content into slides ────────────────────────────────────────────────
function splitSlides(source: string): string[] {
  // 1. Strip frontmatter so it never becomes a slide
  const stripped = stripFrontmatter(source);

  // 2. Split on `---` that appears alone on a line (with optional surrounding blank lines)
  const parts = stripped.split(/\n\s*---\s*\n/);

  // 3. Filter empty blocks
  return parts.map(s => s.trim()).filter(Boolean);
}

// ─── Slide Preview Component ──────────────────────────────────────────────────
function SlidePreview({ markdown }: { markdown: string }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    mdToHtml(markdown)
      .then(setHtml)
      .catch(() => setHtml('<p style="color:red">Erro ao renderizar</p>'));
  }, [markdown]);

  return (
    <div
      className="slide-preview-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SlideEditorModalProps {
  initialContent: string;
  title: string;
  onClose: () => void;
  onExport: (htmlSlides: string[], theme: string, transition: string) => Promise<void>;
  exporting: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SlideEditorModal({
  initialContent,
  title,
  onClose,
  onExport,
  exporting,
}: SlideEditorModalProps) {
  // Strip frontmatter from the working copy immediately — user sees clean content
  const [workingSource, setWorkingSource] = useState(() => stripFrontmatter(initialContent));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [theme, setTheme] = useState('black');
  const [transition, setTransition] = useState('slide');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const slides = splitSlides(workingSource);
  const totalSlides = slides.length;

  // Keep currentSlide in bounds when slides change
  useEffect(() => {
    if (currentSlide >= totalSlides && totalSlides > 0) {
      setCurrentSlide(totalSlides - 1);
    }
  }, [totalSlides]);

  // Escape key closes this modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true); // capture phase — runs before App's listener
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose]);

  // Insert --- at cursor position in the textarea
  const insertSeparator = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = workingSource.slice(0, start);
    const after = workingSource.slice(el.selectionEnd);
    const sep = '\n\n---\n\n';
    const newSource = before + sep + after;
    setWorkingSource(newSource);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sep.length, start + sep.length);
    });
  }, [workingSource]);

  const handleExport = async () => {
    const htmlSlides: string[] = [];
    for (const slide of slides) {
      htmlSlides.push(await mdToHtml(slide));
    }
    await onExport(htmlSlides, theme, transition);
  };

  const prev = () => setCurrentSlide(i => Math.max(0, i - 1));
  const next = () => setCurrentSlide(i => Math.min(totalSlides - 1, i + 1));

  return (
    <div className="slide-editor-overlay" onClick={onClose}>
      <div className="slide-editor-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="slide-editor-header">
          <div className="slide-editor-title">
            <span>🎞️ Editor de Slides</span>
            <span className="slide-editor-subtitle">{title}</span>
          </div>
          <div className="slide-editor-header-actions">
            <div className="slide-editor-options">
              <label>Tema</label>
              <select value={theme} onChange={e => setTheme(e.target.value)}>
                <option value="black">Black</option>
                <option value="white">White</option>
                <option value="league">League</option>
                <option value="moon">Moon</option>
                <option value="solarized">Solarized</option>
                <option value="dracula">Dracula</option>
                <option value="sky">Sky</option>
              </select>
              <label>Transição</label>
              <select value={transition} onChange={e => setTransition(e.target.value)}>
                <option value="slide">Slide</option>
                <option value="fade">Fade</option>
                <option value="convex">Convex</option>
                <option value="zoom">Zoom</option>
                <option value="none">Nenhuma</option>
              </select>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || totalSlides === 0}
              className="slide-export-btn"
            >
              {exporting
                ? <><Loader size={14} className="spin" /> Exportando...</>
                : <><Download size={14} /> Exportar ({totalSlides} slides)</>
              }
            </button>
            <button className="slide-editor-close" onClick={onClose} title="Fechar (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="slide-editor-body">

          {/* Left — Editor */}
          <div className="slide-editor-left">
            <div className="slide-editor-pane-header">
              <span>✏️ Fonte (frontmatter removido)</span>
              <button
                className="slide-insert-sep-btn"
                onClick={insertSeparator}
                title="Inserir separador de slide na posição do cursor"
              >
                <Plus size={12} /> Inserir separador
              </button>
            </div>
            <div className="slide-editor-hint">
              Use <code>---</code> em uma linha separada para dividir slides.
              O frontmatter YAML é removido automaticamente.
              A nota original não é alterada.
            </div>
            <textarea
              ref={textareaRef}
              className="slide-editor-textarea"
              value={workingSource}
              onChange={e => setWorkingSource(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Right — Preview */}
          <div className="slide-editor-right">
            <div className="slide-editor-pane-header">
              <span>👁️ Preview do Slide</span>
              <span className="slide-counter">
                {totalSlides > 0 ? `${currentSlide + 1} / ${totalSlides}` : '0 slides'}
              </span>
            </div>

            {/* Slide viewport */}
            <div className="slide-viewport">
              {totalSlides > 0 ? (
                <SlidePreview markdown={slides[currentSlide]} />
              ) : (
                <div className="slide-empty">
                  Nenhum conteúdo para exibir.<br />
                  <small>Adicione texto ou use <code>---</code> para criar slides.</small>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="slide-nav">
              <button className="slide-nav-btn" onClick={prev} disabled={currentSlide === 0}>
                <ChevronLeft size={18} />
              </button>

              <div className="slide-dots">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    className={`slide-dot ${i === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(i)}
                    title={`Slide ${i + 1}`}
                  />
                ))}
              </div>

              <button className="slide-nav-btn" onClick={next} disabled={currentSlide === totalSlides - 1}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
