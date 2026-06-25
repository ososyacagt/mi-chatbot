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
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialComandas, setHistorialComandas] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

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
        console.log('[KDS] Primer comanda recibida:', data.comandas?.[0]);
        console.log('[KDS] createdAt:', data.comandas?.[0]?.createdAt);
        console.log('[KDS] tiempoTranscurrido:', data.comandas?.[0]?.tiempoTranscurrido);
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

  const loadHistorial = async () => {
    try {
      setLoadingHistorial(true);
      const res = await fetch(`/api/pos/${clientId}/comandas/completed?areaId=${areaId}`);
      if (res.ok) {
        const data = await res.json();
        setHistorialComandas(data.comandas || []);
      }
    } catch (err) {
      console.error("[KDS] Error fetching historial:", err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const getTimerLabel = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 60) return `${diffMin}m`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours}h ${mins}m`;
  };

  const getTimerColor = (createdAt) => {
    const diffMin = Math.floor((new Date() - new Date(createdAt)) / 60000);
    if (diffMin < 10) return 'text-green-400';
    if (diffMin < 20) return 'text-yellow-400';
    return 'text-red-400';
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
            onClick={() => {
              setShowHistorial(true);
              loadHistorial();
            }}
            className="p-2.5 rounded-xl bg-amber-800/40 hover:bg-amber-800/60 border border-amber-700/50 text-amber-300 font-bold transition flex items-center gap-2 text-sm"
          >
            📋 Ver completadas
          </button>

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
                  const timerLabel = getTimerLabel(comanda.createdAt);
                  const timerColor = getTimerColor(comanda.createdAt);
                  const minutesElapsed = Math.floor((new Date() - new Date(comanda.createdAt)) / 60000);
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
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-slate-850 ${timerColor}`}>
                            ⏱️ {timerLabel}
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

      {/* Historial Modal */}
      {showHistorial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="bg-slate-800/80 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-lg font-black text-white">Órdenes Completadas</h2>
                  <p className="text-xs text-slate-400 font-semibold">Hoy - {area?.nombre || "Área"}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistorial(false)}
                className="text-slate-400 hover:text-slate-300 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingHistorial ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-slate-400">Cargando historial...</div>
                </div>
              ) : historialComandas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                  <span className="text-4xl mb-2">📭</span>
                  <p className="text-sm font-semibold">Sin órdenes completadas hoy</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {historialComandas.map(comanda => (
                    <div key={comanda.orderId} className="bg-slate-850 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs font-black text-slate-500 tracking-wider">#{comanda.numeroOrden}</p>
                          <h4 className="font-bold text-base text-slate-100 mt-1">
                            {comanda.mesa ? `Mesa ${comanda.mesa}` : "Para Llevar"}
                          </h4>
                          {comanda.clienteNombre && comanda.clienteNombre !== "Mostrador" && (
                            <p className="text-xs text-blue-400 font-bold mt-1">👤 {comanda.clienteNombre}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-green-500/10 text-green-400">
                            ✓ Completada
                          </span>
                          <p className="text-xs text-slate-500 font-semibold mt-2">
                            {new Date(comanda.updatedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="border-t border-slate-700 pt-3 space-y-2">
                        {comanda.items.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className="bg-slate-700 text-slate-300 font-bold text-xs px-1.5 py-0.5 rounded flex-shrink-0">
                              {item.cantidad}x
                            </span>
                            <span className="text-slate-300 line-through">{item.nombre}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
