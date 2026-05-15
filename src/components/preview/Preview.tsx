import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import * as prod from 'react/jsx-runtime';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
import './preview.css';
import { useVaultStore } from '../../store/vault.store';
import mermaid from 'mermaid';
import { visit } from 'unist-util-visit';

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    const theme = document.documentElement.getAttribute('data-theme');
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'loose' });
    mermaid.render(id, code).then(({ svg: s }) => { setSvg(s); setError(''); })
      .catch((err) => { setError('Erro no diagrama: ' + (err?.message || String(err))); setSvg(''); });
  }, [code]);

  if (error) return <div style={{ color: 'var(--error-color)', padding: '8px', fontSize: '12px' }}>{error}</div>;
  return <div className="mermaid-container" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function extractText(children: any): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (React.isValidElement(children) && (children as any).props?.children) return extractText((children as any).props.children);
  return '';
}

function CustomPre({ children, ...props }: any) {
  const [copied, setCopied] = useState(false);

  if (React.Children.count(children) === 1) {
    const child = React.Children.only(children);
    if (React.isValidElement(child) && (child as any).props?.className) {
      const cls = (child as any).props.className;
      if ((typeof cls === 'string' && cls.includes('language-mermaid')) ||
          (Array.isArray(cls) && cls.some((c: string) => c.includes('language-mermaid')))) {
        return <MermaidBlock code={extractText((child as any).props.children).trim()} />;
      }
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(extractText(children)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="code-block-wrapper">
      <pre {...props}>{children}</pre>
      <button className="copy-code-btn" onClick={handleCopy}>{copied ? '✓ Copiado' : 'Copiar'}</button>
    </div>
  );
}

function CustomImg(props: any) {
  return (
    <img {...props} style={{ maxWidth: '100%', borderRadius: '8px', margin: '1em 0', display: 'block' }}
      onError={(e: any) => { e.target.style.display = 'none'; }} />
  );
}

function remarkWikilinks() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index, parent) => {
      if (!parent || !node.value) return;
      const regex = /\[\[([^\]]+)\]\]/g;
      const matches = [...node.value.matchAll(regex)];
      if (matches.length === 0) return;
      const children = [];
      let lastIndex = 0;
      for (const match of matches) {
        if (match.index > lastIndex) children.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        children.push({
          type: 'element',
          data: { hName: 'span', hProperties: { className: 'wikilink', 'data-note': match[1] } },
          children: [{ type: 'text', value: match[1] }]
        });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < node.value.length) children.push({ type: 'text', value: node.value.slice(lastIndex) });
      parent.children.splice(index, 1, ...children);
    });
  };
}

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
      const icons: Record<string, string> = { note: 'ℹ️', tip: '💡', warning: '⚠️', caution: '🔶', danger: '🛑', important: '⭐' };
      node.children.unshift({
        type: 'element',
        data: { hName: 'div', hProperties: { className: 'callout-title' } },
        children: [{ type: 'text', value: `${icons[type] || 'ℹ️'} ${type.charAt(0).toUpperCase() + type.slice(1)}` }]
      });
    });
  };
}

function rehypeTaskCheckboxIndex() {
  return (tree: any) => {
    let idx = 0;
    visit(tree, 'element', (node: any) => {
      if (node.tagName === 'input' && node.properties?.type === 'checkbox') {
        node.properties['data-idx'] = String(idx++);
      }
    });
  };
}

export function Preview() {
  const { activeContent, theme, editorView, setActiveContent, activeFile } = useVaultStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const syncSourceRef = useRef<'editor' | 'preview' | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Scroll sync: editor.scrollDOM ↔ .preview-pane (parentElement of previewRef)
  useEffect(() => {
    if (!editorView) return;
    const sc = previewRef.current?.parentElement;
    if (!sc) return;

    const onEditorScroll = () => {
      if (syncSourceRef.current === 'preview') return;
      syncSourceRef.current = 'editor';
      clearTimeout(syncTimeoutRef.current);
      const { scrollTop, scrollHeight, clientHeight } = editorView.scrollDOM;
      const scrollable = scrollHeight - clientHeight;
      if (scrollable > 0) {
        const scScrollable = sc.scrollHeight - sc.clientHeight;
        sc.scrollTop = (scrollTop / scrollable) * scScrollable;
      }
      syncTimeoutRef.current = setTimeout(() => { syncSourceRef.current = null; }, 150);
    };

    const onPreviewScroll = () => {
      if (syncSourceRef.current === 'editor') return;
      syncSourceRef.current = 'preview';
      clearTimeout(syncTimeoutRef.current);
      const scScrollable = sc.scrollHeight - sc.clientHeight;
      if (scScrollable > 0) {
        const editorScrollable = editorView.scrollDOM.scrollHeight - editorView.scrollDOM.clientHeight;
        editorView.scrollDOM.scrollTop = (sc.scrollTop / scScrollable) * editorScrollable;
      }
      syncTimeoutRef.current = setTimeout(() => { syncSourceRef.current = null; }, 150);
    };

    editorView.scrollDOM.addEventListener('scroll', onEditorScroll);
    sc.addEventListener('scroll', onPreviewScroll);
    return () => {
      editorView.scrollDOM.removeEventListener('scroll', onEditorScroll);
      sc.removeEventListener('scroll', onPreviewScroll);
    };
  }, [editorView]);

  const toggleCheckbox = useCallback((idx: number, newChecked: boolean) => {
    let count = 0;
    const updated = activeContent.replace(/^([ \t]*[-*+] \[)([ x])(\] )/gm, (_match, pre, _state, post) => {
      const result = count === idx ? `${pre}${newChecked ? 'x' : ' '}${post}` : `${pre}${_state}${post}`;
      count++;
      return result;
    });
    setActiveContent(updated);
    if (activeFile) window.electron.fs.writeFile(activeFile, updated);
  }, [activeContent, activeFile, setActiveContent]);

  const renderedContent = useMemo(() => {
    try {
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
        .use(rehypeHighlight)
        .use(rehypeTaskCheckboxIndex)
        .use(rehypeReact, {
          ...{ Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs },
          components: {
            pre: CustomPre,
            img: CustomImg,
            a: (props: any) => {
              const href: string = props.href || '';
              if (href.startsWith('http://') || href.startsWith('https://')) {
                return <a {...props} onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if ((window as any).electron?.shell?.openExternal) {
                    (window as any).electron.shell.openExternal(href);
                  } else {
                    window.open(href, '_blank', 'noopener,noreferrer');
                  }
                }} />;
              }
              return <a {...props} />;
            },
            input: (props: any) => {
              if (props.type === 'checkbox') {
                const idx = parseInt(props['data-idx'] ?? '0', 10);
                return <input {...props} disabled={false} style={{ cursor: 'pointer' }}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleCheckbox(idx, e.target.checked)} />;
              }
              return <input {...props} />;
            },
            span: (props: any) => {
              if (props.className === 'wikilink') {
                const noteName: string = props['data-note'] || '';
                return <span {...props} onClick={() => {
                  if (noteName) window.dispatchEvent(new CustomEvent('vellum:open-note', { detail: { name: noteName } }));
                }}>{props.children}</span>;
              }
              return <span {...props} />;
            }
          },
        } as any);

      return processor.processSync(activeContent).result;
    } catch (e) {
      console.error(e);
      return <div>Error rendering preview</div>;
    }
  }, [activeContent, theme, toggleCheckbox]);

  return (
    <div ref={previewRef} className="markdown-preview">
      {renderedContent}
    </div>
  );
}
