import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const confirmBtnClass = {
    danger: 'bg-danger-600 hover:bg-danger-700',
    warning: 'bg-warning-500 hover:bg-warning-600',
    default: 'bg-primary-600 hover:bg-primary-700',
  }[variant];

  return (
    <div 
      className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-2xl shadow-float w-full max-w-sm p-4 sm:p-6 animate-scale-in">
        <h3 className="text-lg font-bold text-surface-800 mb-2">{title}</h3>
        <p className="text-surface-600 mb-6 text-sm sm:text-base">{message}</p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors font-medium text-surface-700"
          >
            {cancelLabel || t('app.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-white rounded-xl transition-colors font-medium ${confirmBtnClass}`}
          >
            {confirmLabel || t('app.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
