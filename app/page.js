"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function welcomeMessageFor(tenant) {
  return { role: "assistant", content: tenant.welcomeMessage, synthetic: true };
}

export default function Home() {
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [clientId, setClientId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Carga la lista de tenants al montar el componente
  useEffect(() => {
    async function loadTenants() {
      try {
        const res = await fetch("/api/tenants");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al cargar clientes");
        }
        const loadedTenants = data.tenants || [];
        setTenants(loadedTenants);

        // Establece el primer tenant por defecto con su mensaje de bienvenida
        if (loadedTenants.length > 0) {
          const firstTenant = loadedTenants[0];
          setClientId(firstTenant.id);
          setMessages([welcomeMessageFor(firstTenant)]);
        }
      } catch (err) {
        console.error("Error cargando tenants:", err);
        setError(err.message);
      } finally {
        setTenantsLoading(false);
      }
    }
    loadTenants();
  }, []);

  // Asegura que si tenants se cargan pero messages sigue vacío,
  // inicializa con el welcomeMessage
  useEffect(() => {
    if (!tenantsLoading && tenants.length > 0 && messages.length === 0 && clientId) {
      const currentTenant = tenants.find((t) => t.id === clientId);
      if (currentTenant) {
        setMessages([welcomeMessageFor(currentTenant)]);
      }
    }
  }, [tenantsLoading, tenants, messages.length, clientId]);

  const currentTenant =
    tenants.find((t) => t.id === clientId) || tenants[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleClientChange(e) {
    const newId = e.target.value;
    const tenant = tenants.find((t) => t.id === newId) || tenants[0];
    setClientId(newId);
    setMessages([welcomeMessageFor(tenant)]);
    setError(null);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // El mensaje de bienvenida es local (no fue generado por Claude), así
      // que se excluye del historial real enviado a la API.
      const apiMessages = nextMessages
        .filter((m) => !m.synthetic)
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, clientId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al obtener respuesta.");
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

  return (
    <div className="flex flex-1 flex-col h-full bg-zinc-50 dark:bg-black">
      <header
        className="flex items-center justify-between gap-3 px-4 py-3 text-white transition-colors"
        style={{ backgroundColor: currentTenant?.colorPrimary || "#2563eb" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">
            {tenantsLoading ? "Cargando..." : currentTenant?.nombre || "Chatbot"}
          </h1>
          <Link
            href="/admin"
            className="ml-auto md:ml-0 p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Panel de administración"
          >
            ⚙️
          </Link>
        </div>

        <select
          value={clientId || ""}
          onChange={handleClientChange}
          disabled={tenantsLoading || tenants.length === 0}
          className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-white outline-none [&>option]:text-zinc-900 disabled:opacity-50"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {tenantsLoading && (
            <div className="flex justify-center items-center h-full">
              <div className="text-zinc-500 dark:text-zinc-400 text-sm">Cargando clientes...</div>
            </div>
          )}
          {!tenantsLoading && messages.length === 0 && (
            <div className="flex justify-center items-start pt-8">
              <div className="text-zinc-400 dark:text-zinc-500 text-sm">No hay mensajes</div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "text-white"
                    : "bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800"
                }`}
                style={
                  msg.role === "user"
                    ? { backgroundColor: currentTenant?.colorPrimary || "#2563eb" }
                    : undefined
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                Escribiendo…
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje… (Enter para enviar)"
            rows={1}
            disabled={loading || tenantsLoading}
            className="flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || tenantsLoading}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: currentTenant?.colorPrimary || "#2563eb" }}
          >
            {loading ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
