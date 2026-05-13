import React from 'react';
import { useVaultStore, FileNode } from '../../store/vault.store';
import { File, Folder } from 'lucide-react';

export function FileTree() {
  const { files, activeFile, setActiveFile, setActiveContent } = useVaultStore();

  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'file') {
      const content = await window.electron.fs.readFile(file.path);
      setActiveFile(file.path, content);
    }
  };

  const renderTree = (nodes: FileNode[]) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div 
          className={`file-item ${activeFile === node.path ? 'active' : ''}`}
          onClick={() => handleFileClick(node)}
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

  return <div className="file-tree">{renderTree(files)}</div>;
}
