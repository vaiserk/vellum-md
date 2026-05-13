import { 
  autocompletion,
  CompletionContext,
  CompletionResult
} from '@codemirror/autocomplete';

interface SlashCommand {
  label: string;
  detail: string;
  template: string;
}

const slashCommands: SlashCommand[] = [
  { label: '/latex', detail: 'Inserir bloco LaTeX', template: '$$\n\n$$' },
  { label: '/math', detail: 'Inserir bloco matemático', template: '$$\n\n$$' },
  { label: '/mermaid', detail: 'Inserir diagrama Mermaid', template: '```mermaid\ngraph TD\n  A --> B\n```' },
  { label: '/table', detail: 'Inserir tabela 3x3', template: '| Col 1 | Col 2 | Col 3 |\n|---|---|---|\n|  |  |  |\n|  |  |  |\n|  |  |  |' },
  { label: '/callout', detail: 'Inserir callout', template: '> [!NOTE]\n> Texto aqui' },
  { label: '/image', detail: 'Inserir imagem', template: '![alt](url)' },
  { label: '/link', detail: 'Inserir link', template: '[texto](url)' },
  { label: '/hr', detail: 'Inserir linha horizontal', template: '\n---\n' },
  { label: '/date', detail: 'Inserir data atual', template: '{{DATE}}' },
  { label: '/code', detail: 'Inserir bloco de código', template: '```\n\n```' },
];

function slashCommandCompletion(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);
  
  // Only trigger on "/" at the start of a line (possibly with whitespace)
  const match = textBefore.match(/^\s*(\/.*)$/);
  if (!match) return null;

  const from = line.from + (match.index || 0) + (textBefore.length - match[1].length);

  return {
    from,
    options: slashCommands.map(cmd => ({
      label: cmd.label,
      detail: cmd.detail,
      apply: (view: any, _completion: any, from: number, to: number) => {
        let template = cmd.template;
        if (template === '{{DATE}}') {
          template = new Date().toLocaleDateString('pt-BR', {
            year: 'numeric', month: 'long', day: 'numeric'
          });
        }
        view.dispatch({
          changes: { from, to, insert: template },
        });
      }
    })),
    filter: true,
  };
}

export const slashCommandsExtension = autocompletion({
  override: [slashCommandCompletion],
  activateOnTyping: true,
});
