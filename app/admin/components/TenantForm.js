"use client";

import { useState } from "react";

export default function TenantForm({ tenant, onSave, onCancel, loading }) {
  const isEditing = !!tenant;

  const [form, setForm] = useState(
    tenant || {
      client_id: "",
      nombre: "",
      systemPrompt: "",
      welcomeMessage: "",
      colorPrimary: "#2563eb",
    }
  );

  const [error, setError] = useState(null);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.client_id.trim()) {
      setError("client_id es requerido");
      return;
    }

    if (!form.nombre.trim()) {
      setError("nombre es requerido");
      return;
    }

    if (!form.systemPrompt.trim()) {
      setError("systemPrompt es requerido");
      return;
    }

    if (!form.welcomeMessage.trim()) {
      setError("welcomeMessage es requerido");
      return;
    }

    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 space-y-4"
    >
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
        {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
      </h2>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Client ID
        </label>
        <input
          type="text"
          value={form.client_id}
          onChange={(e) => handleChange("client_id", e.target.value)}
          disabled={isEditing}
          placeholder="ej: restaurante"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {isEditing && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            No se puede cambiar al editar
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Nombre
        </label>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          placeholder="ej: Mi Restaurante"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          System Prompt
        </label>
        <textarea
          value={form.systemPrompt}
          onChange={(e) => handleChange("systemPrompt", e.target.value)}
          placeholder="Instrucciones para Claude..."
          rows="6"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Welcome Message
        </label>
        <input
          type="text"
          value={form.welcomeMessage}
          onChange={(e) => handleChange("welcomeMessage", e.target.value)}
          placeholder="Mensaje de bienvenida..."
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Color Primario
          </label>
          <input
            type="color"
            value={form.colorPrimary}
            onChange={(e) => handleChange("colorPrimary", e.target.value)}
            className="h-10 border border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer"
          />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Preview
          </div>
          <div
            className="h-10 rounded-lg border-2 border-zinc-300 dark:border-zinc-700"
            style={{ backgroundColor: form.colorPrimary }}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 disabled:opacity-50 text-zinc-900 dark:text-white px-4 py-2 rounded-lg font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
