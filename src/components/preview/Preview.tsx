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

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

// Mermaid rendering component
function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
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

export function Preview() {
  const { activeContent, theme } = useVaultStore();

  const renderedContent = useMemo(() => {
    try {
      const processor = unified()
        .use(remarkParse)
        .use(remarkFrontmatter, ['yaml', 'toml'])
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkBreaks)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeKatex)
        .use(rehypeHighlight, { ignoreMissing: true })
        .use(rehypeReact, {
          ...{ Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs },
          components: {
            pre: CustomPre,
            img: CustomImg,
          },
        } as any);

      return processor.processSync(activeContent).result;
    } catch (e) {
      console.error(e);
      return <div>Error rendering preview</div>;
    }
  }, [activeContent, theme]);

  return (
    <div className="markdown-preview">
      {renderedContent}
    </div>
  );
}
