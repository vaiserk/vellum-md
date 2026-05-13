import React from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';
import { File, Folder } from 'lucide-react';

export function FileTree() {
  const { files, activeFile, setActiveFile, setActiveContent } = useVaultStore();

  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, file: FileNode } | null>(null);

  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'file') {
      const content = await window.electron.fs.readFile(file.path);
      setActiveFile(file.path, content);
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
    const newName = window.prompt('Renomear para:', oldName);
    setContextMenu(null);
    
    if (newName && newName !== oldName) {
      const dir = file.path.substring(0, file.path.lastIndexOf('\\') !== -1 ? file.path.lastIndexOf('\\') : file.path.lastIndexOf('/'));
      const separator = file.path.includes('\\') ? '\\' : '/';
      const newPath = dir + separator + (newName.endsWith('.md') || file.type === 'folder' ? newName : `${newName}.md`);
      
      await window.electron.fs.renameFile(file.path, newPath);
      // Refresh files
      const { vaultPath, setFiles } = useVaultStore.getState();
      if (vaultPath) {
        const updatedFiles = await window.electron.fs.readDir(vaultPath);
        setFiles(updatedFiles);
        if (activeFile === file.path) {
          setActiveFile(newPath, useVaultStore.getState().activeContent);
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    const { file } = contextMenu;
    const confirm = window.confirm(`Tem certeza que deseja excluir '${file.name}'?`);
    setContextMenu(null);
    
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
