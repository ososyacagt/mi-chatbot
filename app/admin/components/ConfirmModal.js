"use client";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  type = "danger", // 'danger' | 'warning' | 'info'
}) {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      bg: "bg-red-100 dark:bg-red-950",
      emoji: "🗑️",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      bg: "bg-amber-100 dark:bg-amber-950",
      emoji: "⚠️",
      button: "bg-amber-500 hover:bg-amber-600",
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-950",
      emoji: "ℹ️",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const style = typeStyles[type] || typeStyles.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in scale-in duration-200">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${style.bg}`}>
            {style.emoji}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${style.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
