"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

export default function CocinaPage() {
  const params = useParams();
  const clientId = params.clientId;
  const areaId = params.areaId;

  const [area, setArea] = useState(null);
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    loadComandas();

    // Actualizar reloj cada segundo
    const timeInterval = setInterval(() => setTime(new Date()), 1000);

    // Poll de comandas cada 3 segundos
    pollIntervalRef.current = setInterval(loadComandas, 3000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(pollIntervalRef.current);
    };
  }, [clientId, areaId]);

  const loadComandas = async () => {
    try {
      const res = await fetch(
        `/api/pos/${clientId}/comandas?areaId=${areaId}&status=pendiente`
      );
      if (res.ok) {
        const data = await res.json();
        setComandas(data.comandas || []);
      }
    } catch (err) {
      console.error("[Cocina] Error cargando comandas:", err);
    } finally {
      setLoading(false);
    }
  };

  const marcarItemListo = async (comanda, itemIdx) => {
    try {
      await fetch(`/api/pos/${clientId}/comandas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: comanda.orderId,
          areaId: areaId,
          itemIndex: itemIdx,
          status: "listo"
        })
      });
      await loadComandas();
    } catch (err) {
      console.error("[Cocina] Error marcando item listo:", err);
    }
  };

  const getColorPorTiempo = (segundos) => {
    if (segundos < 600) return "bg-green-900"; // < 10min
    if (segundos < 1200) return "bg-yellow-900"; // < 20min
    return "bg-red-900"; // > 20min
  };

  const getTextColorPorTiempo = (segundos) => {
    if (segundos < 600) return "text-green-400";
    if (segundos < 1200) return "text-yellow-400";
    return "text-red-400";
  };

  const formatearTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-center">
        <h1 className="text-4xl font-bold">🍳 Cocina</h1>
        <div className="text-3xl font-bold font-mono">
          {time.toLocaleTimeString()}
        </div>
      </div>

      {/* Grid de comandas */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
        {comandas.length === 0 ? (
          <div className="col-span-full flex items-center justify-center min-h-96">
            <div className="text-2xl text-slate-500">✓ Sin comandas pendientes</div>
          </div>
        ) : (
          comandas.map((comanda, idx) => (
            <div
              key={idx}
              className={`${getColorPorTiempo(comanda.tiempoTranscurrido)} rounded-lg p-4 border-2 border-slate-600`}
            >
              {/* Header de comanda */}
              <div className="mb-4 pb-3 border-b border-slate-600">
                <div className="text-sm text-slate-300">
                  Orden #{comanda.numeroOrden.substring(0, 12)}
                </div>
                <div className="font-bold text-lg">
                  {comanda.mesa ? `Mesa ${comanda.mesa}` : comanda.clienteNombre}
                </div>
                <div className={`text-2xl font-bold ${getTextColorPorTiempo(comanda.tiempoTranscurrido)}`}>
                  {formatearTiempo(comanda.tiempoTranscurrido)}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {comanda.items?.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className={`p-2 rounded border-2 ${
                      item.status === "listo"
                        ? "bg-slate-700/50 border-slate-600 line-through opacity-60"
                        : "bg-slate-700 border-slate-600"
                    }`}
                  >
                    <button
                      onClick={() => marcarItemListo(comanda, itemIdx)}
                      disabled={item.status === "listo"}
                      className="w-full text-left font-bold text-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div>{item.nombre}</div>
                          <div className="text-sm text-slate-300">
                            Cantidad: {item.cantidad}
                          </div>
                          {item.notas && (
                            <div className="text-xs text-yellow-400 mt-1">
                              📝 {item.notas}
                            </div>
                          )}
                        </div>
                        <div className="text-2xl">
                          {item.status === "listo" ? "✓" : "→"}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>

              {/* Botón todo listo */}
              <button
                onClick={() => {
                  // Marcar todos como listos
                  comanda.items?.forEach((_, idx) => marcarItemListo(comanda, idx));
                }}
                className="w-full mt-4 py-3 bg-green-600 hover:bg-green-700 rounded font-bold text-lg transition"
              >
                ✓ TODO LISTO
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
