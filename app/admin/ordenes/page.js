"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Toast from "../components/Toast";

const STATUS_COLORS = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-blue-100 text-blue-800",
  en_proceso: "bg-orange-100 text-orange-800",
  entregada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

const STATUS_LABELS = {
  pendiente: "⏳ Pendiente",
  confirmada: "✓ Confirmada",
  en_proceso: "📦 En proceso",
  entregada: "✅ Entregada",
  cancelada: "❌ Cancelada",
};

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

  useEffect(() => {
    if (clientId) {
      loadOrders();
    }
  }, [clientId, selectedStatus]);

  const loadOrders = async () => {
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
      setToast({ message: "✗ Error al cargar órdenes", type: "error" });
    } finally {
      setLoading(false);
    }
  };

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

      setToast({
        message: `✓ Orden actualizada a ${STATUS_LABELS[newStatus]}`,
        type: "success",
      });

      setSelectedOrder(null);
      setNewStatus("");
      loadOrders();
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ Error al actualizar orden", type: "error" });
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-2xl text-slate-600 hover:text-slate-900">
            ←
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">📋 Órdenes</h1>
          <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
            {statusCounts.total || 0}
          </span>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por número de orden o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tabs de Status */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["todas", "pendiente", "confirmada", "en_proceso", "entregada", "cancelada"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition ${
                  selectedStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {status === "todas" ? "Todas" : STATUS_LABELS[status]}
                <span className="ml-2 text-xs opacity-75">({statusCounts[status] || 0})</span>
              </button>
            )
          )}
        </div>

        {/* Tabla de Órdenes */}
        {loading ? (
          <div className="text-center py-12 text-slate-600">Cargando órdenes...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-600">
            No hay órdenes
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900"># Orden</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Cliente</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Total</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Método</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Fecha</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-slate-900">{order.numero_orden.slice(-8)}</td>
                    <td className="px-6 py-4 text-slate-900">{order.cliente_nombre}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{order.metodo_pago || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {new Date(order.created_at).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-6 py-4 space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/orden/${order.id}`;
                            navigator.clipboard.writeText(url);
                            setToast({ message: "✓ Link de seguimiento copiado", type: "success" });
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                          title="Copiar link de seguimiento"
                        >
                          🔗 Link
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setNewStatus("");
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
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

        {/* Modal de detalle */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Orden #{selectedOrder.numero_orden.slice(-8)}</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-500 hover:text-slate-900 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Cliente */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Nombre</p>
                    <p className="font-semibold">{selectedOrder.cliente_nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Teléfono</p>
                    <p className="font-semibold">{selectedOrder.cliente_telefono || "—"}</p>
                  </div>
                  {selectedOrder.cliente_direccion && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-600">Dirección</p>
                      <p className="font-semibold">{selectedOrder.cliente_direccion}</p>
                    </div>
                  )}
                </div>

                {/* Productos */}
                {selectedOrder.items && (
                  <div>
                    <h3 className="font-semibold mb-3">Productos</h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium">{item.nombre}</p>
                            <p className="text-slate-600 text-xs">
                              {item.quantity}x ${item.precio.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-semibold">
                            ${(item.quantity * item.precio).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumen */}
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold">${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-blue-600">
                      ${selectedOrder.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Notas */}
                {selectedOrder.notas && (
                  <div>
                    <h3 className="font-semibold mb-2">Notas</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {selectedOrder.notas}
                    </p>
                  </div>
                )}

                {/* Cambiar Status */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold">Cambiar status</label>
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar nuevo status...</option>
                      {["pendiente", "confirmada", "en_proceso", "entregada", "cancelada"].map(
                        (status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        )
                      )}
                    </select>
                    <button
                      onClick={updateOrderStatus}
                      disabled={!newStatus || updating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updating ? "..." : "Actualizar"}
                    </button>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const trackingUrl = `${window.location.origin}/orden/${selectedOrder.id}`;
                      navigator.clipboard.writeText(trackingUrl);
                      setToast({ message: "🔗 Link de seguimiento copiado", type: "success" });
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    🔗 Copiar link de seguimiento
                  </button>
                  {selectedOrder.cliente_telefono && (
                    <a
                      href={`https://wa.me/${selectedOrder.cliente_telefono}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium text-center hover:bg-green-600"
                    >
                      💬 WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700"
                  >
                    🖨️ Imprimir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast.message && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ message: "", type: "success" })}
          />
        )}
      </div>
    </div>
  );
}
