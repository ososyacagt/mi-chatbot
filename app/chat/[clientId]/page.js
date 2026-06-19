"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { randomUUID } from "crypto";
import ReactMarkdown from "react-markdown";

function welcomeMessageFor(tenant) {
  return { role: "assistant", content: tenant.welcomeMessage, synthetic: true };
}

function MessageRating({ messageIndex, sessionId, tenantColorPrimary }) {
  const [rating, setRating] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    const key = `rating_${sessionId}_${messageIndex}`;
    const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (stored) {
      setRating(stored);
    }
  }, [sessionId, messageIndex]);

  const handleRate = (value) => {
    if (!sessionId) return;
    const key = `rating_${sessionId}_${messageIndex}`;
    const newValue = rating === value ? null : value;

    if (newValue) {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, newValue);
      }
      setRating(newValue);
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem(key);
      }
      setRating(null);
    }
  };

  return (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={() => handleRate("up")}
        className={`text-sm px-2 py-1 rounded transition-colors ${
          rating === "up"
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
        }`}
        title="Útil"
      >
        👍
      </button>
      <button
        onClick={() => handleRate("down")}
        className={`text-sm px-2 py-1 rounded transition-colors ${
          rating === "down"
            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            : "hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
        }`}
        title="No útil"
      >
        👎
      </button>
    </div>
  );
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
  const [limitReached, setLimitReached] = useState(false);
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

        console.log("[Chat] Tenant cargado:", data.tenant);
        console.log("[Chat] Tema del tenant:", data.tenant?.theme);

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

  // Aplicar override de media queries SOLO si el tema es light
  useEffect(() => {
    if (!tenant?.theme) return;

    const styleId = "theme-mode-override";
    const existingStyle = document.getElementById(styleId);

    if (tenant.theme === "light") {
      // Forzar modo claro anulando las media queries
      if (!existingStyle) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
          @media (prefers-color-scheme: dark) {
            /* Override ALL Tailwind dark variants to use light colors */
            :where(.bg-zinc-50) { background-color: rgb(250, 250, 250); }
            :where(.bg-zinc-100) { background-color: rgb(244, 244, 245); }
            :where(.bg-white) { background-color: rgb(255, 255, 255); }
            :where(.text-zinc-900) { color: rgb(23, 23, 23); }
            :where(.text-white) { color: rgb(23, 23, 23); }
            :where(.text-zinc-700) { color: rgb(63, 63, 70); }
            :where(.text-zinc-600) { color: rgb(82, 82, 91); }
            :where(.border-zinc-200) { border-color: rgb(228, 228, 231); }
            :where(.border-zinc-300) { border-color: rgb(212, 212, 216); }
            :where(.bg-gradient-to-br) { background: linear-gradient(to bottom right, rgb(240, 249, 255), rgb(238, 242, 255)); }
          }
        `;
        document.head.appendChild(style);
        console.log("[Chat] Override inyectado - forzando tema claro");
      }
    } else {
      // Remover el override para permitir que funcionen los temas oscuro y auto
      if (existingStyle) {
        existingStyle.remove();
        console.log("[Chat] Override removido");
      }
    }
  }, [tenant?.theme]);

  // Aplicar tema visual según configuración del tenant
  useEffect(() => {
    if (!tenant || !tenant.theme) return;

    const root = document.documentElement;
    const theme = tenant.theme || "auto";

    console.log("[Chat] Aplicando tema:", theme);

    // Limpiar clases anteriores - ser explícito
    root.classList.remove("dark");

    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
      console.log("[Chat] Tema oscuro aplicado");
    } else if (theme === "light") {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
      console.log("[Chat] Tema claro aplicado - color-scheme: light");
    } else {
      // auto: usar preferencia del sistema
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
        console.log("[Chat] Tema auto (oscuro del sistema) aplicado");
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
        console.log("[Chat] Tema auto (claro del sistema) aplicado");
      }
    }

    // Cleanup al desmontar
    return () => {
      root.classList.remove("dark");
      root.style.colorScheme = "";
    };
  }, [tenant?.theme]);

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
        // Manejar límite de mensajes
        if (res.status === 429 && data.limitReached) {
          const resetDate = new Date(data.resetDate).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          throw new Error(
            `Has alcanzado el límite de ${data.limit} mensajes de tu plan. Tu contador se reinicia el ${resetDate}. Contacta al administrador para actualizar tu plan.`
          );
        }
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
      if (err.message.includes("límite de")) {
        setLimitReached(true);
      }
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
        className="flex-1 overflow-y-auto px-4 py-8 relative bg-zinc-50 dark:bg-zinc-950"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
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
                <div className="flex flex-col gap-1">
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 text-sm leading-relaxed shadow-sm group ${
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
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-sm">{children}</li>,
                          code: ({inline, children}) => inline
                            ? <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 font-mono text-xs">{children}</code>
                            : <pre className="bg-black/10 dark:bg-white/10 rounded p-3 font-mono text-xs overflow-x-auto mb-2"><code>{children}</code></pre>,
                          a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>,
                          h1: ({children}) => <h1 className="font-bold text-base mb-2">{children}</h1>,
                          h2: ({children}) => <h2 className="font-semibold text-sm mb-2">{children}</h2>,
                          h3: ({children}) => <h3 className="font-semibold text-sm mb-1">{children}</h3>,
                          blockquote: ({children}) => <blockquote className="border-l-2 border-current pl-3 opacity-80 mb-2">{children}</blockquote>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  {msg.role === "assistant" && !msg.synthetic && (
                    <MessageRating messageIndex={i} sessionId={sessionId} tenantColorPrimary={tenant?.colorPrimary} />
                  )}
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
              placeholder={limitReached ? "Límite de mensajes alcanzado" : "Escribe tu mensaje…"}
              rows={1}
              disabled={loading || tenantLoading || !tenant || limitReached}
              className="w-full resize-none rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-colors disabled:opacity-50"
              style={{
                borderColor: input && !loading && !limitReached ? (tenant?.colorPrimary || "#2563eb") : undefined
              }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || tenantLoading || !tenant || limitReached}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            style={{ backgroundColor: tenant?.colorPrimary || "#2563eb" }}
            title={limitReached ? "Límite de mensajes alcanzado" : "Enviar (Enter)"}
          >
            {loading ? "⟳" : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
