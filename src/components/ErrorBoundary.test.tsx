// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Verifica a rede de proteção contra a "tela branca".
//
// Antes do ErrorBoundary, uma exceção durante a renderização derrubava a árvore
// inteira do React e a janela ficava em branco, sem pista e sem caminho de
// volta a não ser fechar o aplicativo — foi o que acontecia ao abrir nota com
// diagrama antes da correção das decorações do CodeMirror.
//
// Estes testes substituem o "forçar um erro de propósito" que estava no
// cronograma de revisão: provocam a exceção de verdade e conferem o que o
// usuário vê no lugar da tela branca.

function Explode({ mensagem }: { mensagem: string }): JSX.Element {
  throw new Error(mensagem);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renderiza os filhos normalmente quando não há erro', () => {
    render(
      <ErrorBoundary>
        <p>conteúdo normal</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('conteúdo normal')).toBeDefined();
  });

  it('mostra a tela de recuperação quando um filho lança', () => {
    // O React escreve o erro no console ao acionar o boundary; silencia para
    // não poluir a saída dos testes.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Explode mensagem="falha proposital" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeDefined();
    expect(screen.getByText('Recarregar o aplicativo')).toBeDefined();
  });

  it('deixa claro que as notas em disco não foram afetadas', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Explode mensagem="falha proposital" />
      </ErrorBoundary>
    );

    // A garantia mais importante para quem está escrevendo o TCC
    expect(screen.getByText(/notas não foram afetadas/i)).toBeDefined();
  });

  it('expõe a mensagem do erro para diagnóstico', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Explode mensagem="RangeError: decoracao invalida" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/RangeError: decoracao invalida/)).toBeDefined();
  });

  it('registra o erro no console para aparecer no log do Electron', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Explode mensagem="falha proposital" />
      </ErrorBoundary>
    );

    const registrou = spy.mock.calls.some(args =>
      args.some(a => typeof a === 'string' && a.includes('[ErrorBoundary]'))
    );
    expect(registrou).toBe(true);
  });
});
