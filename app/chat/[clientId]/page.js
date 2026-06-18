"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { randomUUID } from "crypto";

function welcomeMessageFor(tenant) {
  return { role: "assistant", content: tenant.welcomeMessage, synthetic: true };
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-1">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function getInitial(name) {
  return name?.charAt(0).toUpperCase() || "?";
}

export default function ChatPage() {
  const params = useParams();
  const clientId = params.clientId;

  const [tenant, setTenant] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  // Inicializar sessionId desde localStorage o generar uno nuevo
  useEffect(() => {
    if (!clientId) return;

    const storageKey = `chat_session_${clientId}`;
    let stored = null;

    if (typeof window !== "undefined") {
      stored = localStorage.getItem(storageKey);
    }

    if (!stored) {
      stored = crypto.randomUUID();
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, stored);
      }
    }

    setSessionId(stored);
  }, [clientId]);

  // Carga los datos del tenant
  useEffect(() => {
    async function loadTenant() {
      try {
        setTenantLoading(true);
        const res = await fetch(`/api/tenants/${clientId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Chat no encontrado");
        }

        setTenant(data.tenant);
        setMessages([welcomeMessageFor(data.tenant)]);
      } catch (err) {
        console.error("Error cargando tenant:", err);
        setError(err.message);
        setTenant(null);
      } finally {
        setTenantLoading(false);
      }
    }

    if (clientId) {
      loadTenant();
    }
  }, [clientId]);

  function handleNewConversation() {
    if (!clientId) return;

    const storageKey = `chat_session_${clientId}`;
    const newSessionId = crypto.randomUUID();

    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, newSessionId);
    }

    setSessionId(newSessionId);
    setMessages([welcomeMessageFor(tenant)]);
    setInput("");
    setError(null);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !tenant || !sessionId) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const apiMessages = nextMessages
        .filter((m) => !m.synthetic)
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, clientId, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al obtener respuesta.");
      }

      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        const storageKey = `chat_session_${clientId}`;
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, data.sessionId);
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Si no hay tenant, mostrar error
  if (!tenantLoading && !tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-black dark:to-zinc-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
            Chat no encontrado
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            {error || "El cliente solicitado no existe."}
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            ← Volver a la página principal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full bg-white dark:bg-zinc-950">
      {/* Header elegante */}
      <header
        className="px-6 py-4 text-white shadow-md transition-colors"
        style={{ backgroundColor: tenant?.colorPrimary || "#2563eb" }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!tenantLoading && tenant && (
              <>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  {getInitial(tenant.nombre)}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{tenant.nombre}</h1>
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                    En línea
                  </div>
                </div>
              </>
            )}
            {tenantLoading && <div className="text-white">Cargando...</div>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConversation}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              title="Nueva conversación"
            >
              ➕
            </button>
            <Link
              href="/"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Todos los chats"
            >
              ⚙️
            </Link>
          </div>
        </div>
      </header>

      {/* Área de mensajes con patrón de fondo */}
      <div
        className="flex-1 overflow-y-auto px-4 py-8 relative"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
          backgroundColor: "rgb(248, 248, 248)"
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {tenantLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="text-zinc-500 dark:text-zinc-400">Cargando chat...</div>
            </div>
          )}
          {!tenantLoading &&
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: tenant?.colorPrimary || "#2563eb" }}
                  >
                    {getInitial(tenant?.nombre)}
                  </div>
                )}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "text-white rounded-[20px] rounded-br-[4px]"
                      : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-[20px] rounded-bl-[4px]"
                  }`}
                  style={
                    msg.role === "user"
                      ? { backgroundColor: tenant?.colorPrimary || "#2563eb" }
                      : undefined
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

          {loading && (
            <div className="flex gap-2 justify-start animate-in fade-in">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: tenant?.colorPrimary || "#2563eb" }}
              >
                {getInitial(tenant?.nombre)}
              </div>
              <div className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-3 rounded-[20px] rounded-bl-[4px]">
                <TypingIndicator />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input mejorado */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4 shadow-lg">
        <div className="mx-auto flex w-full max-w-3xl gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje…"
              rows={1}
              disabled={loading || tenantLoading || !tenant}
              className="w-full resize-none rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-colors disabled:opacity-50"
              style={{
                borderColor: input && !loading ? (tenant?.colorPrimary || "#2563eb") : undefined
              }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || tenantLoading || !tenant}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            style={{ backgroundColor: tenant?.colorPrimary || "#2563eb" }}
            title="Enviar (Enter)"
          >
            {loading ? "⟳" : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
