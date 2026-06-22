"use client";

import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeStyles = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
  };

  const icon = { success: "✓", error: "✕", info: "ℹ" };

  return (
    <div className={`fixed bottom-4 right-4 ${typeStyles[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 z-50`}>
      <span className="text-lg font-bold">{icon[type]}</span>
      <span className="font-medium">{message}</span>
    </div>
  );
}
