import React, { useEffect, useRef } from 'react';
import { useVaultStore } from '../../store/vault.store';

export function ConfirmModal() {
  const { confirmModal } = useVaultStore();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmModal?.isOpen) {
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
    }
  }, [confirmModal?.isOpen]);

  if (!confirmModal?.isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      confirmModal.onCancel();
    }
  };

  return (
    <div className="command-palette-overlay" onClick={confirmModal.onCancel}>
      <div className="settings-modal" style={{ width: '400px', padding: '24px' }} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h3 style={{ marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>Confirmação</h3>
        <p style={{ marginBottom: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {confirmModal.message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button 
            onClick={confirmModal.onCancel} 
            style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
          >
            Cancelar
          </button>
          <button ref={confirmBtnRef} onClick={confirmModal.onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
