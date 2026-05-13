import React, { useState, useEffect, useRef } from 'react';
import { useVaultStore } from '../../store/vault.store';

export function PromptModal() {
  const { promptModal } = useVaultStore();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (promptModal?.isOpen) {
      setValue(promptModal.defaultValue || '');
      // Focus after render
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [promptModal?.isOpen, promptModal?.defaultValue]);

  if (!promptModal?.isOpen) return null;

  const handleConfirm = () => {
    promptModal.onConfirm(value);
  };

  const handleCancel = () => {
    promptModal.onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="command-palette-overlay" onClick={handleCancel}>
      <div className="settings-modal" style={{ width: '400px', padding: '20px' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: '16px', fontSize: '15px' }}>{promptModal.title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="search-input"
          style={{ width: '100%', marginBottom: '20px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button 
            onClick={handleCancel} 
            style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
          >
            Cancelar
          </button>
          <button onClick={handleConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
