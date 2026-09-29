import React from 'react';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-backdrop" role="dialog" aria-modal="true">
      <div className="confirm-modal-card">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="confirm-modal-close"
          aria-label="Cerrar modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`confirm-modal-icon ${danger ? 'confirm-modal-icon--danger' : 'confirm-modal-icon--info'}`}>
            {danger ? (
              <Trash2 className="w-5 h-5 text-rose-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="confirm-modal-title">{title}</h3>
            <p className="confirm-modal-message">{message}</p>
          </div>
        </div>

        <div className="confirm-modal-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="confirm-modal-btn confirm-modal-btn--cancel"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`confirm-modal-btn ${danger ? 'confirm-modal-btn--danger' : 'confirm-modal-btn--primary'}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5 inline" />
                <span>Procesando...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
