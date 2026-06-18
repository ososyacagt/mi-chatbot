"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function MetricasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [period, setPeriod] = useState("7d");
  const [metrics, setMetrics] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) {
      setError("Cliente no especificado");
      setLoading(false);
      return;
    }
    loadData();
  }, [clientId, period]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Obtener datos del cliente
      const clientRes = await fetch(`/api/tenants/${clientId}`);
      if (!clientRes.ok) throw new Error("No se pudo obtener datos del cliente");
      const clientData = await clientRes.json();
      setClient(clientData.tenant);

      // Obtener métricas
      const metricsRes = await fetch(
        `/api/admin/metrics?clientId=${clientId}&periodo=${period}`
      );
      if (!metricsRes.ok) throw new Error("No se pudo obtener métricas");
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);
    } catch (err) {
      console.error("[Metricas] Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg max-w-md mx-auto mt-4">
        Error: {error}
      </div>
    );
  }

  if (!metrics || !client) {
    return (
      <div className="p-4 text-zinc-600">
        No hay datos disponibles
      </div>
    );
  }

  const { resumen, porDia } = metrics;

  // Calcular valores para el gráfico
  const maxMensajes = Math.max(
    ...porDia.map((d) => d.mensajes),
    1
  );

  // Últimas 10 filas de actividad
  const actividadReciente = [...porDia].reverse().slice(0, 10);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Volver
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              📊 Dashboard de métricas
            </h1>
          </div>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">
          Cliente: <span className="font-semibold text-zinc-900 dark:text-white">{client.nombre}</span>
        </p>
      </div>

      {/* Selector de período */}
      <div className="mb-6 flex gap-2">
        {["7d", "30d", "90d"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {p === "7d" ? "7 días" : p === "30d" ? "30 días" : "90 días"}
          </button>
        ))}
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Total conversaciones
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {resumen.totalConversaciones}
              </p>
            </div>
            <div className="text-4xl">💬</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Total mensajes
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {resumen.totalMensajes}
              </p>
            </div>
            <div className="text-4xl">📨</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Promedio por conversación
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {resumen.promedioMensajesPorConversacion}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Días activos
              </p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {resumen.diasActivos}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
          Mensajes por día
        </h2>

        {porDia.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            Sin actividad en este período
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-64 overflow-x-auto pb-4">
            {porDia.map((day) => (
              <div
                key={day.fecha}
                className="flex flex-col items-center gap-2 flex-shrink-0"
              >
                <div className="relative h-48 w-8">
                  <div
                    className="absolute bottom-0 w-full rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${(day.mensajes / maxMensajes) * 100}%`,
                      backgroundColor: client.colorPrimary || "#3b82f6",
                    }}
                    title={`${day.fecha}: ${day.mensajes} mensajes`}
                  />
                </div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {new Date(day.fecha).toLocaleDateString("es-ES", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabla de actividad reciente */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
          Actividad reciente
        </h2>

        {actividadReciente.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            Sin actividad
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Fecha
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Conversaciones
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Mensajes
                  </th>
                </tr>
              </thead>
              <tbody>
                {actividadReciente.map((row) => (
                  <tr
                    key={row.fecha}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <td className="py-3 px-4 text-zinc-900 dark:text-white">
                      {new Date(row.fecha).toLocaleDateString("es-ES", {
                        weekday: "short",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="text-right py-3 px-4 text-zinc-900 dark:text-white">
                      {row.conversaciones}
                    </td>
                    <td className="text-right py-3 px-4 text-zinc-900 dark:text-white">
                      {row.mensajes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
