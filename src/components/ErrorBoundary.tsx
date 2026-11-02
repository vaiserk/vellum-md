import { Component, type ErrorInfo, type ReactNode } from 'react';

// Rede de proteção contra a "tela branca".
//
// Sem isto, qualquer exceção lançada durante a renderização derruba a árvore
// inteira do React e o usuário fica olhando uma janela em branco, sem nenhuma
// pista e sem caminho de volta a não ser fechar o aplicativo. Foi exatamente o
// que acontecia ao abrir uma nota com diagrama antes da correção das
// decorações do CodeMirror.
//
// Aqui o erro vira uma tela legível, com o detalhe técnico disponível e um
// botão para recarregar — o estado em disco (as notas) nunca é afetado.

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  stack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Mantém o rastro no console para diagnóstico (visível com --enable-logging)
    console.error('[ErrorBoundary] erro nao tratado na interface:', error, info);
    this.setState({ stack: info.componentStack ?? null });
  }

  private recarregar = () => {
    window.location.reload();
  };

  private copiarDetalhes = () => {
    const { error, stack } = this.state;
    const texto = [
      `Erro: ${error?.message ?? 'desconhecido'}`,
      '',
      error?.stack ?? '',
      '',
      'Componentes:',
      stack ?? '(indisponivel)',
    ].join('\n');
    navigator.clipboard?.writeText(texto).catch(() => {
      /* área de transferência indisponível — o texto segue visível na tela */
    });
  };

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="errb-overlay">
        <div className="errb-card">
          <div className="errb-icon">⚠️</div>
          <h1>Algo deu errado</h1>
          <p className="errb-desc">
            O VellumMD encontrou um erro inesperado na interface.{' '}
            <strong>Suas notas não foram afetadas</strong> — elas continuam salvas em
            disco, em formato Markdown.
          </p>

          <div className="errb-actions">
            <button className="errb-btn-primary" onClick={this.recarregar}>
              Recarregar o aplicativo
            </button>
            <button className="errb-btn" onClick={this.copiarDetalhes}>
              Copiar detalhes do erro
            </button>
          </div>

          <details className="errb-details">
            <summary>Detalhes técnicos</summary>
            <pre>
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
              {stack ? `\n\nComponentes:${stack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
