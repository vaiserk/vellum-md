import { useState, useEffect, useLayoutEffect, useRef, MouseEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVaultStore, FileNode } from '../../store/vault.store';
import { File, Folder, FolderOpen, ChevronRight, ChevronDown, FilePlus } from 'lucide-react';
import { openNote } from '../../utils/openNote';

/** Escapa um nome de nota para uso dentro de uma RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function FileTree() {
  // useShallow: não re-renderiza a árvore a cada tecla digitada no editor
  const { files, activeFile, setActiveFile, setNewNoteModalOpen } = useVaultStore(useShallow(s => ({
    files: s.files, activeFile: s.activeFile, setActiveFile: s.setActiveFile,
    setNewNoteModalOpen: s.setNewNoteModalOpen,
  })));

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: FileNode } | null>(null);
  // Pastas abertas (por path). Vazio = tudo colapsado.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number, left: number } | null>(null);

  const toggleFolder = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Abrir nota/imagem: toda a lógica (incluindo erro e imagem) vive em openNote
  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'folder') {
      toggleFolder(file.path);
      return;
    }
    await openNote(file.path, file.name);
  };

  const handleContextMenu = (e: MouseEvent, file: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos(null);
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  // Clamp de viewport: sem isso, o menu da última nota abria fora da tela.
  // Mesma lógica de clampToViewport em editor/extensions/ai-context-menu.ext.ts
  useLayoutEffect(() => {
    if (!contextMenu) {
      setMenuPos(null);
      return;
    }
    const el = menuRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - r.height - 8)),
    });
  }, [contextMenu]);

  const handleRename = async () => {
    if (!contextMenu) return;
    const { file } = contextMenu;
    const oldName = file.name;
    const baseOldName = oldName.replace(/\.md$/i, '');

    // Close context menu first so prompt can open
    setContextMenu(null);

    const { openPrompt, openConfirm } = useVaultStore.getState();
    const newName = await openPrompt('Renomear para:', oldName);

    if (!newName || newName === oldName) return;

    const dir = file.path.substring(0, file.path.lastIndexOf('\\') !== -1 ? file.path.lastIndexOf('\\') : file.path.lastIndexOf('/'));
    const separator = file.path.includes('\\') ? '\\' : '/';
    const newPath = dir + separator + (newName.endsWith('.md') || file.type === 'folder' ? newName : `${newName}.md`);

    const success = await window.electron.fs.renameFile(file.path, newPath);

    // Sem este feedback, nome inválido / colisão / arquivo bloqueado
    // simplesmente não faziam nada
    if (!success) {
      await openConfirm(
        `Não foi possível renomear "${oldName}" para "${newName}". ` +
        `Verifique se o nome é válido (sem \\ / : * ? " < > |), se já não existe outro item com esse nome ` +
        `e se o arquivo não está aberto em outro programa.`
      );
      return;
    }

    const baseNewName = newName.replace(/\.md$/i, '');
    const { vaultPath, setFiles } = useVaultStore.getState();
    if (!vaultPath) return;

    // Get the new file structure FIRST
    const updatedFiles = await window.electron.fs.readDir(vaultPath);

    // Atualiza os wikilinks apenas quando o renomeado é uma NOTA.
    // Renomear pasta não muda o alvo de nenhum [[link]].
    if (file.type === 'file' && /\.md$/i.test(oldName)) {
      // Preserva alias e âncora: [[Nota|texto]] e [[Nota#Seção]] antes eram
      // ignorados (casamento era exato) e passavam a apontar para nada.
      const linkRe = new RegExp(`\\[\\[${escapeRegExp(baseOldName)}((\\||#)[^\\]]*)?\\]\\]`, 'g');
      const replacement = `[[${baseNewName.replace(/\$/g, '$$$$')}$1]]`;

      const updateLinksInFolder = async (nodes: FileNode[]) => {
        for (const node of nodes) {
          if (node.type === 'file') {
            // Só notas: antes lia .png/.txt também, e um arquivo ilegível
            // abortava o loop no meio (metade dos links atualizados)
            if (!node.name.toLowerCase().endsWith('.md')) continue;
            try {
              const content = await window.electron.fs.readFile(node.path);
              const updatedContent = content.replace(linkRe, replacement);
              if (content !== updatedContent) {
                await window.electron.fs.writeFile(node.path, updatedContent);
              }
            } catch (e) {
              console.error('Falha ao atualizar links em', node.path, e);
            }
          } else if (node.children) {
            await updateLinksInFolder(node.children);
          }
        }
      };
      await updateLinksInFolder(updatedFiles);
    }

    setFiles(updatedFiles);

    // Corrige o activeFile. Para PASTAS, reescreve por prefixo: antes só o
    // caminho exato da pasta era tratado, então uma nota aberta DENTRO dela
    // ficava apontando para um caminho inexistente.
    const { activeFile: currentActive, activeContent } = useVaultStore.getState();
    if (currentActive === file.path) {
      setActiveFile(newPath, activeContent);
    } else if (file.type === 'folder' && currentActive) {
      const prefix = file.path + separator;
      if (currentActive.startsWith(prefix)) {
        setActiveFile(newPath + currentActive.slice(file.path.length), activeContent);
      }
    }
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    const { file } = contextMenu;

    // Close context menu first so confirm modal can open properly
    setContextMenu(null);

    const { openConfirm } = useVaultStore.getState();
    const confirm = await openConfirm(`Tem certeza que deseja excluir '${file.name}'?`);
    if (!confirm) return;

    const { vaultPath, setFiles, setLastDeleted } = useVaultStore.getState();
    // vaultPath garante que a lixeira fique na raiz do vault (restaurável),
    // mesmo para notas dentro de subpastas
    const ok = await window.electron.fs.deleteFile(file.path, vaultPath ?? undefined);

    // lastDeleted só depois de confirmar que a exclusão deu certo — antes o
    // banner "Desfazer" aparecia mesmo quando nada havia sido excluído
    if (!ok) {
      await openConfirm(
        `Não foi possível excluir '${file.name}'. O arquivo pode estar aberto em outro programa ou já ter sido removido.`
      );
      if (vaultPath) setFiles(await window.electron.fs.readDir(vaultPath));
      return;
    }

    setLastDeleted({ name: file.name, path: file.path });
    if (vaultPath) {
      const updatedFiles = await window.electron.fs.readDir(vaultPath);
      setFiles(updatedFiles);
      // Mesma correção por prefixo do rename: excluir uma PASTA também deixava
      // activeFile apontando para um caminho inexistente
      const separator = file.path.includes('\\') ? '\\' : '/';
      if (activeFile === file.path || (file.type === 'folder' && activeFile?.startsWith(file.path + separator))) {
        setActiveFile(null, '');
      }
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const renderTree = (nodes: FileNode[]) => {
    return nodes.map((node) => {
      const isFolder = node.type === 'folder';
      const isOpen = isFolder && expanded.has(node.path);
      return (
        <div key={node.path}>
          <div
            className={`file-item ${activeFile === node.path ? 'active' : ''}`}
            onClick={() => handleFileClick(node)}
            onContextMenu={(e) => handleContextMenu(e, node)}
            style={{ paddingLeft: isFolder ? '0' : '1rem' }}
          >
            {isFolder
              ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
              : null}
            {isFolder
              ? (isOpen ? <FolderOpen size={16} /> : <Folder size={16} />)
              : <File size={16} />}
            <span>{node.name}</span>
          </div>
          {isFolder && isOpen && node.children && (
            <div style={{ marginLeft: '1rem' }}>
              {renderTree(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="file-tree" style={{ position: 'relative' }}>
      {files.length === 0 ? (
        <div style={{ padding: '1rem', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          <div style={{ marginBottom: '10px' }}>Este vault está vazio.</div>
          <button
            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            onClick={() => setNewNoteModalOpen(true)}
          >
            <FilePlus size={12} /> Nova nota
          </button>
        </div>
      ) : (
        renderTree(files)
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            top: menuPos ? menuPos.top : contextMenu.y,
            left: menuPos ? menuPos.left : contextMenu.x,
            visibility: menuPos ? 'visible' : 'hidden',
          }}
        >
          <div className="context-menu-item" onClick={handleRename}>✏️ Renomear</div>
          <div className="context-menu-item context-menu-item--danger" onClick={handleDelete}>🗑️ Excluir</div>
        </div>
      )}
    </div>
  );
}
