"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ConversacionesPage() {
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId");

  const [user, setUser] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  // Cargar usuario y verificar acceso al cliente
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        if (!clientIdParam) {
          throw new Error("Se requiere especificar un cliente");
        }

        const [userRes, tenantsRes] = await Promise.all([
          fetch("/api/admin/me"),
          fetch("/api/admin/tenants"),
        ]);

        if (!userRes.ok || !tenantsRes.ok) throw new Error("No autorizado");

        const userData = await userRes.json();
        const tenantsData = await tenantsRes.json();

        setUser(userData);

        let tenantsList = tenantsData.tenants || [];
        if (userData.role === "admin") {
          tenantsList = tenantsList.filter((t) =>
            userData.tenant_ids?.includes(t.id)
          );
        }

        const tenant = tenantsList.find((t) => t.id === clientIdParam);
        if (!tenant) {
          throw new Error("No tienes acceso a este cliente");
        }

        setSelectedTenant(tenant);
      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [clientIdParam]);

  // Cargar conversaciones cuando cambia el cliente seleccionado
  useEffect(() => {
    if (!selectedTenant) return;

    async function loadConversations() {
      try {
        setConversations([]);
        setSelectedSessionId(null);
        setMessages([]);

        const res = await fetch(
          `/api/admin/conversations?clientId=${selectedTenant.id}`
        );
        if (!res.ok) throw new Error("Error al cargar conversaciones");

        const data = await res.json();
        setConversations(data.conversations || []);
      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      }
    }

    loadConversations();
  }, [selectedTenant]);

  // Cargar mensajes de una conversación
  async function loadConversation(sessionId) {
    try {
      const res = await fetch(
        `/api/admin/conversations/${sessionId}?clientId=${selectedTenant.id}`
      );
      if (!res.ok) throw new Error("Error al cargar conversación");

      const data = await res.json();
      setMessages(data.messages || []);
      setSelectedSessionId(sessionId);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    }
  }

  // Eliminar conversación
  async function deleteConversation(sessionId) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta conversación?"))
      return;

    try {
      setDeletingId(sessionId);

      const res = await fetch(
        `/api/admin/conversations/${sessionId}?clientId=${selectedTenant.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Error al eliminar conversación");

      setConversations((prev) =>
        prev.filter((c) => c.session_id !== sessionId)
      );
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Volver al panel"
              >
                ←
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                📋 Historial de conversaciones
              </h1>
              {selectedTenant && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  {selectedTenant.nombre}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-600 dark:text-zinc-400">Cargando...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de conversaciones */}
            <div className="lg:col-span-1">
              {/* Lista de conversaciones */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">
                    Conversaciones
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Total: {conversations.length}
                  </p>
                </div>

                {conversations.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
                    No hay conversaciones
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
                    {conversations.map((conv) => (
                      <div
                        key={conv.session_id}
                        onClick={() => loadConversation(conv.session_id)}
                        className={`w-full text-left p-4 transition-colors cursor-pointer ${
                          selectedSessionId === conv.session_id
                            ? "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-600"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {new Date(conv.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white mt-1 line-clamp-2">
                              {conv.first_message}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                              {conv.total_messages} mensajes
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.session_id);
                            }}
                            disabled={deletingId === conv.session_id}
                            className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 text-lg"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel de conversación */}
            <div className="lg:col-span-2">
              {selectedSessionId ? (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                  <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">
                    Conversación
                  </h2>

                  {/* Mensajes */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-600 dark:text-blue-400">
                            {selectedTenant?.nombre?.charAt(0).toUpperCase() || "A"}
                          </div>
                        )}
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                            msg.role === "user"
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Total: {messages.length} mensajes
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center text-zinc-500 dark:text-zinc-400">
                  Selecciona una conversación para ver los detalles
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
