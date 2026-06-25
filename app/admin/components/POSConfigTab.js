"use client";

import { useEffect, useState } from "react";

export default function POSConfigTab({ clientId, planInfo }) {
  const [areas, setAreas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Formulario de área
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaForm, setAreaForm] = useState({
    nombre: "",
    tipo: "cocina",
    color: "#000000"
  });

  // Formulario de mesa
  const [showMesaModal, setShowMesaModal] = useState(false);
  const [mesaForm, setMesaForm] = useState({
    numero: "",
    nombre: "",
    capacidad: 4
  });

  useEffect(() => {
    loadPOSConfig();
  }, [clientId]);

  const loadPOSConfig = async () => {
    try {
      setLoading(true);
      const [areasRes, mesasRes] = await Promise.all([
        fetch(`/api/admin/inventory/areas?clientId=${clientId}`),
        fetch(`/api/admin/inventory/mesas?clientId=${clientId}`)
      ]);

      if (areasRes.ok) {
        const data = await areasRes.json();
        setAreas(data.areas || []);
      }
      if (mesasRes.ok) {
        const data = await mesasRes.json();
        setMesas(data.mesas || []);
      }
    } catch (err) {
      console.error("[POSConfig] Error cargando:", err);
      setToast({ message: "✗ Error al cargar configuración", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArea = async () => {
    if (!areaForm.nombre || !areaForm.tipo) {
      setToast({ message: "✗ Completa todos los campos", type: "error" });
      return;
    }

    try {
      const res = await fetch(`/api/admin/inventory/areas?clientId=${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(areaForm)
      });

      if (res.ok) {
        setToast({ message: "✓ Área creada", type: "success" });
        setShowAreaModal(false);
        setAreaForm({ nombre: "", tipo: "cocina", color: "#000000" });
        await loadPOSConfig();
      }
    } catch (err) {
      console.error("[POSConfig] Error creando área:", err);
      setToast({ message: "✗ Error al crear área", type: "error" });
    }
  };

  const handleCreateMesa = async () => {
    if (mesaForm.numero === undefined || mesaForm.numero === null || mesaForm.numero === "") {
      setToast({ message: "✗ El número de mesa es requerido", type: "error" });
      return;
    }

    try {
      console.log('[POSConfig] Creando mesa:', mesaForm);
      const res = await fetch(`/api/admin/inventory/mesas?clientId=${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mesaForm)
      });

      if (res.ok) {
        setToast({ message: "✓ Mesa creada", type: "success" });
        setShowMesaModal(false);
        setMesaForm({ numero: "", nombre: "", capacidad: 4 });
        await loadPOSConfig();
      } else {
        const error = await res.json();
        setToast({ message: "✗ Error: " + error.error, type: "error" });
      }
    } catch (err) {
      console.error("[POSConfig] Error creando mesa:", err);
      setToast({ message: "✗ Error al crear mesa", type: "error" });
    }
  };

  const handleDeleteMesa = async (mesaId) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta mesa?")) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/inventory/mesas/${mesaId}?clientId=${clientId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setToast({ message: "✓ Mesa eliminada", type: "success" });
        setMesas(mesas.filter((m) => m.id !== mesaId));
      } else {
        const error = await res.json();
        setToast({ message: "✗ Error: " + error.error, type: "error" });
      }
    } catch (err) {
      console.error("[POSConfig] Error eliminando mesa:", err);
      setToast({ message: "✗ Error al eliminar mesa", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Áreas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">🍳 Áreas de Preparación</h3>
          <button
            onClick={() => setShowAreaModal(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            + Nueva área
          </button>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          {areas.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin áreas configuradas</p>
          ) : (
            areas.map((area) => (
              <div key={area.id} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: area.color }}
                  />
                  <div>
                    <div className="font-medium">{area.nombre}</div>
                    <div className="text-xs text-slate-500">{area.tipo}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Implementar delete después si es necesario
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mesas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">📋 Mesas</h3>
          <button
            onClick={() => setShowMesaModal(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            + Nueva mesa
          </button>
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {mesas.length === 0 ? (
              <p className="text-slate-500 text-sm col-span-full">Sin mesas configuradas</p>
            ) : (
              mesas.map((mesa) => (
                <div
                  key={mesa.id}
                  className="relative bg-white border rounded-lg p-4 text-center hover:bg-slate-50"
                >
                  <button
                    onClick={() => handleDeleteMesa(mesa.id)}
                    className="absolute top-1 right-1 text-red-400 hover:text-red-600 text-lg w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50"
                    title="Eliminar mesa"
                  >
                    ×
                  </button>
                  <div className="font-bold text-lg">{mesa.numero}</div>
                  {mesa.nombre && (
                    <div className="text-xs text-slate-500">{mesa.nombre}</div>
                  )}
                  <div className="text-xs text-slate-400">Cap: {mesa.capacidad}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal crear área */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nueva Área</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={areaForm.nombre}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, nombre: e.target.value })
                  }
                  placeholder="ej: Cocina, Bar, Pastelería"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo
                </label>
                <select
                  value={areaForm.tipo}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, tipo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="cocina">🍳 Cocina</option>
                  <option value="bar">🍹 Bar</option>
                  <option value="pasteleria">🎂 Pastelería</option>
                  <option value="delivery">🚚 Delivery</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={areaForm.color}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, color: e.target.value })
                  }
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4 mt-4">
              <button
                onClick={() => setShowAreaModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateArea}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear mesa */}
      {showMesaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nueva Mesa</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Número de mesa
                </label>
                <input
                  type="number"
                  value={mesaForm.numero}
                  onChange={(e) =>
                    setMesaForm({ ...mesaForm, numero: parseInt(e.target.value) || "" })
                  }
                  placeholder="ej: 1, 2, 3..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={mesaForm.nombre}
                  onChange={(e) =>
                    setMesaForm({ ...mesaForm, nombre: e.target.value })
                  }
                  placeholder="ej: Ventana, Terraza..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Capacidad
                </label>
                <input
                  type="number"
                  value={mesaForm.capacidad}
                  onChange={(e) =>
                    setMesaForm({ ...mesaForm, capacidad: parseInt(e.target.value) || 4 })
                  }
                  min="1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4 mt-4">
              <button
                onClick={() => setShowMesaModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMesa}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.message && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white text-sm font-medium ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
