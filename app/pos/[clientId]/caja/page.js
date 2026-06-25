"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CajaPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId;

  const [posUser, setPosUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal checkout states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Authentication check
  useEffect(() => {
    const userStr = sessionStorage.getItem("posUser");
    if (!userStr) {
      router.push(`/pos/${clientId}/login`);
      return;
    }
    const userObj = JSON.parse(userStr);
    setPosUser(userObj);

    // Verify role permissions
    if (userObj.rol !== "cajero" && userObj.rol !== "supervisor") {
      router.push(`/pos/${clientId}`);
      return;
    }

    loadCajaConfig();
  }, [clientId]);

  // Load orders continuously
  useEffect(() => {
    if (!clientId || !posUser) return;

    loadOrders();
    const interval = setInterval(loadOrders, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [clientId, posUser]);

  const loadCajaConfig = async () => {
    try {
      const res = await fetch(`/api/pos/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error("[Caja] Error cargando configuración:", err);
    }
  };

  const loadOrders = async () => {
    try {
      // Cashier sees orders in 'pendiente_cobro' or 'lista' (Restaurante orders which are ready to pay)
      const res = await fetch(
        `/api/pos/${clientId}/orders/active?posStatus=pendiente_cobro&posStatus=lista`
      );
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        setError("Error al cargar órdenes");
      }
    } catch (err) {
      console.error("[Caja] Error fetching orders:", err);
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (order) => {
    setSelectedOrder(order);
    setMetodoPago("efectivo");
    setMontoRecibido("");
  };

  const processPayment = async () => {
    if (!selectedOrder) return;
    
    const totalAmount = selectedOrder.total;
    const received = parseFloat(montoRecibido) || 0;
    
    if (metodoPago === "efectivo" && received < totalAmount) {
      alert("El monto recibido debe ser igual o mayor al total del pedido");
      return;
    }

    try {
      setProcessingPayment(true);

      // Determine next status based on flow config
      const posFlujoCobro = config?.posFlujoCobro || "entrega_inmediata";
      const nextStatus = posFlujoCobro === "area_entrega" 
        ? "facturado_pendiente_entrega" 
        : "facturado_finalizado";

      const res = await fetch(`/api/pos/${clientId}/orders/${selectedOrder.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuevoStatus: nextStatus,
          posUserId: posUser.id,
          montoRecibido: metodoPago === "efectivo" ? received : totalAmount,
          nota: `Cobro procesado por cajero ${posUser.nombre} vía ${metodoPago}`
        })
      });

      if (res.ok) {
        setSelectedOrder(null);
        loadOrders();
      } else {
        alert("Error al guardar el pago");
      }
    } catch (err) {
      console.error("[Caja] Error saving payment:", err);
      alert("Error de conexión");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading || !config || !posUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium animate-pulse">Cargando Caja...</p>
      </div>
    );
  }

  const changeDue = montoRecibido && selectedOrder
    ? Math.max(0, parseFloat(montoRecibido) - selectedOrder.total)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <span className="text-3xl">💵</span>
          <div>
            <h1 className="text-lg font-black tracking-tight">{config.storeName} - Caja</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Flujo de Cobros</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/pos/${clientId}`)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            🛒 POS
          </button>
          
          <button
            onClick={() => router.push(`/pos/${clientId}/caja`)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/10"
          >
            💵 Caja
          </button>

          {(posUser.rol === "supervisor" || posUser.rol === "entrega") && (
            <button
              onClick={() => router.push(`/pos/${clientId}/entrega`)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              🥡 Entrega
            </button>
          )}

          <div className="text-right hidden sm:block ml-4">
            <p className="text-sm font-bold text-slate-200">{posUser.nombre}</p>
            <p className="text-xs text-slate-400 capitalize">
              {posUser.rol === "cocina" ? "Personal de Preparación" : posUser.rol}
            </p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("posUser");
              router.push(`/pos/${clientId}/login`);
            }}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black">Cobros Pendientes</h2>
          <button
            onClick={loadOrders}
            className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold transition flex items-center gap-2 text-sm"
          >
            🔄 Recargar
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl py-24 text-center text-slate-500">
            <span className="text-6xl block mb-4">🙌</span>
            <p className="text-lg font-bold text-slate-400">¡Al día! No hay cobros pendientes</p>
            <p className="text-sm mt-1">Las órdenes creadas en mostrador (caja primero) o restaurante listas aparecerán aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => {
              const minutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
              
              return (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition duration-300"
                >
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-black text-slate-400 tracking-wider">
                          {order.numero_orden}
                        </span>
                        <h3 className="font-black text-lg text-slate-200 mt-2">
                          {order.tipo_orden === "mesa" ? `Mesa ${order.mesa_numero}` : "Mostrador"}
                          {order.cliente_nombre && (
                            <span className="text-sm font-normal text-slate-400 ml-2">
                              — {order.cliente_nombre}
                            </span>
                          )}
                        </h3>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        order.pos_status === "lista" ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {order.pos_status === "lista" ? "🍳 Cocina Lista" : "⏳ Por Cobrar"}
                      </span>
                    </div>

                    {/* Items brief */}
                    <div className="space-y-1 my-4">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-slate-400">
                          <span className="truncate max-w-[200px]">{item.nombre}</span>
                          <span>x{item.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-850 pt-4 mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total a Cobrar</p>
                      <p className="text-2xl font-black text-slate-100 mt-0.5">
                        {config.currency} {order.total?.toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => openPaymentModal(order)}
                      className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition shadow-lg shadow-emerald-500/10"
                    >
                      💵 Cobrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout Payment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scaleUp">
            <h2 className="text-xl font-black mb-1">Registrar Pago</h2>
            <p className="text-xs text-slate-500 tracking-wider font-semibold uppercase mb-6">
              Orden #{selectedOrder.numero_orden}
            </p>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-850 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total a Pagar:</span>
                <span className="text-2xl font-black text-emerald-400">
                  {config.currency} {selectedOrder.total?.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold block mb-1 uppercase tracking-wider">Método de pago:</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-sm font-semibold focus:outline-none text-slate-200"
                >
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                  <option value="transferencia">🏦 Transferencia</option>
                </select>
              </div>

              {metodoPago === "efectivo" && (
                <div className="animate-fadeIn">
                  <label className="text-xs text-slate-500 font-bold block mb-1 uppercase tracking-wider">Monto Recibido:</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 focus:outline-none text-lg font-bold"
                  />
                  {changeDue > 0 && (
                    <div className="mt-3 py-2 px-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 font-bold text-center text-sm">
                      Cambio a entregar: {config.currency} {changeDue.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 font-bold text-sm text-slate-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={processPayment}
                disabled={processingPayment || (metodoPago === "efectivo" && (parseFloat(montoRecibido) || 0) < selectedOrder.total)}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-sm text-slate-950 transition"
              >
                {processingPayment ? "Procesando..." : "Confirmar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
