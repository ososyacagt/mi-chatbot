"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function KDSPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId;
  const areaId = params.areaId;

  const [posUser, setPosUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [area, setArea] = useState(null);
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshInterval, setRefreshInterval] = useState(15000); // 15s default

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
    if (userObj.rol !== "cocina" && userObj.rol !== "supervisor") {
      router.push(`/pos/${clientId}`);
      return;
    }

    loadKDSConfig();
  }, [clientId, areaId]);

  // Polling for active orders
  useEffect(() => {
    if (!clientId || !areaId || !posUser) return;
    
    loadComandas();

    const interval = setInterval(() => {
      loadComandas();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [clientId, areaId, posUser, refreshInterval]);

  const loadKDSConfig = async () => {
    try {
      const res = await fetch(`/api/pos/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        const currentArea = data.areas.find(a => a.id === areaId);
        setArea(currentArea || { id: areaId, nombre: "Área Preparación" });
      }
    } catch (err) {
      console.error("[KDS] Error cargando configuración:", err);
    }
  };

  const loadComandas = async () => {
    try {
      // Fetch comandas for this area
      const res = await fetch(`/api/pos/${clientId}/comandas?areaId=${areaId}`);
      if (res.ok) {
        const data = await res.json();
        setComandas(data.comandas || []);
        setError("");
      } else {
        setError("Error al actualizar comandas");
      }
    } catch (err) {
      console.error("[KDS] Error fetching comandas:", err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (orderId, itemIndex, nextStatus) => {
    try {
      const res = await fetch(`/api/pos/${clientId}/comandas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          areaId,
          itemIndex,
          status: nextStatus
        })
      });

      if (res.ok) {
        // Optimize local state immediately for snappy UX
        setComandas(prev => prev.map(comanda => {
          if (comanda.orderId === orderId) {
            const updatedItems = [...comanda.items];
            if (updatedItems[itemIndex]) {
              updatedItems[itemIndex].status = nextStatus;
            }
            return { ...comanda, items: updatedItems };
          }
          return comanda;
        }));
        
        // Reload silently to fetch DB updates
        loadComandas();
      }
    } catch (err) {
      console.error("[KDS] Error updating status:", err);
    }
  };

  const updateAllItemsStatus = async (orderId, itemsList, nextStatus) => {
    try {
      // Loop over items and update them
      const promises = itemsList.map((item, index) => {
        return fetch(`/api/pos/${clientId}/comandas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            areaId,
            itemIndex: index,
            status: nextStatus
          })
        });
      });

      await Promise.all(promises);
      loadComandas();
    } catch (err) {
      console.error("[KDS] Error updating all statuses:", err);
    }
  };

  if (loading || !config || !posUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium animate-pulse">Cargando Cocina...</p>
      </div>
    );
  }

  // Filter items in comanda by state for the Kanban columns
  // States: 'ingresada', 'recibida', 'en_proceso', 'lista' (or 'listo')
  const getComandasByState = (state) => {
    return comandas.filter(comanda => {
      // A comanda card is shown in a column if at least one item matches this status.
      // Or we can list individual items. Listing by order card is standard, where items are shown inside the order card.
      // If a card contains multiple items, the card's column is determined by the minimum state of its items,
      // so we prepare things in order.
      // Let's check:
      const statuses = comanda.items.map(i => i.status || "ingresada");
      if (state === "ingresada") {
        return statuses.includes("ingresada") && !statuses.includes("recibida") && !statuses.includes("en_proceso");
      }
      if (state === "recibida") {
        return statuses.includes("recibida") && !statuses.includes("en_proceso");
      }
      if (state === "en_proceso") {
        return statuses.includes("en_proceso");
      }
      if (state === "lista" || state === "listo") {
        return statuses.every(s => s === "lista" || s === "listo");
      }
      return false;
    });
  };

  const columns = [
    { id: "ingresada", title: "📥 Ingresadas", color: "border-t-blue-500 bg-blue-500/5", nextStatus: "recibida", nextLabel: "Recibir" },
    { id: "recibida", title: "✓ Recibidas", color: "border-t-purple-500 bg-purple-500/5", nextStatus: "en_proceso", nextLabel: "Preparar" },
    { id: "en_proceso", title: "🍳 En Proceso", color: "border-t-amber-500 bg-amber-500/5", nextStatus: "lista", nextLabel: "Terminar" },
    { id: "lista", title: "✅ Listas", color: "border-t-green-500 bg-green-500/5", nextStatus: null, nextLabel: null }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🍳</span>
          <div>
            <h1 className="text-lg font-black tracking-tight">{area?.nombre || "Cocina / KDS"}</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pantalla de Preparación</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {error && <span className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">{error}</span>}
          
          <button
            onClick={loadComandas}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center gap-2 text-sm border border-slate-750"
          >
            🔄 Actualizar
          </button>

          {posUser.rol === "supervisor" && (
            <button
              onClick={() => router.push(`/pos/${clientId}`)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Regresar al POS
            </button>
          )}

          <div className="text-right hidden sm:block">
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

      {/* Kanban Grid */}
      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden h-[calc(100vh-80px)]">
        {columns.map(col => {
          const colComandas = getComandasByState(col.id);
          
          return (
            <div key={col.id} className={`flex flex-col h-full rounded-2xl border border-slate-800/80 border-t-4 ${col.color}`}>
              {/* Column Header */}
              <div className="p-4 border-b border-slate-850 flex justify-between items-center bg-slate-900/40">
                <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">{col.title}</h3>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-black text-slate-400">
                  {colComandas.length}
                </span>
              </div>

              {/* Column Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colComandas.map(comanda => {
                  const minutesElapsed = Math.floor(comanda.tiempoTranscurrido / 60);
                  const isUrgent = minutesElapsed >= 15 && col.id !== "lista";
                  
                  return (
                    <div
                      key={`${comanda.orderId}-${col.id}`}
                      className={`p-4 rounded-xl bg-slate-900 border transition-all duration-300 ${
                        isUrgent
                          ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-pulse"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Card Top */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div>
                          <p className="text-xs font-black text-slate-500 tracking-wider">#{comanda.numeroOrden}</p>
                          <h4 className="font-black text-base text-slate-100 mt-0.5">
                            {comanda.mesa ? `Mesa ${comanda.mesa}` : "Para Llevar / Kiosco"}
                            {comanda.clienteNombre && comanda.clienteNombre !== "Mostrador" && (
                              <span className="block text-xs font-bold text-blue-400 mt-0.5">👤 {comanda.clienteNombre}</span>
                            )}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            isUrgent ? "bg-red-500/10 text-red-400" : "bg-slate-850 text-slate-400"
                          }`}>
                            ⏱️ {minutesElapsed}m
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-3 border-t border-b border-slate-850 py-3 my-3">
                        {comanda.items.map((item, idx) => {
                          const isItemDone = item.status === "lista" || item.status === "listo";
                          return (
                            <div key={idx} className="border-b border-slate-850/40 last:border-b-0 pb-3 mb-1 last:pb-0 last:mb-0">
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="bg-slate-800 text-slate-300 font-extrabold text-xs px-2 py-0.5 rounded flex-shrink-0 mt-0.5">
                                    {item.cantidad}x
                                  </span>
                                  <span className={`text-sm font-bold text-slate-100 leading-tight ${
                                    isItemDone ? "line-through text-slate-600" : ""
                                  }`}>
                                    {item.nombre}
                                  </span>
                                </div>
                                
                                {/* Advance individual item status */}
                                {col.nextStatus && (
                                  <button
                                    onClick={() => updateItemStatus(comanda.orderId, idx, col.nextStatus)}
                                    className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-1 rounded border border-slate-700/60 font-bold transition flex-shrink-0 whitespace-nowrap"
                                  >
                                    {col.nextLabel}
                                  </button>
                                )}
                              </div>

                              {/* Observations (Notes) rendered fully underneath */}
                              {item.notas && (
                                <div className="mt-2 ml-8 bg-amber-500/5 border border-amber-500/20 px-3 py-2 rounded-xl text-xs text-amber-300 leading-normal break-words font-semibold shadow-inner">
                                  <span className="font-extrabold text-amber-450/90 text-[9px] block uppercase tracking-widest mb-1">📝 Observaciones:</span>
                                  {item.notas}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Card Actions */}
                      {col.nextStatus && (
                        <button
                          onClick={() => updateAllItemsStatus(comanda.orderId, comanda.items, col.nextStatus)}
                          className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 hover:border-slate-600 font-bold text-xs transition flex items-center justify-center gap-1.5"
                        >
                          ⚡ {col.nextLabel} Todo
                        </button>
                      )}
                    </div>
                  );
                })}

                {colComandas.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-slate-700">
                    <span className="text-3xl block mb-1">📭</span>
                    <span className="text-xs font-semibold uppercase tracking-wider">Vacío</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
