"use client";

import { useEffect, useState } from "react";
import ConfirmModal from "./ConfirmModal";

const ROL_LABELS = {
  mesero: "Mesero",
  cajero: "Cajero",
  cocina: "Personal de Preparación (Cocina, Bar, etc.)",
  entrega: "Operador de Entrega",
  operador: "Mostrador / Operador",
  supervisor: "Supervisor"
};

export default function POSConfigTab({ clientId, planInfo }) {
  const [areas, setAreas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

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

  // Formulario de usuario POS
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    nombre: "",
    rol: "mesero",
    pin: "",
    areaId: ""
  });

  useEffect(() => {
    loadPOSConfig();
  }, [clientId]);

  const loadPOSConfig = async () => {
    try {
      setLoading(true);
      const [areasRes, mesasRes, usersRes] = await Promise.all([
        fetch(`/api/admin/inventory/areas?clientId=${clientId}`),
        fetch(`/api/admin/inventory/mesas?clientId=${clientId}`),
        fetch(`/api/admin/pos-users?clientId=${clientId}`)
      ]);

      if (areasRes.ok) {
        const data = await areasRes.json();
        setAreas(data.areas || []);
      }
      if (mesasRes.ok) {
        const data = await mesasRes.json();
        setMesas(data.mesas || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
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

  const handleSaveUser = async () => {
    if (!userForm.nombre || !userForm.rol) {
      setToast({ message: "✗ Nombre y rol son requeridos", type: "error" });
      return;
    }
    if (!editingUser && !userForm.pin) {
      setToast({ message: "✗ El PIN es requerido para nuevos usuarios", type: "error" });
      return;
    }

    try {
      const url = editingUser
        ? `/api/admin/pos-users/${editingUser.id}`
        : `/api/admin/pos-users`;
      const method = editingUser ? "PUT" : "POST";
      const payload = {
        clientId,
        nombre: userForm.nombre,
        rol: userForm.rol,
        areaId: userForm.rol === "cocina" ? userForm.areaId : null,
        pin: userForm.pin || undefined,
        activo: userForm.activo !== false
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setToast({ message: editingUser ? "✓ Usuario actualizado" : "✓ Usuario creado", type: "success" });
        setShowUserModal(false);
        setEditingUser(null);
        setUserForm({ nombre: "", rol: "mesero", pin: "", areaId: "" });
        await loadPOSConfig();
      } else {
        const error = await res.json();
        setToast({ message: "✗ Error: " + error.error, type: "error" });
      }
    } catch (err) {
      console.error("[POSConfig] Error guardando usuario:", err);
      setToast({ message: "✗ Error al guardar usuario", type: "error" });
    }
  };

  const handleDeleteMesa = async (mesaId) => {
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

  const handleDeleteArea = async (areaId) => {
    try {
      const res = await fetch(
        `/api/admin/inventory/areas/${areaId}?clientId=${clientId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setToast({ message: "✓ Área eliminada", type: "success" });
        setAreas(areas.filter((a) => a.id !== areaId));
      } else {
        const error = await res.json();
        setToast({ message: "✗ Error: " + error.error, type: "error" });
      }
    } catch (err) {
      console.error("[POSConfig] Error eliminando área:", err);
      setToast({ message: "✗ Error al eliminar área", type: "error" });
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const res = await fetch(`/api/admin/pos-users/${userId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setToast({ message: "✓ Usuario desactivado", type: "success" });
        await loadPOSConfig();
      } else {
        const error = await res.json();
        setToast({ message: "✗ Error: " + error.error, type: "error" });
      }
    } catch (err) {
      console.error("[POSConfig] Error desactivando usuario:", err);
      setToast({ message: "✗ Error al desactivar usuario", type: "error" });
    }
  };

  const handlePermanentDeleteUser = async (userId) => {
    try {
      const res = await fetch(`/api/admin/pos-users/${userId}?hard=true`, {
        method: "DELETE"
      });

      if (res.ok) {
        setToast({ message: "✓ Usuario eliminado permanentemente", type: "success" });
        await loadPOSConfig();
      } else {
        const error = await res.json();
        setToast({ message: "✗ " + error.error, type: "error" });
      }
    } catch (err) {
      console.error("[POSConfig] Error eliminando usuario:", err);
      setToast({ message: "✗ Error al eliminar usuario", type: "error" });
    }
  };

  const openConfirmDelete = (tipo, id, nombre) => {
    setConfirmModal({
      isOpen: true,
      title: tipo === "area" 
        ? "¿Eliminar área?" 
        : (tipo === "mesa" 
          ? "¿Eliminar mesa?" 
          : (tipo === "user" 
            ? "¿Desactivar usuario?" 
            : "¿Eliminar usuario definitivamente?")),
      message: tipo === "user"
        ? `Se desactivará al usuario "${nombre}". No se eliminará del historial de órdenes, pero no podrá iniciar sesión.`
        : (tipo === "user-hard"
          ? `Se eliminará permanentemente al usuario "${nombre}". Esta acción no se puede deshacer y fallará si el usuario ya tiene órdenes registradas en el sistema.`
          : `Se eliminará "${nombre}". Esta acción no se puede deshacer.`),
      onConfirm: () => {
        if (tipo === "area") {
          handleDeleteArea(id);
        } else if (tipo === "mesa") {
          handleDeleteMesa(id);
        } else if (tipo === "user") {
          handleDeleteUser(id);
        } else if (tipo === "user-hard") {
          handlePermanentDeleteUser(id);
        }
        setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null });
      },
    });
  };

  const startEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      nombre: user.nombre,
      rol: user.rol,
      pin: "", // leave blank if no change
      areaId: user.area_id || "",
      activo: user.activo
    });
    setShowUserModal(true);
  };

  const startCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      nombre: "",
      rol: "mesero",
      pin: "",
      areaId: areas.length > 0 ? areas[0].id : "",
      activo: true
    });
    setShowUserModal(true);
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
        <p className="text-slate-600">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* POS Users */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">👥 Usuarios del POS</h3>
          <button
            onClick={startCreateUser}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
          >
            + Nuevo usuario
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-5">
          {users.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Sin usuarios registrados para el POS</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => {
                const userArea = areas.find((a) => a.id === user.area_id);
                return (
                  <div
                    key={user.id}
                    className={`bg-white p-4 rounded-xl border flex flex-col justify-between gap-4 transition shadow-sm hover:shadow ${
                      user.activo ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-100/50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {user.nombre}
                          {!user.activo && (
                            <span className="text-[10px] bg-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {ROL_LABELS[user.rol] || user.rol}
                        </div>
                        {user.rol === "cocina" && (
                          <div className="text-xs text-blue-600 font-semibold mt-1">
                            🍳 Área: {userArea ? userArea.nombre : "Sin asignar"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        onClick={() => startEditUser(user)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded"
                      >
                        Editar
                      </button>
                      {user.activo ? (
                        <button
                          onClick={() => openConfirmDelete("user", user.id, user.nombre)}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 px-2 py-1 rounded"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold px-2 py-1 select-none">
                          Inactivo
                        </span>
                      )}
                      <button
                        onClick={() => openConfirmDelete("user-hard", user.id, user.nombre)}
                        className="text-xs font-bold text-red-500 hover:text-red-650 px-2 py-1 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Áreas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">🍳 Áreas de Preparación (KDS)</h3>
          <button
            onClick={() => setShowAreaModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
          >
            + Nueva área
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 space-y-2">
          {areas.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Sin áreas configuradas</p>
          ) : (
            areas.map((area) => (
              <div key={area.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-lg"
                    style={{ backgroundColor: area.color }}
                  />
                  <div>
                    <div className="font-bold text-slate-800">{area.nombre}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{area.tipo}</div>
                  </div>
                </div>
                <button
                  onClick={() => openConfirmDelete("area", area.id, area.nombre)}
                  className="text-red-500 hover:text-red-700 p-2 text-lg"
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
          <h3 className="text-lg font-bold text-slate-800">📋 Mesas (Salón)</h3>
          <button
            onClick={() => setShowMesaModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
          >
            + Nueva mesa
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {mesas.length === 0 ? (
              <p className="text-slate-500 text-sm text-center col-span-full py-6">Sin mesas configuradas</p>
            ) : (
              mesas.map((mesa) => (
                <div
                  key={mesa.id}
                  className="relative bg-white border border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 shadow-sm transition"
                >
                  <button
                    onClick={() => openConfirmDelete("mesa", mesa.id, `Mesa ${mesa.numero}`)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-lg w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50"
                    title="Eliminar mesa"
                  >
                    ×
                  </button>
                  <div className="font-black text-slate-800 text-xl">{mesa.numero}</div>
                  {mesa.nombre && (
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{mesa.nombre}</div>
                  )}
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Cap: {mesa.capacidad} pax</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal crear/editar usuario */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleUp">
            <h2 className="text-xl font-black text-slate-800 mb-4">
              {editingUser ? "Editar Usuario POS" : "Nuevo Usuario POS"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={userForm.nombre}
                  onChange={(e) =>
                    setUserForm({ ...userForm, nombre: e.target.value })
                  }
                  placeholder="ej: Juan Pérez"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rol POS
                </label>
                <select
                  value={userForm.rol}
                  onChange={(e) =>
                    setUserForm({ ...userForm, rol: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                >
                  <option value="mesero">📋 Mesero</option>
                  <option value="cajero">💵 Cajero</option>
                  <option value="cocina">🍳 Personal de Preparación (Cocina, Bar, etc.)</option>
                  <option value="entrega">🥡 Operador Entrega</option>
                  <option value="operador">🏪 Mostrador / Operador</option>
                  <option value="supervisor">👑 Supervisor</option>
                </select>
              </div>

              {userForm.rol === "cocina" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Área de Preparación Asignada
                  </label>
                  <select
                    value={userForm.areaId}
                    onChange={(e) =>
                      setUserForm({ ...userForm, areaId: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Selecciona una área --</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  PIN numérico (4-6 dígitos)
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={userForm.pin}
                  onChange={(e) =>
                    setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, "") })
                  }
                  placeholder={editingUser ? "Dejar en blanco para no cambiar" : "ej: 1234"}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 font-mono tracking-widest text-lg"
                />
              </div>

              {editingUser && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="user-activo"
                    checked={userForm.activo}
                    onChange={(e) => setUserForm({ ...userForm, activo: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="user-activo" className="text-sm font-semibold text-slate-700">
                    Usuario Activo (Permite login)
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end border-t pt-4 mt-6">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 font-bold text-sm text-slate-500 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition"
              >
                {editingUser ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear área */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleUp">
            <h2 className="text-xl font-black text-slate-800 mb-4">Nueva Área</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={areaForm.nombre}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, nombre: e.target.value })
                  }
                  placeholder="ej: Cocina, Bar, Pastelería"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tipo
                </label>
                <select
                  value={areaForm.tipo}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, tipo: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                >
                  <option value="cocina">🍳 Cocina</option>
                  <option value="bar">🍹 Bar</option>
                  <option value="pasteleria">🎂 Pastelería</option>
                  <option value="delivery">🚚 Delivery</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={areaForm.color}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, color: e.target.value })
                  }
                  className="w-full h-10 rounded-xl cursor-pointer border border-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4 mt-6">
              <button
                onClick={() => setShowAreaModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 font-bold text-sm text-slate-500 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateArea}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear mesa */}
      {showMesaModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleUp">
            <h2 className="text-xl font-black text-slate-800 mb-4">Nueva Mesa</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Número de mesa
                </label>
                <input
                  type="number"
                  value={mesaForm.numero}
                  onChange={(e) =>
                    setMesaForm({ ...mesaForm, numero: parseInt(e.target.value) || "" })
                  }
                  placeholder="ej: 1, 2, 3..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={mesaForm.nombre}
                  onChange={(e) =>
                    setMesaForm({ ...mesaForm, nombre: e.target.value })
                  }
                  placeholder="ej: Ventana, Terraza..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Capacidad (Personas)
                </label>
                <input
                  type="number"
                  value={mesaForm.capacidad}
                  onChange={(e) =>
                    setMesaForm({ ...mesaForm, capacidad: parseInt(e.target.value) || 4 })
                  }
                  min="1"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4 mt-6">
              <button
                onClick={() => setShowMesaModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 font-bold text-sm text-slate-500 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateMesa}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null })}
      />

      {toast.message && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all duration-300 z-50 ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
