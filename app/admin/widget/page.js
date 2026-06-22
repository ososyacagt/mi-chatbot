"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function WidgetPage() {
  const searchParams = useSearchParams();
  const clientParam = searchParams.get("client");

  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(clientParam || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

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

      setTenants(tenantsList);

      // Si viene clientParam en URL, usarlo. Si no, usar el primero de la lista.
      if (clientParam) {
        const tenantExists = tenantsList.find((t) => t.id === clientParam);
        if (tenantExists) {
          setSelectedClientId(clientParam);
        } else {
          setError("No tienes acceso a este cliente");
        }
      } else if (tenantsList.length > 0) {
        setSelectedClientId(tenantsList[0].id);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedTenant = tenants.find((t) => t.id === selectedClientId);
  const widgetCode = selectedClientId
    ? `<script src="${appUrl}/widget.js?client=${selectedClientId}"><\/script>`
    : "";

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(widgetCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error:", err);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Volver al panel"
          >
            ←
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
            🔌 Widget embebible
          </h1>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">
          Integra el chat en tu sitio web con una sola línea de código
        </p>
      </div>

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
          {/* Panel izquierdo: Selector y código */}
          <div className="lg:col-span-1 space-y-6">
            {/* Selector de cliente (solo si no viene clientParam en URL) */}
            {!clientParam && (
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Selecciona un cliente
                </label>
                <select
                  value={selectedClientId || ""}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Código para copiar */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
                Código de integración
              </h2>

              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 mb-4 border border-zinc-300 dark:border-zinc-700 overflow-x-auto">
                <code className="text-xs text-zinc-700 dark:text-zinc-300 font-mono break-words">
                  {widgetCode}
                </code>
              </div>

              <button
                onClick={copyToClipboard}
                className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {copied ? "✓ Copiado" : "📋 Copiar código"}
              </button>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
                Instrucciones
              </h3>
              <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-2 list-decimal list-inside">
                <li>Copia el código de integración</li>
                <li>Pégalo antes de la etiqueta &lt;/body&gt; en tu sitio</li>
                <li>¡Listo! El widget aparecerá en la esquina inferior derecha</li>
              </ol>
            </div>
          </div>

          {/* Panel derecho: Preview */}
          {selectedTenant && (
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  Vista previa
                </h2>

                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-8 relative" style={{ minHeight: "600px" }}>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
                    El widget aparecerá así en tu sitio:
                  </p>

                  {/* Simulación del widget */}
                  <div className="relative" style={{ height: "400px" }}>
                    {/* Botón flotante */}
                    <div
                      className="absolute bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: selectedTenant.colorPrimary }}
                    >
                      <svg
                        className="w-7 h-7 text-white"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                      </svg>
                    </div>

                    {/* Panel de chat (simulado) */}
                    <div className="absolute bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ maxWidth: "calc(100% - 48px)" }}>
                      {/* Header */}
                      <div
                        className="text-white p-4 flex items-center justify-between"
                        style={{ backgroundColor: selectedTenant.colorPrimary }}
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{selectedTenant.nombre}</h3>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                        <button className="text-xl">×</button>
                      </div>

                      {/* Mensajes */}
                      <div className="p-4 space-y-3" style={{ height: "280px", overflowY: "auto" }}>
                        <div className="flex justify-start">
                          <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-none px-4 py-2 text-sm max-w-xs">
                            {selectedTenant.welcomeMessage}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div
                            className="text-white rounded-2xl rounded-br-none px-4 py-2 text-sm max-w-xs"
                            style={{ backgroundColor: selectedTenant.colorPrimary }}
                          >
                            Hola, ¿cómo estás?
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-none px-4 py-2 text-sm max-w-xs">
                            ¡Muy bien! ¿Cómo puedo ayudarte?
                          </div>
                        </div>
                      </div>

                      {/* Input */}
                      <div className="p-3 border-t border-gray-200 flex gap-2">
                        <input
                          type="text"
                          placeholder="Escribe tu mensaje..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          disabled
                        />
                        <button
                          className="text-white px-3 py-2 rounded-lg"
                          style={{ backgroundColor: selectedTenant.colorPrimary }}
                          disabled
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info del cliente */}
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Color primario</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: selectedTenant.colorPrimary }}
                        ></div>
                        <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                          {selectedTenant.colorPrimary}
                        </code>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Client ID</p>
                      <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 mt-2 block break-all">
                        {selectedClientId}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
