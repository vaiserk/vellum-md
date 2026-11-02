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
import { sincronizarTemaDoCodigo } from '../../utils/hljs-theme';

// Tema do realce de codigo acompanha o tema do app (antes o escuro era
// aplicado sempre, deixando o codigo ilegivel no modo claro).
sincronizarTemaDoCodigo();
import './preview.css';
import { useShallow } from 'zustand/react/shallow';
import { useVaultStore } from '../../store/vault.store';
import { visit } from 'unist-util-visit';
import { buildKnownNotes } from '../../utils/files';
import { slugifyAnchor } from '../../utils/wikilink';
import { remarkWikilinks } from '../../utils/remark-wikilinks';
import { rehypeHeadingIds } from '../../utils/rehype-heading-ids';
import { resolveAssetUrl } from '../../utils/asset-url';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
// Loader lazy compartilhado com a extensão inline do editor — mesma instância
// e mesma fila de renderização (o Mermaid é singleton; ver utils/mermaid-loader.ts)
import { enqueueMermaidRender } from '../../utils/mermaid-loader';

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

    // Theme sync is handled by the module-level MutationObserver (syncMermaidTheme).
    // Never call mermaid.initialize() here — it resets singleton state mid-render
    // and breaks concurrent diagram renders with spurious "Syntax error" messages.

    enqueueMermaidRender(id, code)
      .then((s) => { if (!cancelledRef.current) { setSvg(s); setError(''); } })
      .catch((err) => { if (!cancelledRef.current) { setError('Erro no diagrama: ' + (err?.message || String(err))); setSvg(''); } });

    return () => {
      // Mark as cancelled so stale async results don't update unmounted component state
      cancelledRef.current = true;
    };
  }, [code]);

  if (error) return <div style={{ color: 'var(--error-color)', padding: '8px', fontSize: '12px' }}>{error}</div>;
  if (!svg) {
    // Skeleton enquanto o módulo mermaid carrega (lazy) e o diagrama renderiza
    return (
      <div className="mermaid-container" style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          Renderizando diagrama…
        </span>
      </div>
    );
  }
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

// O estado de falha guarda QUAL url falhou, e não um booleano.
// Antes era `useState(false)`: o closeBrackets fecha o parêntese assim que a
// pessoa digita `![](`, então o markdown já é uma imagem válida de src vazio e
// o onError marcava "quebrada" antes de a URL existir. Como o React reaproveita
// a mesma instância do componente quando só o src muda, esse `true` nunca mais
// voltava — a imagem externa só aparecia ao reabrir a nota (remontagem), que é
// exatamente o sintoma relatado. Comparando a url que falhou com a url atual, a
// imagem se recupera sozinha no instante em que o endereço fica completo.
function CustomImg({ src, alt, notePath, ...props }: any) {
  const [urlQueFalhou, setUrlQueFalhou] = React.useState<string | null>(null);
  // Caminho relativo (`assets/foto.png`) é resolvido contra a pasta da nota.
  // Sem isto ele era resolvido contra dist/, e nenhuma imagem local aparecia.
  const url = typeof src === 'string' ? resolveAssetUrl(src, notePath) : '';

  // src vazio (parêntese recém-fechado) ou esquema pela metade: a pessoa ainda
  // está digitando. Não renderiza <img> nenhum — evita um pedido de rede inútil
  // e evita o aviso de "não encontrada" piscando a cada tecla.
  if (!url || /^(h|ht|htt|http|https|https?:|https?:\/|https?:\/\/)$/i.test(url)) {
    return null;
  }

  if (urlQueFalhou === url) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 10px', borderRadius: '6px', fontSize: '12px',
        background: 'rgba(128,128,128,0.1)', border: '1px dashed var(--border-color)',
        color: 'var(--text-secondary)', margin: '1em 0',
      }}>
        <span aria-hidden>🖼️</span>
        <span>Imagem não encontrada: {alt || url}</span>
      </span>
    );
  }
  return (
    <img {...props} src={url} alt={alt}
      style={{ maxWidth: '100%', borderRadius: '8px', margin: '1em 0', display: 'block' }}
      onError={() => setUrlQueFalhou(url)} />
  );
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

