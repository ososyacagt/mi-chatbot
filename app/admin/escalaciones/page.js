"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabase-client";

export default function EscalacionesPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  console.log('[Escalaciones PAGE] Componente montado - clientId:', clientId);

  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [tenantMap, setTenantMap] = useState({});
  const [clientName, setClientName] = useState(null);
  const [responseModal, setResponseModal] = useState({ isOpen: false, escalationId: null, sessionId: null, tenantId: null });
  const [responseText, setResponseText] = useState("");
  const [respondingId, setRespondingId] = useState(null);

  // Panel de chat
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [autoBotEnabled, setAutoBotEnabled] = useState(false);
  const [togglingBot, setTogglingBot] = useState(false);
  const [toast, setToast] = useState(null);
  const previousCountRef = useRef(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadEscalations();
    loadTenants();
  }, [activeTab, clientId]);

  async function loadTenants() {
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        const map = {};
        (data.tenants || []).forEach((t) => {
          map[t.client_id] = t.nombre;
          if (clientId && t.client_id === clientId) {
            setClientName(t.nombre);
          }
        });
        setTenantMap(map);
      }
    } catch (err) {
      console.error("[Escalaciones] Error cargando tenants:", err);
    }
  }

  async function loadEscalations() {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/admin/escalations?status=${activeTab === "pending" ? "pending" : "resolved"}`;
      if (clientId) {
        url += `&clientId=${clientId}`;
      }

      console.log('[Escalaciones] Cargando desde:', url);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al obtener escalaciones");

      const data = await res.json();
      console.log('[Escalaciones] Encontradas:', data.escalations?.length || 0, 'escalaciones');
      setEscalations(data.escalations || []);
    } catch (err) {
      console.error("[Escalaciones] Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(escalationId) {
    try {
      const res = await fetch("/api/admin/escalations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escalationId }),
      });

      if (!res.ok) throw new Error("Error al resolver escalación");

      // Recargar
      await loadEscalations();
    } catch (err) {
      console.error("[Escalaciones] Error resolviendo:", err);
      setError(err.message);
    }
  }

  // Cargar historial completo del chat
  async function loadChatHistory(escalationId) {
    try {
      setChatLoading(true);
      const res = await fetch(`/api/admin/escalations/${escalationId}/chat`);
      if (!res.ok) throw new Error("Error cargando chat");

      const data = await res.json();
      setChatMessages(data.messages || []);
      setAutoBotEnabled(data.escalation?.auto_bot_enabled || false);
      console.log("[Chat Panel] Cargados", data.messages?.length || 0, "mensajes");
      console.log("[Chat Panel] Auto bot enabled:", data.escalation?.auto_bot_enabled);
    } catch (err) {
      console.error("[Chat Panel] Error cargando historial:", err);
    } finally {
      setChatLoading(false);
    }
  }

  // Abrir panel de chat
  function handleOpenChat(escalation) {
    setSelectedEscalation(escalation);
    setChatInput("");
    loadChatHistory(escalation.id);
  }

  // Toggle respuestas automáticas del bot
  async function handleToggleBot() {
    if (!selectedEscalation) return;

    setTogglingBot(true);
    try {
      const res = await fetch(`/api/admin/escalations/${selectedEscalation.id}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoBotEnabled: !autoBotEnabled }),
      });

      if (!res.ok) throw new Error("Error actualizando configuración");

      const data = await res.json();
      setAutoBotEnabled(data.escalation?.auto_bot_enabled || false);
      console.log("[Chat Panel] ✓ Bot toggled:", data.escalation?.auto_bot_enabled);
    } catch (err) {
      console.error("[Chat Panel] Error toggling bot:", err);
      alert("Error actualizando configuración del bot");
    } finally {
      setTogglingBot(false);
    }
  }

  // Polling de nuevos mensajes cada 3 segundos
  useEffect(() => {
    if (!selectedEscalation) return;

    const pollInterval = setInterval(() => {
      loadChatHistory(selectedEscalation.id);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedEscalation]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Enviar mensaje como admin
  async function handleSendChatMessage() {
    if (!chatInput.trim() || !selectedEscalation) return;

    setChatSending(true);
    try {
      const res = await fetch(`/api/admin/escalations/${selectedEscalation.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: chatInput.trim() }),
      });

      if (!res.ok) throw new Error("Error enviando mensaje");

      setChatInput("");
      await loadChatHistory(selectedEscalation.id);
    } catch (err) {
      console.error("[Chat Panel] Error enviando mensaje:", err);
      alert("Error enviando mensaje");
    } finally {
      setChatSending(false);
    }
  }

  function handleResponseClick(escalation) {
    setResponseModal({
      isOpen: true,
      escalationId: escalation.id,
      sessionId: escalation.session_id,
      tenantId: escalation.tenant_id,
    });
    setResponseText("");
  }

  async function handleSendResponse() {
    if (!responseText.trim()) return;

    setRespondingId(responseModal.escalationId);
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const adminEmail = session?.user?.email;

      const res = await fetch("/api/admin/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escalationId: responseModal.escalationId,
          response: responseText,
          sessionId: responseModal.sessionId,
          tenantId: responseModal.tenantId,
          adminEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("[Escalaciones] Error response:", data);
        throw new Error(data.error || "Error al enviar respuesta");
      }

      setResponseModal({
        isOpen: false,
        escalationId: null,
        sessionId: null,
        tenantId: null,
      });
      setResponseText("");
      loadEscalations();
    } catch (err) {
      console.error("[Escalaciones] Error enviando respuesta:", err);
      alert("Error al enviar respuesta");
    } finally {
      setRespondingId(null);
    }
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg max-w-md mx-auto mt-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast de nueva escalación */}
      {toast && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg animate-pulse">
          <p className="text-red-700 dark:text-red-300 font-medium">
            🔴 {toast.message}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {clientId && (
            <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Volver
            </Link>
          )}
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            🆘 Escalaciones
            {clientName && (
              <span className="text-lg font-normal text-zinc-600 dark:text-zinc-400 ml-2">
                • {clientName}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "pending"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setActiveTab("resolved")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "resolved"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          Resueltas
        </button>
      </div>

      {/* Escalaciones */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : escalations.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">✓</div>
          <div className="text-zinc-600 dark:text-zinc-400">
            {activeTab === "pending"
              ? "No hay escalaciones pendientes ✓"
              : "No hay escalaciones resueltas"}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((escalation) => (
            <div
              key={escalation.id}
              className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 border-l-4"
              style={{
                borderLeftColor:
                  escalation.status === "pending" ? "#ef4444" : "#22c55e",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        escalation.status === "pending"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}
                    >
                      {escalation.status === "pending" ? "Pendiente" : "Resuelta"}
                    </span>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {tenantMap[escalation.tenant_id] || escalation.tenant_id}
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    <strong>Mensaje:</strong> "{escalation.mensaje_trigger}"
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    {new Date(escalation.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/admin/conversaciones?clientId=${escalation.tenant_id}`}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg font-medium text-sm transition-colors"
                >
                  Ver conversación
                </Link>
                {escalation.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleOpenChat(escalation)}
                      className="px-4 py-2 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-lg font-medium text-sm transition-colors"
                    >
                      💬 Responder
                    </button>
                    <button
                      onClick={() => handleResolve(escalation.id)}
                      className="px-4 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg font-medium text-sm transition-colors"
                    >
                      Marcar como resuelta
                    </button>
                  </>
                )}
                {escalation.status === "in_progress" && (
                  <button
                    onClick={() => handleOpenChat(escalation)}
                    className="px-4 py-2 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-lg font-medium text-sm transition-colors"
                  >
                    💬 Continuar conversación
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Panel */}
      {selectedEscalation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg w-full max-w-2xl h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  💬 {tenantMap[selectedEscalation.tenant_id] || selectedEscalation.tenant_id}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Status: <span className={selectedEscalation.status === "pending" ? "text-red-600" : "text-amber-600"}>
                      {selectedEscalation.status === "pending" ? "Pendiente" : "En progreso"}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Respuestas automáticas:
                    </label>
                    <button
                      onClick={handleToggleBot}
                      disabled={togglingBot}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        autoBotEnabled
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      } disabled:opacity-50`}
                    >
                      {autoBotEnabled ? "🟢 Activo" : "🔴 Inactivo"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedEscalation.status !== "resolved" && (
                  <button
                    onClick={() => {
                      handleResolve(selectedEscalation.id);
                      setSelectedEscalation(null);
                    }}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
                  >
                    ✓ Resuelto
                  </button>
                )}
                <button
                  onClick={() => setSelectedEscalation(null)}
                  className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white rounded text-sm font-medium"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatLoading && chatMessages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-zinc-500 dark:text-zinc-400">Cargando conversación...</div>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-zinc-500 dark:text-zinc-400">Sin mensajes</div>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "user" ? (
                      <div className="max-w-xs bg-blue-500 text-white rounded-lg rounded-br-none px-4 py-2 text-sm">
                        {msg.content}
                      </div>
                    ) : (
                      <div
                        className={`max-w-xs rounded-lg rounded-bl-none px-4 py-2 text-sm ${
                          msg.is_admin_response
                            ? "bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200 border-l-4 border-teal-500"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1">
                          {msg.is_admin_response ? "Tú (Admin) 👤" : "Bot"}
                        </div>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 flex-shrink-0">
              <div className="flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  placeholder="Escribe tu respuesta... (Shift+Enter para nueva línea)"
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  rows="3"
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || chatSending}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-400 text-white rounded-lg font-medium transition-colors flex-shrink-0 h-fit"
                >
                  {chatSending ? "..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal (Legacy) - Keep for backward compatibility */}
      {responseModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                💬 Responder Escalación
              </h2>

              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Escribe tu respuesta al usuario..."
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4 resize-none"
                rows="5"
              />

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() =>
                    setResponseModal({
                      isOpen: false,
                      escalationId: null,
                      sessionId: null,
                      tenantId: null,
                    })
                  }
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendResponse}
                  disabled={!responseText.trim() || respondingId === responseModal.escalationId}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-400 text-white rounded-lg font-medium transition-colors"
                >
                  {respondingId === responseModal.escalationId
                    ? "Enviando..."
                    : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
