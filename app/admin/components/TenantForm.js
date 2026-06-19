"use client";

import { useState, useEffect } from "react";
import { AI_PROVIDERS } from "@/lib/ai-provider";
import { PLANS } from "@/lib/plans";
import { LANGUAGES } from "@/lib/languages";

function getEnvVarName(provider) {
  const map = {
    claude: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    groq: "GROQ_API_KEY",
    gemini: "GEMINI_API_KEY",
    mistral: "MISTRAL_API_KEY",
  };
  return map[provider] || "API_KEY";
}

export default function TenantForm({ tenant, onSave, onCancel, loading }) {
  const isEditing = !!tenant;

  const [form, setForm] = useState({
    client_id: tenant?.client_id || "",
    nombre: tenant?.nombre || "",
    systemPrompt: tenant?.systemPrompt || "",
    welcomeMessage: tenant?.welcomeMessage || "",
    colorPrimary: tenant?.colorPrimary || "#2563eb",
    theme: tenant?.theme || "auto",
    aiProvider: tenant?.aiProvider || "claude",
    aiModel: tenant?.aiModel || "claude-sonnet-4-6",
    plan: tenant?.plan || "basic",
    mensajeLimite: tenant?.mensajeLimite || 100,
    escalationEnabled: tenant?.escalationEnabled !== false,
    adminEmail: tenant?.adminEmail || "",
    escalationMessage:
      tenant?.escalationMessage ||
      "¡Entendido! He notificado a un agente humano para que te atienda. Por favor espera, alguien se pondrá en contacto contigo pronto. ¿Hay algo más en lo que pueda ayudarte mientras esperas?",
    defaultLanguage: tenant?.defaultLanguage || "es",
    autoDetectLanguage: tenant?.autoDetectLanguage !== false,
  });

  const [error, setError] = useState(null);

  // Actualizar formulario cuando tenant cambia (al editar diferente cliente)
  useEffect(() => {
    if (tenant) {
      console.log("[TenantForm] Tenant recibido:", tenant);
      console.log("[TenantForm] Theme del tenant:", tenant.theme);

      setForm({
        client_id: tenant.client_id || "",
        nombre: tenant.nombre || "",
        systemPrompt: tenant.systemPrompt || "",
        welcomeMessage: tenant.welcomeMessage || "",
        colorPrimary: tenant.colorPrimary || "#2563eb",
        theme: tenant.theme || "auto",
        aiProvider: tenant.aiProvider || "claude",
        aiModel: tenant.aiModel || "claude-sonnet-4-6",
        plan: tenant.plan || "basic",
        mensajeLimite: tenant.mensajeLimite || 100,
        escalationEnabled: tenant.escalationEnabled !== false,
        adminEmail: tenant.adminEmail || "",
        escalationMessage:
          tenant.escalationMessage ||
          "¡Entendido! He notificado a un agente humano para que te atienda. Por favor espera, alguien se pondrá en contacto contigo pronto. ¿Hay algo más en lo que pueda ayudarte mientras esperas?",
        defaultLanguage: tenant.defaultLanguage || "es",
        autoDetectLanguage: tenant.autoDetectLanguage !== false,
      });
    }
  }, [tenant?.client_id]);

  const currentProvider = AI_PROVIDERS.find((p) => p.id === form.aiProvider);
  const availableModels = currentProvider?.modelos || [];

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

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          🎨 Tema del chat
        </label>
        <div className="flex gap-2">
          {[
            { value: "light", icon: "☀️", label: "Claro" },
            { value: "dark", icon: "🌙", label: "Oscuro" },
            { value: "auto", icon: "🖥️", label: "Automático" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange("theme", option.value)}
              className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium text-sm transition-all ${
                form.theme === option.value
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Proveedor de IA 🤖
        </label>
        <select
          value={form.aiProvider}
          onChange={(e) => {
            const provider = AI_PROVIDERS.find((p) => p.id === e.target.value);
            handleChange("aiProvider", e.target.value);
            handleChange("aiModel", provider?.defaultModel || "");
          }}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
        >
          {AI_PROVIDERS.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.nombre}
              {provider.requiresKey ? " (requiere API key)" : " (local)"}
            </option>
          ))}
        </select>
        {currentProvider?.requiresKey && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            ⚠️ Este proveedor requiere la variable de entorno:
            <code className="ml-1 font-mono">{getEnvVarName(form.aiProvider)}</code>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Modelo de IA
        </label>
        <select
          value={form.aiModel}
          onChange={(e) => handleChange("aiModel", e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
        >
          {(() => {
            const modelSet = new Set(availableModels);
            const modelsToShow = [...modelSet];
            if (!modelSet.has(form.aiModel) && form.aiModel) {
              modelsToShow.unshift(form.aiModel);
            }
            return modelsToShow.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ));
          })()}
        </select>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
          🌐 Idioma
        </h3>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Idioma por defecto
          </label>
          <select
            value={form.defaultLanguage}
            onChange={(e) => handleChange("defaultLanguage", e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.nombre}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            El bot responderá en este idioma por defecto
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="autoDetectLanguage"
            checked={form.autoDetectLanguage}
            onChange={(e) => handleChange("autoDetectLanguage", e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
          />
          <label htmlFor="autoDetectLanguage" className="text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer flex-1">
            Detectar idioma del usuario automáticamente
          </label>
        </div>

        {form.autoDetectLanguage && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              ℹ️ El bot se adaptará al idioma de cada usuario. Si no puede detectarlo, usará el idioma por defecto.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
          💳 Plan de Mensajes
        </h3>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Plan
          </label>
          <select
            value={form.plan}
            onChange={(e) => {
              const plan = e.target.value;
              handleChange("plan", plan);
              // Auto-actualizar límite según el plan seleccionado
              const planInfo = PLANS[plan];
              if (planInfo) {
                handleChange("mensajeLimite", planInfo.mensajesLimite);
              }
            }}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
          >
            {Object.entries(PLANS).map(([key, plan]) => (
              <option key={key} value={key}>
                {plan.nombre} - {plan.mensajesLimite === -1 ? "∞ Ilimitado" : `${plan.mensajesLimite} mensajes`}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Plan actual: <span className="font-semibold" style={{ color: PLANS[form.plan]?.color }}>
              {PLANS[form.plan]?.nombre}
            </span> · {PLANS[form.plan]?.precio}
          </p>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Límite de Mensajes (Editable)
          </label>
          <input
            type="number"
            value={form.mensajeLimite}
            onChange={(e) => handleChange("mensajeLimite", parseInt(e.target.value) || 0)}
            min="-1"
            placeholder="0 = sin límite"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {form.mensajeLimite === -1 ? "∞ Ilimitado" : `${form.mensajeLimite} mensajes por mes`}
          </p>
        </div>

        {isEditing && (
          <>
            <div className="mt-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Mensajes Usados Este Mes
              </label>
              <input
                type="number"
                value={tenant?.mensajesUsados || 0}
                disabled
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Fecha de Reset
              </label>
              <input
                type="text"
                value={tenant?.planResetDate ? new Date(tenant.planResetDate).toLocaleDateString("es-ES") : "N/A"}
                disabled
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
          🆘 Escalación a Humano
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="escalationEnabled"
            checked={form.escalationEnabled}
            onChange={(e) => handleChange("escalationEnabled", e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
          />
          <label htmlFor="escalationEnabled" className="text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            Habilitar escalación a humano
          </label>
        </div>

        {form.escalationEnabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email del administrador para notificaciones
              </label>
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => handleChange("adminEmail", e.target.value)}
                placeholder="admin@ejemplo.com"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Este email recibirá notificaciones cuando un usuario solicite hablar con un humano
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Mensaje de respuesta al usuario
              </label>
              <textarea
                value={form.escalationMessage}
                onChange={(e) => handleChange("escalationMessage", e.target.value)}
                placeholder="¡Entendido! He notificado a un agente humano..."
                rows="4"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Este mensaje se mostrará al usuario cuando solicite hablar con un humano
              </p>
            </div>
          </div>
        )}
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
