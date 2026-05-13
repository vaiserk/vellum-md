import React from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';
import { File, Folder } from 'lucide-react';

export function FileTree() {
  const { files, activeFile, setActiveFile, setActiveContent } = useVaultStore();

  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, file: FileNode } | null>(null);

  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'file') {
      const isImage = file.name.match(/\.(png|jpe?g|gif|svg|webp)$/i);
      if (isImage) {
        const safePath = encodeURI(`file:///${file.path.replace(/\\/g, '/')}`);
        setActiveFile(file.path, `![${file.name}](${safePath})`);
      } else {
        const content = await window.electron.fs.readFile(file.path);
        setActiveFile(file.path, content);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleRename = async () => {
    if (!contextMenu) return;
    const { file } = contextMenu;
    const oldName = file.name;
    const baseOldName = oldName.replace('.md', '');
    
    // Close context menu first so prompt can open
    setContextMenu(null);
    
    const newName = await useVaultStore.getState().openPrompt('Renomear para:', oldName);
    
    if (newName && newName !== oldName) {
      const dir = file.path.substring(0, file.path.lastIndexOf('\\') !== -1 ? file.path.lastIndexOf('\\') : file.path.lastIndexOf('/'));
      const separator = file.path.includes('\\') ? '\\' : '/';
      const newPath = dir + separator + (newName.endsWith('.md') || file.type === 'folder' ? newName : `${newName}.md`);
      
      const success = await window.electron.fs.renameFile(file.path, newPath);
      
      if (success) {
        const baseNewName = newName.replace('.md', '');
        const { vaultPath, setFiles, files } = useVaultStore.getState();
        
        if (vaultPath) {
          // Get the new file structure FIRST
          const updatedFiles = await window.electron.fs.readDir(vaultPath);

          // Update links in all files
          const updateLinksInFolder = async (nodes: FileNode[]) => {
            for (const node of nodes) {
              if (node.type === 'file') {
                const content = await window.electron.fs.readFile(node.path);
                const updatedContent = content.split(`[[${baseOldName}]]`).join(`[[${baseNewName}]]`);
                if (content !== updatedContent) {
                  await window.electron.fs.writeFile(node.path, updatedContent);
                }
              } else if (node.children) {
                await updateLinksInFolder(node.children);
              }
            }
          };
          await updateLinksInFolder(updatedFiles);

          setFiles(updatedFiles);
          if (activeFile === file.path) {
            setActiveFile(newPath, useVaultStore.getState().activeContent);
          }
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    const { file } = contextMenu;
    
    // Close context menu first so confirm modal can open properly
    setContextMenu(null);
    
    const confirm = await useVaultStore.getState().openConfirm(`Tem certeza que deseja excluir '${file.name}'?`);
    
    if (confirm) {
      await window.electron.fs.deleteFile(file.path);
      const { vaultPath, setFiles } = useVaultStore.getState();
      if (vaultPath) {
        const updatedFiles = await window.electron.fs.readDir(vaultPath);
        setFiles(updatedFiles);
        if (activeFile === file.path) {
          setActiveFile(null, '');
        }
      }
    }
  };

  // Close context menu on click outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const renderTree = (nodes: FileNode[]) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div 
          className={`file-item ${activeFile === node.path ? 'active' : ''}`}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          style={{ paddingLeft: node.type === 'file' ? '1rem' : '0' }}
        >
          {node.type === 'folder' ? <Folder size={16} /> : <File size={16} />}
          <span>{node.name}</span>
        </div>
        {node.children && (
          <div style={{ marginLeft: '1rem' }}>
            {renderTree(node.children)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="file-tree" style={{ position: 'relative' }}>
      {renderTree(files)}
      
      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ 
            position: 'fixed', 
            top: contextMenu.y, 
            left: contextMenu.x,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '4px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '120px'
          }}
        >
          <div 
            className="context-menu-item" 
            onClick={handleRename}
            style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' }}
          >
            ✏️ Renomear
          </div>
          <div 
            className="context-menu-item" 
            onClick={handleDelete}
            style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#ff4d4f', borderRadius: '4px' }}
          >
            🗑️ Excluir
          </div>
        </div>
      )}
    </div>
  );
}
