import React from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';
import termsConfig from './TermsModal.json';
import './TermsModal.css';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onAccept,
  onClose,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="terms-backdrop" role="dialog" aria-modal="true">
      <div className="terms-dialog">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0052FF] border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">{termsConfig.title}</h3>
              <p className="text-xs text-[#64748B]">{termsConfig.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/50 max-h-60 overflow-y-auto space-y-3">
          {termsConfig.terms.map((term, index) => (
            <div key={index} className="flex items-start gap-2.5 text-xs text-[#475569] leading-relaxed">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0052FF] shrink-0 mt-1.5" />
              <span>{term}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#64748B] hover:bg-slate-100 transition-colors"
          >
            {termsConfig.cancelButton}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-[#0052FF] text-white text-xs font-semibold hover:bg-[#0038B6] shadow-sm shadow-blue-500/30 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Creando cuenta...' : termsConfig.acceptButton}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
