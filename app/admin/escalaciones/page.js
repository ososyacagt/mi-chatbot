"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function EscalacionesPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [tenantMap, setTenantMap] = useState({});
  const [clientName, setClientName] = useState(null);

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

      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al obtener escalaciones");

      const data = await res.json();
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

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg max-w-md mx-auto mt-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
                  <button
                    onClick={() => handleResolve(escalation.id)}
                    className="px-4 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg font-medium text-sm transition-colors"
                  >
                    Marcar como resuelta
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
