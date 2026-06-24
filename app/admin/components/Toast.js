/* UX/UI: Toast rediseñado con barra de progreso, íconos SVG, tipo warning y animación de salida */
"use client";

import { useEffect, useState } from "react";

const ICONS = {
  success: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

const TYPE_STYLES = {
  success: "bg-emerald-600 text-white",
  error:   "bg-red-600 text-white",
  info:    "bg-blue-600 text-white",
  warning: "bg-amber-500 text-white",
};

const PROGRESS_STYLES = {
  success: "bg-emerald-400/50",
  error:   "bg-red-400/50",
  info:    "bg-blue-400/50",
  warning: "bg-amber-300/50",
};

export default function Toast({ message, type = "success", onClose, duration = 3500 }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!message) return;

    // Animación de entrada
    const enterTimer = setTimeout(() => setVisible(true), 10);

    // Animación de salida antes del cierre
    const leaveTimer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => {
        onClose?.();
        setLeaving(false);
        setVisible(false);
      }, 300);
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(leaveTimer);
    };
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed bottom-5 right-5 z-[60] max-w-sm w-auto min-w-[260px]
        rounded-xl shadow-xl overflow-hidden
        flex items-start gap-3 px-4 py-3
        ${TYPE_STYLES[type] || TYPE_STYLES.info}
        transform transition-all duration-300 ease-out
        ${visible && !leaving ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
      `}
    >
      {/* Ícono */}
      <span className="mt-0.5 opacity-90">{ICONS[type] || ICONS.info}</span>

      {/* Mensaje */}
      <span className="text-sm font-medium leading-snug flex-1">{message}</span>

      {/* Botón cerrar */}
      <button
        onClick={() => {
          setLeaving(true);
          setTimeout(() => { onClose?.(); setLeaving(false); setVisible(false); }, 300);
        }}
        className="opacity-70 hover:opacity-100 ml-1 mt-0.5 rounded"
        aria-label="Cerrar"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Barra de progreso */}
      <div className={`absolute bottom-0 left-0 h-0.5 ${PROGRESS_STYLES[type] || PROGRESS_STYLES.info} animate-[shrink_3.5s_linear_forwards]`}
        style={{ animationDuration: `${duration}ms`, width: "100%" }}
      />

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
