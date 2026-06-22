"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AI_PROVIDERS } from "@/lib/ai-provider";

const STEPS = 4;

function OnboardingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [invitationEmail, setInvitationEmail] = useState(null);

  // Formulario
  const [form, setForm] = useState({
    nombre: "",
    clientId: "",
    colorPrimary: "#2563eb",
    aiProvider: "claude",
    aiModel: "claude-sonnet-4-6",
    systemPrompt: "",
    welcomeMessage: "¡Hola! ¿En qué puedo ayudarte hoy?",
    adminEmail: "",
    createUser: true,
    adminPassword: "",
    confirmPassword: "",
    documents: [],
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [userExists, setUserExists] = useState(null);

  // Validar token al cargar
  useEffect(() => {
    validateToken();
  }, []);

  async function validateToken() {
    if (!token) {
      setError("Token no proporcionado en la URL");
      setValidating(false);
      return;
    }

    try {
      const res = await fetch(`/api/onboarding/validate?token=${token}`);
      const data = await res.json();

      if (!data.valid) {
        setError(data.reason || "Token inválido o expirado");
        setValidating(false);
        setLoading(false);
        return;
      }

      if (data.email) {
        setInvitationEmail(data.email);
        setForm((prev) => ({ ...prev, adminEmail: data.email }));
      }

      setValidating(false);
      setLoading(false);
    } catch (err) {
      console.error("Error validando token:", err);
      setError("Error al validar el token");
      setValidating(false);
      setLoading(false);
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Resetear userExists cuando cambia el email
    if (field === "adminEmail") {
      setUserExists(null);
    }
  }

  async function checkUserExists(email) {
    if (!email) return;

    try {
      setCheckingUser(true);
      const res = await fetch(`/api/onboarding/check-user?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setUserExists(data.exists);
    } catch (err) {
      console.error("Error verificando usuario:", err);
      setUserExists(null);
    } finally {
      setCheckingUser(false);
    }
  }

  async function handleSubmit() {
    try {
      setSubmitLoading(true);
      setError(null);

      // Validar campos requeridos del paso actual
      if (step === 0) {
        if (!form.nombre.trim()) {
          setError("Nombre del negocio es requerido");
          setSubmitLoading(false);
          return;
        }
        if (!form.clientId.trim()) {
          setError("ID del chat es requerido");
          setSubmitLoading(false);
          return;
        }
        if (!/^[a-z0-9-]+$/.test(form.clientId)) {
          setError("ID del chat solo puede contener letras minúsculas, números y guiones");
          setSubmitLoading(false);
          return;
        }
        if (!form.adminEmail.trim()) {
          setError("Email del administrador es requerido");
          setSubmitLoading(false);
          return;
        }

        // Validar usuario
        if (form.createUser) {
          if (!form.adminPassword || form.adminPassword.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            setSubmitLoading(false);
            return;
          }
          if (form.adminPassword !== form.confirmPassword) {
            setError("Las contraseñas no coinciden");
            setSubmitLoading(false);
            return;
          }
        } else {
          // Verificar que el usuario existe
          if (userExists === null) {
            setError("Verifica si el usuario existe primero");
            setSubmitLoading(false);
            return;
          }
          if (!userExists) {
            setError("El usuario no existe. Verifica el email o crea un usuario nuevo");
            setSubmitLoading(false);
            return;
          }
        }
      }

      if (step === 1) {
        if (!form.systemPrompt.trim()) {
          setError("Instrucciones del bot son requeridas");
          setSubmitLoading(false);
          return;
        }
        if (!form.welcomeMessage.trim()) {
          setError("Mensaje de bienvenida es requerido");
          setSubmitLoading(false);
          return;
        }
      }

      if (step < STEPS - 1) {
        setStep(step + 1);
      } else {
        // Paso final - enviar todo
        await completeOnboarding();
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function completeOnboarding() {
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nombre: form.nombre,
          clientId: form.clientId,
          colorPrimary: form.colorPrimary,
          systemPrompt: form.systemPrompt,
          welcomeMessage: form.welcomeMessage,
          aiProvider: form.aiProvider,
          aiModel: form.aiModel,
          adminEmail: form.adminEmail || null,
          adminPassword: form.createUser ? form.adminPassword : undefined,
          createUser: form.createUser,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al completar el onboarding");
        return;
      }

      setSuccess(true);
      setSuccessData({
        clientId: data.clientId,
        nombre: form.nombre,
        userCreated: data.userCreated,
        adminEmail: data.adminEmail,
        adminPassword: form.createUser ? form.adminPassword : null,
      });
    } catch (err) {
      console.error("Error completando onboarding:", err);
      setError("Error al completar el onboarding");
    } finally {
      setSubmitLoading(false);
    }
  }

  const currentProvider = AI_PROVIDERS.find((p) => p.id === form.aiProvider);
  const availableModels = currentProvider?.modelos || [];

  if (validating) {
    return (
      <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Validando tu invitación...</p>
        </div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Invitación inválida
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const chatUrl = `${appUrl}/chat/${successData.clientId}`;
    const widgetCode = `<script async src="${appUrl}/widget.js"></script>
<div id="chatbot-widget" data-client-id="${successData.clientId}"></div>`;

    return (
      <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-indigo-950 flex items-center justify-center p-4 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center">
          <div className="text-5xl sm:text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            ¡Bienvenido!
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mb-6">
            Tu chatbot "{successData.nombre}" está listo para usar
          </p>

          <div className="space-y-4 mb-6 text-left">
            {successData.userCreated && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3">
                  🔐 Tus credenciales de acceso:
                </h3>
                <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <div>
                    <label className="text-xs font-semibold block opacity-80">Email:</label>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 px-2 py-1 bg-white dark:bg-zinc-800 rounded border border-green-200 dark:border-green-800 font-mono text-xs">
                        {successData.adminEmail}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(successData.adminEmail)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block opacity-80">Contraseña:</label>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 px-2 py-1 bg-white dark:bg-zinc-800 rounded border border-green-200 dark:border-green-800 font-mono text-xs">
                        {successData.adminPassword}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(successData.adminPassword)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs opacity-75 mt-3 border-t border-green-200 dark:border-green-800 pt-2">
                  Guarda estas credenciales en un lugar seguro. Las usarás para acceder al panel de administración.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                URL de tu chat
              </label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={chatUrl}
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white overflow-x-auto"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(chatUrl)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                Código del widget
              </label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <textarea
                  readOnly
                  value={widgetCode}
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white font-mono"
                  rows="3"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(widgetCode)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap h-fit"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={`/chat/${successData.clientId}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors text-center"
            >
              Ver mi chat
            </a>
            <a
              href="/admin"
              className="flex-1 border-2 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors text-center"
            >
              Panel admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    );
  }

  const stepTitles = [
    "Datos del negocio",
    "Configura tu asistente",
    "Documentos (opcional)",
    "¡Listo!",
  ];

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-indigo-950 py-8 px-4">
      <div className="max-w-2xl mx-auto pb-12" key={token}>
        {/* Barra de progreso */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                  i <= step
                    ? "bg-blue-600"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
            Paso {step + 1} de {STEPS}
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 w-full">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">
            {stepTitles[step]}
          </h2>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* PASO 1 - Datos del negocio */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nombre del negocio
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                  placeholder="Mi Negocio"
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  ID del chat
                </label>
                <input
                  type="text"
                  value={form.clientId}
                  onChange={(e) => handleChange("clientId", e.target.value.toLowerCase())}
                  placeholder="mi-negocio"
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Letras minúsculas, números y guiones. Será parte de tu URL:
                  <br />
                  <code className="font-mono text-blue-600 dark:text-blue-400">
                    {(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/^https?:\/\//, "")}/chat/{form.clientId || "mi-negocio"}
                  </code>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Color principal
                  </label>
                  <input
                    type="color"
                    value={form.colorPrimary}
                    onChange={(e) => handleChange("colorPrimary", e.target.value)}
                    className="w-full h-10 border border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Preview
                  </label>
                  <div
                    className="h-10 rounded-lg border-2 border-zinc-300 dark:border-zinc-700"
                    style={{ backgroundColor: form.colorPrimary }}
                  />
                </div>
              </div>

              {/* Sección: Acceso al panel */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  🔐 Acceso al panel
                </h3>

                <div className="flex items-center gap-4 mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.createUser}
                      onChange={() => {
                        handleChange("createUser", true);
                        handleChange("adminPassword", "");
                        handleChange("confirmPassword", "");
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Crear nuevo usuario
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!form.createUser}
                      onChange={() => {
                        handleChange("createUser", false);
                        setUserExists(null);
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Ya tengo cuenta
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Email del administrador
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => handleChange("adminEmail", e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                    {!form.createUser && (
                      <button
                        onClick={() => checkUserExists(form.adminEmail)}
                        disabled={checkingUser || !form.adminEmail}
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {checkingUser ? "Verificando..." : "Verificar"}
                      </button>
                    )}
                  </div>
                  {userExists !== null && (
                    <p className={`text-xs font-medium ${
                      userExists
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {userExists ? "✓ Usuario encontrado" : "✗ Usuario no encontrado"}
                    </p>
                  )}
                  {!form.createUser && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      El nuevo cliente será asignado a tu cuenta
                    </p>
                  )}
                </div>

                {form.createUser && (
                  <>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        value={form.adminPassword}
                        onChange={(e) => handleChange("adminPassword", e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Confirmar contraseña
                      </label>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => handleChange("confirmPassword", e.target.value)}
                        placeholder="Repite tu contraseña"
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* PASO 2 - Configura tu asistente */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Proveedor de IA
                </label>
                <select
                  value={form.aiProvider}
                  onChange={(e) => {
                    const provider = AI_PROVIDERS.find((p) => p.id === e.target.value);
                    handleChange("aiProvider", e.target.value);
                    handleChange("aiModel", provider?.defaultModel || "");
                  }}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  {AI_PROVIDERS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Modelo de IA
                </label>
                <select
                  value={form.aiModel}
                  onChange={(e) => handleChange("aiModel", e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Instrucciones del bot
                </label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => handleChange("systemPrompt", e.target.value)}
                  placeholder={`Eres un asistente amigable de ${form.nombre || "un negocio"}. Ayudas a los clientes con sus preguntas...`}
                  rows="4"
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Mensaje de bienvenida
                </label>
                <input
                  type="text"
                  value={form.welcomeMessage}
                  onChange={(e) => handleChange("welcomeMessage", e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Email del administrador (para notificaciones)
                </label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => handleChange("adminEmail", e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
                {invitationEmail && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Invitación enviada a: {invitationEmail}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PASO 3 - Documentos */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Sube documentos que el bot usará como conocimiento base
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                  PDF, Word, Excel, HTML, imágenes - todo ayuda a entrenar mejor a tu bot
                </p>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Seleccionar archivos
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep(step + 1)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Omitir este paso
                </button>
              </div>
            </div>
          )}

          {/* PASO 4 - Resumen */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                  Resumen de tu configuración:
                </h3>
                <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <p>
                    <strong>Negocio:</strong> {form.nombre}
                  </p>
                  <p>
                    <strong>ID:</strong> <code className="font-mono">{form.clientId}</code>
                  </p>
                  <p>
                    <strong>Proveedor:</strong> {currentProvider?.nombre}
                  </p>
                  <p>
                    <strong>Modelo:</strong> {form.aiModel}
                  </p>
                </div>
              </div>

              <p className="text-zinc-600 dark:text-zinc-400">
                Estás a punto de crear tu chatbot. Una vez finalizado, podrás empezar a usar
                tu chat y personalizar más opciones en el panel de administrador.
              </p>
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={submitLoading}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2 border-2 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Anterior
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitLoading}
              className="w-full sm:flex-1 px-4 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {submitLoading
                ? "Procesando..."
                : step === STEPS - 1
                ? "Finalizar"
                : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-950 dark:to-indigo-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