// remark-frontmatter parses the YAML/TOML block but leaves the node in the tree.
// remarkRehype then serializes it as raw text visible in the preview.
// This plugin removes those nodes before the tree reaches remarkRehype.
function remarkStripFrontmatter() {
  return (tree: any) => {
    tree.children = tree.children.filter(
      (node: any) => node.type !== 'yaml' && node.type !== 'toml'
    );
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
  const { activeContent, theme, editorView, activeFile, files } = useVaultStore(
    useShallow(s => ({
      activeContent: s.activeContent, theme: s.theme, editorView: s.editorView,
      activeFile: s.activeFile, files: s.files,
    }))
  );

  // Debounce do conteúdo que alimenta o pipeline markdown→React: digitar não
  // re-parseia o documento a cada tecla (era a maior fonte de lag no modo split).
  // Trocar de nota (flushKey=activeFile) atualiza o preview imediatamente.
  const previewContent = useDebouncedValue(activeContent, 200, activeFile);

  const knownNotes = useMemo(() => buildKnownNotes(files), [files]);

  const previewRef = useRef<HTMLDivElement>(null);
  const syncSourceRef = useRef<'editor' | 'preview' | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Âncora de seção (`[[Nota#Seção]]`) ──────────────────────────────────────
  // O clique no wikilink só PEDE a abertura da nota; quem abre é o tratador do
  // evento, de forma assíncrona. Rolar na hora levaria à seção da nota ANTIGA,
  // que ainda está na tela. Por isso a âncora fica pendente, junto do nome da
  // nota esperada, e só é consumida quando essa nota é de fato a ativa.
  const [ancoraPendente, setAncoraPendente] = useState<{ nota: string; ancora: string } | null>(null);

  useEffect(() => {
    const aoAbrirNota = (e: any) => {
      const ancora = e.detail?.anchor;
      if (ancora) setAncoraPendente({ nota: (e.detail?.name || '').trim(), ancora });
    };
    window.addEventListener('vellum:open-note', aoAbrirNota);
    return () => window.removeEventListener('vellum:open-note', aoAbrirNota);
  }, []);

  useEffect(() => {
    if (!ancoraPendente) return;

    const notaAtual = (activeFile?.split(/[/\\]/).pop() ?? '').replace(/\.md$/i, '');
    // Sem nome => âncora da própria nota (`[[#Seção]]`), rola já.
    const chegou = !ancoraPendente.nota
      || notaAtual.toLowerCase() === ancoraPendente.nota.toLowerCase();

    if (!chegou) {
      // A nota pode nunca abrir (não existe, ou o usuário recusou criá-la).
      // Sem este descarte, a âncora ficaria guardada e dispararia numa
      // navegação futura, sem relação nenhuma com o clique.
      const desistir = setTimeout(() => setAncoraPendente(null), 3000);
      return () => clearTimeout(desistir);
    }

    const id = requestAnimationFrame(() => {
      const slug = slugifyAnchor(ancoraPendente.ancora);
      if (slug) {
        previewRef.current
          ?.querySelector(`#${CSS.escape(slug)}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setAncoraPendente(null);
    });
    return () => cancelAnimationFrame(id);
  }, [ancoraPendente, previewContent, activeFile]);

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

  // Identidade estável (deps []): lê o estado atual via getState() no clique.
  // Se dependesse de activeContent, mudaria a cada tecla e invalidaria o
  // useMemo do renderedContent — anulando o debounce do preview.
  const toggleCheckbox = useCallback((idx: number, newChecked: boolean) => {
    const { activeContent, activeFile, setActiveContent } = useVaultStore.getState();
    let count = 0;
    const updated = activeContent.replace(/^([ \t]*[-*+] \[)([ x])(\] )/gm, (_match, pre, _state, post) => {
      const result = count === idx ? `${pre}${newChecked ? 'x' : ' '}${post}` : `${pre}${_state}${post}`;
      count++;
      return result;
    });
    setActiveContent(updated);
    if (activeFile) window.electron.fs.writeFile(activeFile, updated);
  }, []);

  const renderedContent = useMemo(() => {
    try {
      const processor = unified()
        .use(remarkParse)
        .use(remarkFrontmatter, ['yaml', 'toml'])
        .use(remarkStripFrontmatter)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkBreaks)
        .use(remarkCallouts)
        .use(remarkWikilinks)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeKatex)
        .use(rehypeHighlight)
        .use(rehypeHeadingIds)
        .use(rehypeTaskCheckboxIndex)
        .use(rehypeReact, {
          ...{ Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs },
          components: {
            pre: CustomPre,
            img: (props: any) => <CustomImg {...props} notePath={activeFile} />,
            // TODO link: nenhum clique pode navegar a janela.
            // Antes, só http:// e https:// eram interceptados. Um link sem
            // protocolo — [google](www.google.com), que é o que a pessoa
            // escreve naturalmente — virava href relativo, o Electron navegava
            // para file:///.../www.google.com, a pagina falhava e o app virava
            // tela branca sem volta (o ErrorBoundary não pega: não é erro de
            // render do React, é a janela saindo do app).
            a: (props: any) => {
              const href: string = props.href || '';
              const abrirFora = (url: string) => {
                if ((window as any).electron?.shell?.openExternal) {
                  (window as any).electron.shell.openExternal(url);
                } else {
                  window.open(url, '_blank', 'noopener,noreferrer');
                }
              };
              return <a {...props} onClick={(e: React.MouseEvent) => {
                // Sempre impede a navegação padrão; decidimos o destino aqui.
                e.preventDefault();
                if (!href) return;
                if (/^https?:\/\//i.test(href)) { abrirFora(href); return; }
                if (/^mailto:|^tel:/i.test(href)) { abrirFora(href); return; }
                // Sem protocolo mas com cara de domínio (tem ponto e nada de
                // espaço): assume http e abre no navegador do sistema.
                if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(href)) {
                  abrirFora(`https://${href}`);
                  return;
                }
                // Âncora interna da própria nota
                if (href.startsWith('#')) {
                  document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                  return;
                }
                // Qualquer outra coisa (caminho relativo, protocolo estranho):
                // não navega. Melhor não fazer nada do que perder o app.
                console.warn('[preview] link ignorado (destino nao suportado):', href);
              }} />;
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
                const anchor: string | undefined = props['data-anchor'];
                // `[[#Seção]]` aponta para a própria nota: não há alvo a procurar
                const mesmaNota = !noteName;
                const exists = mesmaNota || knownNotes.has(noteName.toLowerCase());
                const destino = anchor ? `${noteName || 'esta nota'} › ${anchor}` : noteName;
                return (
                  <span
                    {...props}
                    className={exists ? 'wikilink' : 'wikilink-missing'}
                    title={exists ? `Abrir: ${destino}` : `Nota não encontrada: ${noteName}`}
                    onClick={() => {
                      // Mesmo inexistente o evento é disparado: quem trata
                      // oferece criar a nota, e esse caminho tem que continuar.
                      window.dispatchEvent(new CustomEvent('vellum:open-note', {
                        detail: { name: noteName, anchor: anchor ?? null },
                      }));
                    }}
                  >
                    {props.children}
                  </span>
                );
              }
              return <span {...props} />;
            }
          },
        } as any);

      return processor.processSync(previewContent).result;
    } catch (e) {
      console.error(e);
      return <div>Error rendering preview</div>;
    }
    // activeFile entra nas dependências porque é a base dos caminhos relativos
    // de imagem: duas notas com o mesmo conteúdo em pastas diferentes precisam
    // resolver a imagem para lugares diferentes.
  }, [previewContent, theme, toggleCheckbox, knownNotes, activeFile]);

  return (
    <div ref={previewRef} className="markdown-preview">
      {renderedContent}
    </div>
  );
}
