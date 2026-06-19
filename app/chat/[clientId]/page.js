"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { randomUUID } from "crypto";
import ReactMarkdown from "react-markdown";
import { LANGUAGES, WIDGET_PLACEHOLDERS } from "@/lib/languages";

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
    <div className="flex gap-2 mt-2 md:gap-3">
      <button
        onClick={() => handleRate("up")}
        className={`text-sm px-2 py-1 rounded transition-all duration-200 flex items-center gap-1 ${
          rating === "up"
            ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 scale-105"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        }`}
        title="Útil"
      >
        👍
      </button>
      <button
        onClick={() => handleRate("down")}
        className={`text-sm px-2 py-1 rounded transition-all duration-200 flex items-center gap-1 ${
          rating === "down"
            ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 scale-105"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        }`}
        title="No útil"
      >
        👎
      </button>
    </div>
  );
}

function TypingIndicator({ tenantName, tenantColor }) {
  return (
    <div className="flex items-end gap-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ backgroundColor: tenantColor || "#2563eb" }}
      >
        {tenantName?.charAt(0).toUpperCase() || "?"}
      </div>
      <div className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-end gap-1">
        <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function getInitial(name) {
  return name?.charAt(0).toUpperCase() || "?";
}

function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
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
  const textareaRef = useRef(null);

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
        setMessages([{ ...welcomeMessageFor(data.tenant), timestamp: new Date() }]);
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
      if (!existingStyle) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
          @media (prefers-color-scheme: dark) {
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
    setMessages([{ ...welcomeMessageFor(tenant), timestamp: new Date() }]);
    setInput("");
    setError(null);
  }

  // Auto-scroll al último mensaje
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "auto";
    const scrollHeight = Math.min(textareaRef.current.scrollHeight, 120);
    textareaRef.current.style.height = `${scrollHeight}px`;
  }, [input]);

  async function sendMessage() {
    if (!input.trim() || loading || !tenant || !clientId || limitReached) {
      return;
    }

    setError(null);

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date() },
    ]);
    setInput("");

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          sessionId,
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: userMessage },
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.limitReached) {
          setLimitReached(true);
        }
        throw new Error(data.error || "Error al enviar mensaje");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, timestamp: new Date() },
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

  const isEmpty = !tenantLoading && messages.length === 1 && messages[0]?.synthetic;

  return (
    <div className="flex flex-1 flex-col h-full bg-white dark:bg-zinc-950">
      {/* Header mejorado */}
      <header
        className="px-4 md:px-6 py-3 md:py-4 text-white shadow-md transition-colors border-b border-white/10"
        style={{ backgroundColor: tenant?.colorPrimary || "#2563eb" }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            {!tenantLoading && tenant && (
              <>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center text-sm md:text-lg font-bold ring-2 ring-white/30">
                  {getInitial(tenant.nombre)}
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-bold truncate">{tenant.nombre}</h1>
                  <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-white/80">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                      <span className="hidden sm:inline">En línea</span>
                    </div>
                    <span className="text-white/60">Asistente virtual</span>
                  </div>
                </div>
              </>
            )}
            {tenantLoading && <div className="text-white text-sm">Cargando...</div>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {tenant?.defaultLanguage && (
              <div
                className="text-lg md:text-xl"
                title={tenant.autoDetectLanguage ? "Detección automática de idioma" : `Idioma: ${LANGUAGES.find(l => l.code === tenant.defaultLanguage)?.nombre}`}
              >
                {LANGUAGES.find(l => l.code === tenant.defaultLanguage)?.flag || '🌐'}
              </div>
            )}
            <button
              onClick={handleNewConversation}
              className="p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 text-white"
              title="Nueva conversación"
            >
              🔄
            </button>
            <Link
              href="/"
              className="p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110 text-white"
              title="Página principal"
            >
              ⚙️
            </Link>
          </div>
        </div>
      </header>

      {/* Área de mensajes */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-8 relative bg-white dark:bg-zinc-950"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.02) 1px, transparent 1px),
                            linear-gradient(135deg, rgba(0,0,0,0.01) 0%, transparent 100%)`,
          backgroundSize: "30px 30px, 100% 100%",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {tenantLoading && (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin mb-4">⏳</div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Iniciando chat...</p>
              </div>
            </div>
          )}

          {!tenantLoading && isEmpty && (
            <div className="flex justify-center items-center min-h-[50vh]">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                  ¡Hola! Soy tu asistente virtual
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base max-w-md">
                  {tenant?.welcomeMessage || "¿En qué puedo ayudarte hoy?"}
                </p>
                <div className="mt-6 text-zinc-500 dark:text-zinc-400 text-xs">
                  Escribe tu primera pregunta abajo
                </div>
              </div>
            </div>
          )}

          {!tenantLoading &&
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 md:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ring-2 ring-white/20"
                    style={{ backgroundColor: tenant?.colorPrimary || "#2563eb" }}
                  >
                    {getInitial(tenant?.nombre)}
                  </div>
                )}

                <div className="flex flex-col gap-1 max-w-[85%] md:max-w-md lg:max-w-lg">
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed shadow-sm rounded-2xl transition-all ${
                      msg.role === "user"
                        ? "text-white rounded-br-sm font-medium"
                        : "bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700/50 rounded-bl-sm"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            backgroundColor: tenant?.colorPrimary || "#2563eb",
                            backgroundImage: `linear-gradient(135deg, ${tenant?.colorPrimary || "#2563eb"}dd 0%, ${tenant?.colorPrimary || "#2563eb"}99 100%)`
                          }
                        : undefined
                    }
                  >
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
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

                  <div className={`flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 px-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}>
                    {msg.timestamp && <span>{formatTime(msg.timestamp)}</span>}
                    {input.length > 200 && msg.role === "user" && (
                      <span className="ml-auto text-zinc-400">
                        {msg.content.length} caracteres
                      </span>
                    )}
                  </div>

                  {msg.role === "assistant" && !msg.synthetic && (
                    <MessageRating messageIndex={i} sessionId={sessionId} tenantColorPrimary={tenant?.colorPrimary} />
                  )}
                </div>
              </div>
            ))}

          {loading && (
            <TypingIndicator tenantName={tenant?.nombre} tenantColor={tenant?.colorPrimary} />
          )}

          {error && (
            <div className="flex justify-start">
              <div className="max-w-md rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300 animate-in fade-in">
                ⚠️ {error}
              </div>
            </div>
          )}

          {limitReached && (
            <div className="flex justify-center">
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-6 py-4 text-center text-sm text-amber-700 dark:text-amber-300">
                <div className="font-semibold mb-1">Límite de mensajes alcanzado</div>
                <p className="text-xs opacity-80">Has alcanzado el límite de mensajes para este mes</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input mejorado */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 md:px-6 py-4 md:py-5 shadow-xl">
        <div className="mx-auto flex w-full max-w-3xl gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                limitReached
                  ? "Límite alcanzado 📊"
                  : WIDGET_PLACEHOLDERS[tenant?.defaultLanguage] || "Escribe tu mensaje…"
              }
              rows={1}
              disabled={loading || tenantLoading || !tenant || limitReached}
              className="w-full resize-none rounded-2xl border-2 bg-white dark:bg-zinc-900 px-4 py-3 text-sm md:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
              style={{
                borderColor:
                  limitReached ? "#ef4444" :
                  input && !loading
                    ? (tenant?.colorPrimary || "#2563eb")
                    : "rgb(229, 231, 235)"
              }}
            />
            {input.length > 200 && (
              <div className="absolute bottom-2 right-3 text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-1 rounded">
                {input.length} caracteres
              </div>
            )}
          </div>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || tenantLoading || !tenant || limitReached}
            className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 active:scale-95"
            style={{ backgroundColor: tenant?.colorPrimary || "#2563eb" }}
            title={limitReached ? "Límite de mensajes alcanzado" : "Enviar (Enter)"}
          >
            {loading ? "⟳" : "→"}
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 px-2">
          Presiona <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-mono">↵</kbd> para enviar, <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-mono">Shift + ↵</kbd> para nueva línea
        </p>
      </div>
    </div>
  );
}
