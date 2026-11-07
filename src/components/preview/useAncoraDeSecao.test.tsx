// @vitest-environment jsdom
import { useRef } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useAncoraDeSecao } from './useAncoraDeSecao';

/** Monta um preview de mentira: o HTML entra por `html`, como no componente. */
function Preview({ activeFile, html, aoSaltar }: {
  activeFile: string | null; html: string; aoSaltar?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useAncoraDeSecao(ref, activeFile, html, aoSaltar);
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

const WIKILINKS = '<h1 id="wikilinks">Wikilinks</h1>';
const SEGUNDO_CEREBRO =
  '<h1 id="segundo-cerebro">Segundo Cérebro</h1><h2 id="principios">Princípios</h2>';

function clicar(nota: string, ancora: string) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('vellum:open-note', { detail: { name: nota, anchor: ancora } }),
    );
  });
}

/** Avança os quadros de animação pendentes. */
function proximoQuadro() {
  act(() => { vi.advanceTimersByTime(20); });
}

let rolagens: HTMLElement[];

beforeEach(() => {
  vi.useFakeTimers();
  rolagens = [];
  // jsdom não implementa scrollIntoView.
  (window as any).HTMLElement.prototype.scrollIntoView = function () {
    rolagens.push(this);
  };
  // jsdom não implementa CSS.escape (o Chromium do Electron implementa).
  // Os slugs já saem de slugifyAnchor, que só produz [a-z0-9-].
  vi.stubGlobal('CSS', { escape: (s: string) => s });
  // rAF em cima dos timers falsos, para o teste controlar o quadro.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 16) as unknown as number);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  // Sem `globals: true` no Vitest o RTL não desmonta sozinho, e o componente
  // de um teste continuaria ouvindo `vellum:open-note` no teste seguinte.
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('âncora de seção', () => {
  it('rola até o título quando o conteúdo já está na tela', () => {
    render(<Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} />);
    clicar('Segundo Cerebro', 'Princípios');
    proximoQuadro();
    expect(rolagens.map(e => e.id)).toEqual(['principios']);
  });

  it('espera o conteúdo chegar — o defeito que abria a nota no topo', () => {
    // Reproduz a corrida real: o activeFile muda no clique, mas o HTML da nota
    // nova só chega depois (leitura assíncrona + debounce de 200 ms). A versão
    // anterior procurava uma vez, não achava, DESCARTAVA a âncora, e o salto
    // se perdia para sempre.
    const tela = render(<Preview activeFile="/v/Wikilinks.md" html={WIKILINKS} />);

    clicar('Segundo Cerebro', 'Princípios');

    // A nota passa a ser a ativa, mas o DOM ainda exibe a anterior.
    tela.rerender(<Preview activeFile="/v/Segundo Cerebro.md" html={WIKILINKS} />);
    proximoQuadro();
    expect(rolagens).toHaveLength(0);

    // O conteúdo chega.
    tela.rerender(<Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} />);
    proximoQuadro();
    expect(rolagens.map(e => e.id)).toEqual(['principios']);
  });

  it('rola uma vez só, não a cada letra digitada depois', () => {
    const tela = render(<Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} />);
    clicar('Segundo Cerebro', 'Princípios');
    proximoQuadro();

    tela.rerender(
      <Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO + '<p>a</p>'} />);
    proximoQuadro();

    expect(rolagens).toHaveLength(1);
  });

  it('não rola na nota errada', () => {
    const tela = render(<Preview activeFile="/v/Wikilinks.md" html={WIKILINKS} />);
    clicar('Segundo Cerebro', 'Princípios');
    // Outra nota qualquer, que por acaso tem um título de mesmo nome.
    tela.rerender(<Preview activeFile="/v/Outra.md" html={SEGUNDO_CEREBRO} />);
    proximoQuadro();
    expect(rolagens).toHaveLength(0);
  });

  it('desiste depois de 3s quando a nota nunca abre', () => {
    const tela = render(<Preview activeFile="/v/Wikilinks.md" html={WIKILINKS} />);
    clicar('Nota Futura', 'Seção');

    act(() => { vi.advanceTimersByTime(3100); });

    // A âncora foi descartada: abrir a nota depois não pode disparar o salto.
    tela.rerender(<Preview activeFile="/v/Nota Futura.md" html={SEGUNDO_CEREBRO} />);
    proximoQuadro();
    expect(rolagens).toHaveLength(0);
  });

  it('desiste quando o título procurado não existe na nota', () => {
    const tela = render(<Preview activeFile="/v/Wikilinks.md" html={WIKILINKS} />);
    clicar('Segundo Cerebro', 'Secao Que Nao Existe');
    tela.rerender(<Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} />);

    act(() => { vi.advanceTimersByTime(3100); });
    expect(rolagens).toHaveLength(0);

    // E não fica guardada para atrapalhar a próxima navegação.
    tela.rerender(<Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} />);
    proximoQuadro();
    expect(rolagens).toHaveLength(0);
  });

  it('avisa a sincronia ANTES de rolar, nunca depois', () => {
    // O defeito observado no app: a pré-visualização saltava e era devolvida ao
    // topo pela sincronia com o editor, parando em 0,8 px de 335. O aviso tem
    // de chegar antes do salto; avisar depois já seria tarde.
    const ordem: string[] = [];
    const aoSaltar = () => ordem.push('aviso');
    (window as any).HTMLElement.prototype.scrollIntoView = function () {
      ordem.push('rolagem');
      rolagens.push(this);
    };

    render(
      <Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} aoSaltar={aoSaltar} />);
    clicar('Segundo Cerebro', 'Princípios');
    proximoQuadro();

    expect(ordem).toEqual(['aviso', 'rolagem']);
  });

  it('não avisa a sincronia quando não há o que rolar', () => {
    // Avisar à toa silenciaria a sincronia normal entre os painéis sem motivo.
    const avisos: number[] = [];
    const tela = render(
      <Preview activeFile="/v/Wikilinks.md" html={WIKILINKS}
               aoSaltar={() => avisos.push(1)} />);
    clicar('Segundo Cerebro', 'Princípios');
    tela.rerender(
      <Preview activeFile="/v/Segundo Cerebro.md" html={WIKILINKS}
               aoSaltar={() => avisos.push(1)} />);
    proximoQuadro();
    expect(avisos).toHaveLength(0);
  });

  it('salta de uma vez, sem animação que possa ser interrompida', () => {
    const modos: (string | undefined)[] = [];
    (window as any).HTMLElement.prototype.scrollIntoView = function (o: any) {
      modos.push(o?.behavior);
      rolagens.push(this);
    };
    render(<Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} />);
    clicar('Segundo Cerebro', 'Princípios');
    proximoQuadro();
    expect(modos).toEqual(['auto']);
  });

  it('âncora sem nome de nota rola na própria nota', () => {
    render(<Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} />);
    clicar('', 'Princípios');
    proximoQuadro();
    expect(rolagens.map(e => e.id)).toEqual(['principios']);
  });

  it('acento e caixa não atrapalham: "Princípios" acha id="principios"', () => {
    render(<Preview activeFile="/v/Segundo Cerebro.md" html={SEGUNDO_CEREBRO} />);
    clicar('segundo cerebro', 'PRINCÍPIOS');
    proximoQuadro();
    expect(rolagens.map(e => e.id)).toEqual(['principios']);
  });
});
