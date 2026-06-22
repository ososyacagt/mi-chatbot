"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Toast from "../components/Toast";

const STATUS_COLORS = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-blue-100 text-blue-800",
  en_proceso: "bg-purple-100 text-purple-800",
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
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("pendiente");
  const [toast, setToast] = useState({ message: "", type: "success" });

  useEffect(() => {
    if (clientId) {
      loadOrders();
    }
  }, [clientId, selectedStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/inventory/orders?clientId=${clientId}&status=${selectedStatus}`
      );

      if (!res.ok) throw new Error("Error al cargar órdenes");

      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ Error al cargar órdenes", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(
        `/api/admin/inventory/orders/${orderId}?clientId=${clientId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) throw new Error("Error al actualizar");

      setToast({
        message: "✓ Estado actualizado",
        type: "success",
      });

      setSelectedOrder(null);
      await loadOrders();
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ Error al actualizar orden", type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400"
            >
              ← Volver
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              📋 Órdenes
            </h1>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedStatus === status
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista de órdenes */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Cargando órdenes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <p className="text-slate-600">
              No hay órdenes con estado "{STATUS_LABELS[selectedStatus]}"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900">
                      {order.numero_orden}
                    </h3>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Cliente</p>
                        <p className="font-medium text-slate-900">
                          {order.cliente_nombre}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-600">Total</p>
                        <p className="font-bold text-slate-900">
                          ${order.total?.toFixed(2) || "0.00"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-600">Fecha</p>
                        <p className="text-slate-900">
                          {new Date(order.created_at).toLocaleDateString("es-ES")}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-600">Estado</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            STATUS_COLORS[order.status] || "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                    </div>

                    {order.cliente_telefono && (
                      <div className="mt-3 flex gap-2">
                        <a
                          href={`https://wa.me/${order.cliente_telefono}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          💬 WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 ml-4"
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de detalles */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full p-6 my-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedOrder.numero_orden}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Información del cliente */}
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                    👤 Información del cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Nombre</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedOrder.cliente_nombre}
                      </p>
                    </div>
                    {selectedOrder.cliente_telefono && (
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Teléfono</p>
                        <a
                          href={`https://wa.me/${selectedOrder.cliente_telefono}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-green-600 hover:text-green-700"
                        >
                          {selectedOrder.cliente_telefono}
                        </a>
                      </div>
                    )}
                    {selectedOrder.cliente_direccion && (
                      <div className="col-span-2">
                        <p className="text-slate-600 dark:text-slate-400">Dirección</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {selectedOrder.cliente_direccion}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Productos */}
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                    🛍️ Productos
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedOrder.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between py-2 border-b border-slate-100"
                      >
                        <span className="text-slate-900 dark:text-white">
                          {item.quantity}x {item.nombre}
                          {item.variantInfo && (
                            <span className="text-slate-600 dark:text-slate-400 ml-1">
                              ({item.variantInfo.valor})
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          ${(item.precio * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totales */}
                <div className="border-b border-slate-200 pb-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      ${selectedOrder.subtotal?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  {selectedOrder.descuentos > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Descuentos:</span>
                      <span className="font-medium text-green-600">
                        -${selectedOrder.descuentos.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-base">
                    <span className="font-bold text-slate-900 dark:text-white">Total:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${selectedOrder.total?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </div>

                {/* Notas */}
                {selectedOrder.notas && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      📝 Notas
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedOrder.notas}
                    </p>
                  </div>
                )}

                {/* Cambiar estado */}
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Cambiar estado
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        disabled={selectedOrder.status === status}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedOrder.status === status
                            ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      </div>
    </div>
  );
}
