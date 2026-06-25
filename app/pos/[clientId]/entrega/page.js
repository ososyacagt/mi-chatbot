"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EntregaPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId;

  const [posUser, setPosUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingDelivery, setProcessingDelivery] = useState(null);

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
    const rolesPermitidos = ['supervisor', 'cajero', 'mesero'];
    if (!rolesPermitidos.includes(userObj.rol)) {
      router.push(`/pos/${clientId}`);
      return;
    }

    loadEntregaConfig();
  }, [clientId]);

  // Load orders continuously
  useEffect(() => {
    if (!clientId || !posUser) return;

    loadOrders();
    const interval = setInterval(loadOrders, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [clientId, posUser]);

  const loadEntregaConfig = async () => {
    try {
      const res = await fetch(`/api/pos/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error("[Entrega] Error cargando configuración:", err);
    }
  };

  const loadOrders = async () => {
    try {
      // Delivery area sees orders in 'facturado_pendiente_entrega'
      const res = await fetch(
        `/api/pos/${clientId}/orders/active?posStatus=facturado_pendiente_entrega`
      );
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        setError("Error al cargar órdenes de entrega");
      }
    } catch (err) {
      console.error("[Entrega] Error fetching orders:", err);
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  const markAsDelivered = async (orderId) => {
    try {
      setProcessingDelivery(orderId);

      const res = await fetch(`/api/pos/${clientId}/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuevoStatus: "facturado_finalizado",
          posUserId: posUser.id,
          nota: `Orden entregada al cliente por operador de entrega ${posUser.nombre}`
        })
      });

      if (res.ok) {
        loadOrders();
      } else {
        alert("Error al marcar como entregado");
      }
    } catch (err) {
      console.error("[Entrega] Error marking delivered:", err);
      alert("Error de conexión");
    } finally {
      setProcessingDelivery(null);
    }
  };

  if (loading || !config || !posUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium animate-pulse">Cargando Área de Entrega...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🥡</span>
          <div>
            <h1 className="text-lg font-black tracking-tight">{config.storeName} - Área de Entrega</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Despacho de Pedidos</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/pos/${clientId}`)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            🛒 POS
          </button>
          
          {(posUser.rol === "supervisor" || posUser.rol === "cajero") && (
            <button
              onClick={() => router.push(`/pos/${clientId}/caja`)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              💵 Caja
            </button>
          )}

          <button
            onClick={() => router.push(`/pos/${clientId}/entrega`)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/10"
          >
            🥡 Entrega
          </button>

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

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black">Pedidos Listos para Despachar</h2>
          <button
            onClick={loadOrders}
            className="px-4 py-2 rounded-xl bg-slate-855 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold transition flex items-center gap-2 text-sm"
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
            <span className="text-6xl block mb-4">📦</span>
            <p className="text-lg font-bold text-slate-400">No hay despachos pendientes</p>
            <p className="text-sm mt-1">Los pedidos pagados que requieren entrega en mesa/mostrador aparecerán aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => {
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
                          {order.tipo_orden === "mesa" ? `Mesa ${order.mesa_numero}` : `Mostrador ${order.cliente_nombre ? `(${order.cliente_nombre})` : ""}`}
                        </h3>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/25">
                        💳 Facturado
                      </span>
                    </div>

                    {/* Items detail list */}
                    <div className="space-y-2 my-4 border-t border-b border-slate-850 py-4">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-slate-300 font-semibold truncate max-w-[220px]">
                            {item.nombre}
                          </span>
                          <span className="bg-slate-850 text-slate-400 font-extrabold text-xs px-2 py-0.5 rounded">
                            x{item.cantidad}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.notas && (
                      <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl mb-4">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Notas del pedido</p>
                        <p className="text-xs text-amber-400/90 font-medium mt-0.5">{order.notas}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2">
                    <button
                      onClick={() => markAsDelivered(order.id)}
                      disabled={processingDelivery === order.id}
                      className="w-full py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition shadow-lg shadow-teal-500/10 flex items-center justify-center gap-1.5"
                    >
                      {processingDelivery === order.id ? (
                        "Despachando..."
                      ) : (
                        <>
                          <span>📦</span> Despachar / Entregar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
