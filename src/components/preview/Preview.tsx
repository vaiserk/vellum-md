import React, { useMemo, useEffect, useRef, useState } from 'react';
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

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

// Mermaid rendering component
function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
    const theme = document.documentElement.getAttribute('data-theme');
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    });

    mermaid.render(id, code).then(({ svg: renderedSvg }) => {
      setSvg(renderedSvg);
      setError('');
    }).catch((err) => {
      setError('Erro no diagrama: ' + (err?.message || String(err)));
      setSvg('');
    });
  }, [code]);

  if (error) {
    return <div style={{ color: 'var(--error-color)', padding: '8px', fontSize: '12px' }}>{error}</div>;
  }

  return (
    <div 
      className="mermaid-container" 
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}

// Custom <pre> component that intercepts mermaid code blocks
function CustomPre({ children, ...props }: any) {
  // Check if this pre contains a code element with language-mermaid
  if (React.Children.count(children) === 1) {
    const child = React.Children.only(children);
    if (React.isValidElement(child) && (child as any).props?.className) {
      const className = (child as any).props.className;
      if (
        (typeof className === 'string' && className.includes('language-mermaid')) ||
        (Array.isArray(className) && className.some((c: string) => c.includes('language-mermaid')))
      ) {
        // Extract the text content
        const codeContent = extractText((child as any).props.children);
        return <MermaidBlock code={codeContent.trim()} />;
      }
    }
  }
  return <pre {...props}>{children}</pre>;
}

// Helper to extract text from React children (may be nested)
function extractText(children: any): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (React.isValidElement(children) && (children as any).props?.children) {
    return extractText((children as any).props.children);
  }
  return '';
}

// Custom <img> to ensure images render properly
function CustomImg(props: any) {
  return (
    <img 
      {...props} 
      style={{ maxWidth: '100%', borderRadius: '8px', margin: '1em 0', display: 'block' }}
      onError={(e: any) => {
        e.target.style.display = 'none';
      }}
    />
  );
}

// Custom remark plugin for Wikilinks [[Nota]]
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
        if (match.index > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }
        children.push({
          type: 'element',
          data: {
            hName: 'span',
            hProperties: { 
              className: 'wikilink',
              onClick: `window.dispatchEvent(new CustomEvent('vellum:open-note', { detail: { name: '${match[1]}' } }))`
            }
          },
          children: [{ type: 'text', value: match[1] }]
        });
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
}

// Custom remark plugin for Callouts > [!NOTE]
function remarkCallouts() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any) => {
      if (!node.children || node.children.length === 0) return;
      
      const firstParagraph = node.children[0];
      if (firstParagraph.type !== 'paragraph' || !firstParagraph.children || firstParagraph.children.length === 0) return;
      
      const firstTextNode = firstParagraph.children[0];
      if (firstTextNode.type !== 'text') return;
      
      const match = firstTextNode.value.match(/^\[!(NOTE|TIP|WARNING|CAUTION|DANGER|IMPORTANT)\]/i);
      if (match) {
        const type = match[1].toLowerCase();
        firstTextNode.value = firstTextNode.value.substring(match[0].length).trimStart();
        
        node.data = node.data || {};
        node.data.hName = 'div';
        node.data.hProperties = { className: `callout callout-${type}` };
        
        // Add title
        const icons: any = {
          note: 'ℹ️', tip: '💡', warning: '⚠️', caution: '🛑', danger: '🛑', important: '⭐'
        };
        const titleText = type.charAt(0).toUpperCase() + type.slice(1);
        
        node.children.unshift({
          type: 'element',
          data: {
            hName: 'div',
            hProperties: { className: 'callout-title' }
          },
          children: [
            { type: 'text', value: `${icons[type] || 'ℹ️'} ${titleText}` }
          ]
        });
      }
    });
  };
}

export function Preview() {
  const { activeContent, theme, editorView } = useVaultStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const syncSourceRef = useRef<'editor' | 'preview' | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Attach scroll listener to editor's scrollDOM whenever editorView changes
  useEffect(() => {
    if (!editorView) return;
    const onEditorScroll = () => {
      if (syncSourceRef.current === 'preview') return;
      const preview = previewRef.current;
      if (!preview) return;
      syncSourceRef.current = 'editor';
      clearTimeout(syncTimeoutRef.current);
      const { scrollTop, scrollHeight, clientHeight } = editorView.scrollDOM;
      const scrollable = scrollHeight - clientHeight;
      if (scrollable > 0) {
        const ratio = scrollTop / scrollable;
        const previewScrollable = preview.scrollHeight - preview.clientHeight;
        preview.scrollTop = ratio * previewScrollable;
      }
      syncTimeoutRef.current = setTimeout(() => { syncSourceRef.current = null; }, 150);
    };
    editorView.scrollDOM.addEventListener('scroll', onEditorScroll);
    return () => editorView.scrollDOM.removeEventListener('scroll', onEditorScroll);
  }, [editorView]);

  const handlePreviewScroll = () => {
    if (syncSourceRef.current === 'editor') return;
    const preview = previewRef.current;
    if (!preview || !editorView) return;
    syncSourceRef.current = 'preview';
    clearTimeout(syncTimeoutRef.current);
    const scrollable = preview.scrollHeight - preview.clientHeight;
    if (scrollable > 0) {
      const ratio = preview.scrollTop / scrollable;
      const editorScrollable = editorView.scrollDOM.scrollHeight - editorView.scrollDOM.clientHeight;
      editorView.scrollDOM.scrollTop = ratio * editorScrollable;
    }
    syncTimeoutRef.current = setTimeout(() => { syncSourceRef.current = null; }, 150);
  };

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
        .use(rehypeHighlight, true)
        .use(rehypeReact, {
          ...{ Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs },
          components: {
            pre: CustomPre,
            img: CustomImg,
            span: (props: any) => {
              if (props.className === 'wikilink') {
                return <span {...props} onClick={() => {
                  if (props.onClick) {
                    // Extract the event dispatch string and execute it safely
                    const match = props.onClick.match(/name: '([^']+)'/);
                    if (match) {
                      window.dispatchEvent(new CustomEvent('vellum:open-note', { detail: { name: match[1] } }));
                    }
                  }
                }}>{props.children}</span>
              }
              return <span {...props} />
            }
          },
        } as any);

      return processor.processSync(activeContent).result;
    } catch (e) {
      console.error(e);
      return <div>Error rendering preview</div>;
    }
  }, [activeContent, theme]);

  return (
    <div ref={previewRef} className="markdown-preview" onScroll={handlePreviewScroll}>
      {renderedContent}
    </div>
  );
}
