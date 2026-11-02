import { useVaultStore } from '../store/vault.store';

const IMAGE_RE = /\.(png|jpe?g|gif|svg|webp)$/i;

/** `fs:readDir` inclui imagens na árvore — elas NÃO podem ser lidas como texto. */
export function isImageFile(name: string): boolean {
  return IMAGE_RE.test(name);
}

/**
 * Fonte única para "abrir um arquivo do vault no editor".
 *
 * Antes havia quatro cópias desta lógica (FileTree, Sidebar.handleFileClick,
 * Sidebar.handleResultClick, BacklinksPane) e só a do FileTree tratava imagem
 * e nenhuma tratava erro:
 *
 * - Imagem: ler os bytes como UTF-8 enchia o editor de binário e o auto-save
 *   sobrescrevia o PNG com texto corrompido (perda de dados). Aqui a imagem
 *   vira um embed markdown, sem nunca passar pelo readFile.
 * - Arquivo inexistente: a árvore `files` fica até 1,5 s desatualizada
 *   (debounce do watcher) e persiste após exclusão/renomeação externa. O
 *   `readFile` rejeitava e o clique morria em silêncio. Aqui o erro é exibido
 *   e a árvore é recarregada.
 *
 * @returns `true` se o arquivo foi aberto; `false` se falhou.
 */
export async function openNote(path: string, name?: string): Promise<boolean> {
  const fileName = name ?? path.split(/[/\\]/).pop() ?? path;

  if (isImageFile(fileName)) {
    const safePath = encodeURI(`file:///${path.replace(/\\/g, '/')}`);
    useVaultStore.getState().setActiveFile(path, `![${fileName}](${safePath})`);
    return true;
  }

  try {
    const content = await window.electron.fs.readFile(path);
    useVaultStore.getState().setActiveFile(path, content);
    return true;
  } catch (e) {
    console.error('Erro ao abrir nota:', path, e);

    // Recarrega a árvore: o arquivo provavelmente já não existe mais no disco
    const { vaultPath, setFiles } = useVaultStore.getState();
    if (vaultPath) {
      try {
        setFiles(await window.electron.fs.readDir(vaultPath));
      } catch {
        /* vault inacessível — mantém a árvore atual */
      }
    }

    await useVaultStore.getState().openConfirm(
      `Não foi possível abrir "${fileName}" — o arquivo pode ter sido movido ou excluído.`
    );
    return false;
  }
}
