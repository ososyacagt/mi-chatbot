"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const ENTITIES = {
  tenant: "Clientes",
  user: "Usuarios",
  document: "Documentos",
  session: "Sesiones",
};

const ACTIONS = {
  create: { label: "Crear", color: "bg-green-100 text-green-700" },
  update: { label: "Editar", color: "bg-blue-100 text-blue-700" },
  delete: { label: "Eliminar", color: "bg-red-100 text-red-700" },
  login: { label: "Login", color: "bg-gray-100 text-gray-700" },
  login_failed: { label: "Login fallido", color: "bg-orange-100 text-orange-700" },
  login_blocked: { label: "Login bloqueado", color: "bg-red-900/20 text-red-900" },
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadLogs();
  }, [entityFilter, actionFilter, offset]);

  async function loadLogs() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("limit", limit);
      params.append("offset", offset);
      if (entityFilter) params.append("entity", entityFilter);
      if (actionFilter) params.append("action", actionFilter);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) throw new Error("Error al obtener logs");

      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("[Auditoria] Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleLoadMore = () => {
    setOffset(offset + limit);
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg max-w-md mx-auto mt-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Volver
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            🔍 Log de auditoría
          </h1>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Entidad
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">Todas</option>
              {Object.entries(ENTITIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Acción
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="">Todas</option>
              {Object.entries(ACTIONS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadLogs}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No hay registros de auditoría
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Fecha/Hora
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Acción
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Entidad
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Detalles
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                      <div className="font-medium">{log.user_email || "Sistema"}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{log.ip}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          ACTIONS[log.action]?.color ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ACTIONS[log.action]?.label || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                      {ENTITIES[log.entity] || log.entity}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                      {log.entity_id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() =>
                          setExpandedId(
                            expandedId === log.id ? null : log.id
                          )
                        }
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {expandedId === log.id ? "Ocultar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Detalles expandidos */}
            {logs.map((log) =>
              expandedId === log.id ? (
                <div
                  key={`expanded-${log.id}`}
                  className="bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-700 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Cambios:
                  </p>
                  <pre className="bg-white dark:bg-zinc-900 p-3 rounded text-xs overflow-auto text-zinc-900 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Paginación */}
      {logs.length > 0 && offset + limit < total && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Cargar más ({offset + limit} de {total})
          </button>
        </div>
      )}

      {logs.length > 0 && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 text-center">
          Mostrando {logs.length} de {total} registros
        </p>
      )}
    </div>
  );
}
