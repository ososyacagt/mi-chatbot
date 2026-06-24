/* UX/UI: Órdenes con dark mode coherente, skeleton loader, SVG status badges y buscador con ícono */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Toast from "../components/Toast";

/* ── Status config ───────────────────────────────────────────── */
const STATUS_CONFIG = {
  pendiente:  { label: "Pendiente",   dot: "bg-amber-400",  badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  confirmada: { label: "Confirmada",  dot: "bg-blue-400",   badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  en_proceso: { label: "En proceso",  dot: "bg-orange-400", badge: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  entregada:  { label: "Entregada",   dot: "bg-emerald-400",badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  cancelada:  { label: "Cancelada",   dot: "bg-red-400",    badge: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" },
};

const ALL_STATUSES = ["todas", "pendiente", "confirmada", "en_proceso", "entregada", "cancelada"];

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs text-zinc-400">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

/* ── Table skeleton ──────────────────────────────────────────── */
function TableSkeleton() {
  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-5 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded ml-auto" />
        </div>
      ))}
    </div>
  );
}

/* ── Página ──────────────────────────────────────────────────── */
export default function OrdenesPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [orders, setOrders] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  async function loadOrders() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("clientId", clientId);
      if (selectedStatus !== "todas") params.append("status", selectedStatus);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar órdenes");

      const data = await res.json();
      setOrders(data.orders || []);
      setStatusCounts(data.statusCounts || {});
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "Error al cargar órdenes", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (clientId) loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, selectedStatus]);

  const updateOrderStatus = async () => {
    if (!newStatus || !selectedOrder) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus }),
      });
      if (!res.ok) throw new Error("Error al actualizar");

      setToast({ message: `Orden actualizada a ${STATUS_CONFIG[newStatus]?.label}`, type: "success" });
      setSelectedOrder(null);
      setNewStatus("");
      loadOrders();
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "Error al actualizar orden", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.numero_orden.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.cliente_nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Volver"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Órdenes</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{statusCounts.total || 0} total</p>
          </div>
        </div>

        {/* ── Buscador ───────────────────────────────────────── */}
        <div className="relative mb-5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por número de orden o cliente…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full pl-10 pr-4 py-2.5
              bg-white dark:bg-zinc-900
              border border-zinc-200 dark:border-zinc-800
              rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500
              focus:outline-none focus:border-blue-500 dark:focus:border-blue-500
            "
          />
        </div>

        {/* ── Tabs de status ─────────────────────────────────── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {ALL_STATUSES.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const count = status === "todas" ? (statusCounts.total || 0) : (statusCounts[status] || 0);
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap text-xs font-medium transition-all flex-shrink-0
                  ${selectedStatus === status
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }
                `}
              >
                {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                {status === "todas" ? "Todas" : cfg?.label || status}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${selectedStatus === status ? "bg-white/20 dark:bg-black/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tabla ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay órdenes para este filtro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    {["# Orden", "Cliente", "Total", "Método", "Estado", "Fecha", "Acciones"].map((col) => (
                      <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
                        #{order.numero_orden.slice(-8)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-zinc-800 dark:text-zinc-200">
                        {order.cliente_nombre}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-white">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-xs">
                        {order.metodo_pago || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-xs">
                        {new Date(order.created_at).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/orden/${order.id}`;
                              navigator.clipboard.writeText(url);
                              setToast({ message: "Link de seguimiento copiado", type: "success" });
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                            title="Copiar link"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                            Link
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(order); setNewStatus(""); }}
                            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium"
                          >
                            Ver detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Modal de detalle ───────────────────────────────── */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="font-bold text-zinc-900 dark:text-white">
                    Orden #{selectedOrder.numero_orden.slice(-8)}
                  </h2>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Cerrar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Cliente */}
                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Cliente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Nombre</p>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">{selectedOrder.cliente_nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Teléfono</p>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">{selectedOrder.cliente_telefono || "—"}</p>
                    </div>
                    {selectedOrder.cliente_direccion && (
                      <div className="col-span-2">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Dirección</p>
                        <p className="font-semibold text-sm text-zinc-900 dark:text-white">{selectedOrder.cliente_direccion}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Productos */}
                {selectedOrder.items && (
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Productos</h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-sm">
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">{item.nombre}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {item.quantity}x ${item.precio.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-semibold text-zinc-900 dark:text-white">
                            ${(item.quantity * item.precio).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumen */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                    <span>Subtotal</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-blue-600 dark:text-blue-400">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Notas */}
                {selectedOrder.notas && (
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Notas</h3>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                      {selectedOrder.notas}
                    </p>
                  </div>
                )}

                {/* Cambiar status */}
                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Actualizar estado</h3>
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Seleccionar nuevo estado…</option>
                      {["pendiente", "confirmada", "en_proceso", "entregada", "cancelada"].map((status) => (
                        <option key={status} value={status}>{STATUS_CONFIG[status]?.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={updateOrderStatus}
                      disabled={!newStatus || updating}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {updating && (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      {updating ? "Actualizando…" : "Actualizar"}
                    </button>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const trackingUrl = `${window.location.origin}/orden/${selectedOrder.id}`;
                      navigator.clipboard.writeText(trackingUrl);
                      setToast({ message: "Link de seguimiento copiado", type: "success" });
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                    Copiar link de seguimiento
                  </button>
                  {selectedOrder.cliente_telefono && (
                    <a
                      href={`https://wa.me/${selectedOrder.cliente_telefono}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium text-center"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                    </svg>
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast.message && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
        )}
      </div>
    </div>
  );
}
