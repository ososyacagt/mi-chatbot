/* UX/UI: ConfirmModal con backdrop-blur, animación scale+fade, íconos SVG y focus trap */
"use client";

import { useEffect, useRef } from "react";

const TYPE_CONFIG = {
  danger: {
    icon: (
      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
    iconBg: "bg-red-100 dark:bg-red-950/60",
    confirmClass: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500",
  },
  warning: {
    icon: (
      <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    confirmClass: "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400",
  },
  info: {
    icon: (
      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
    iconBg: "bg-blue-100 dark:bg-blue-950/60",
    confirmClass: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500",
  },
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  type = "danger",
}) {
  const confirmRef = useRef(null);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.danger;

  // Foco automático al confirmar y escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => confirmRef.current?.focus(), 50);
    const handleKeyDown = (e) => { if (e.key === "Escape") onCancel?.(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => { clearTimeout(timeout); document.removeEventListener("keydown", handleKeyDown); };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop con blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Card con animación scale+fade */}
      <div className="
        relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl
        p-6 max-w-md w-full mx-4
        border border-zinc-200/80 dark:border-zinc-700/60
        animate-[modal-in_200ms_ease-out_forwards]
      ">
        <style>{`
          @keyframes modal-in {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="flex items-start gap-4 mb-5">
          {/* Ícono semántico */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-modal-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              border border-zinc-300 dark:border-zinc-700
              text-zinc-700 dark:text-zinc-300
              hover:bg-zinc-50 dark:hover:bg-zinc-800
              focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none
            "
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium text-white
              focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none
              ${config.confirmClass}
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
