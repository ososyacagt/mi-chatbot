"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmModal from "../components/ConfirmModal";

function getInitial(email) {
  return email?.charAt(0).toUpperCase() || "?";
}

function getBgColorForRole(role) {
  return role === "superadmin"
    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
}

function getAvatarColorForRole(role) {
  return role === "superadmin"
    ? "bg-purple-500 text-white"
    : "bg-blue-500 text-white";
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin",
    tenant_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Eliminar",
    onConfirm: null,
    type: "danger",
  });

  useEffect(() => {
    loadUsuarios();
    loadTenants();
  }, []);

  async function loadUsuarios() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/usuarios");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al cargar usuarios");
      setUsuarios(data.usuarios || []);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTenants() {
    try {
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();
      if (res.ok) {
        setTenants(data.tenants || []);
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  function handleNew() {
    setEditingId(null);
    setFormData({ email: "", password: "", role: "admin", tenant_ids: [] });
    setShowForm(true);
  }

  function handleEdit(usuario) {
    setEditingId(usuario.id);
    setFormData({
      email: usuario.email,
      password: "",
      role: usuario.role,
      tenant_ids: usuario.tenant_ids || [],
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.email || !formData.role) {
      setError("Email y rol son requeridos");
      return;
    }

    if (!editingId && !formData.password) {
      setError("Contraseña es requerida para nuevo usuario");
      return;
    }

    if (formData.role === "admin" && formData.tenant_ids.length === 0) {
      setError("Debes asignar al menos un cliente para admins");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = editingId
        ? `/api/admin/usuarios/${editingId}`
        : "/api/admin/usuarios";
      const method = editingId ? "PUT" : "POST";

      const body = {
        email: formData.email,
        role: formData.role,
        tenant_ids: formData.role === "superadmin" ? [] : formData.tenant_ids,
      };

      if (formData.password) {
        body.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar usuario");

      await loadUsuarios();
      setShowForm(false);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick(id, email) {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar usuario "${email}"?`,
      message: "Esta acción no se puede deshacer. El usuario perderá acceso a todos los clientes.",
      confirmText: "Eliminar",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/usuarios/${id}`, {
            method: "DELETE",
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Error al eliminar");

          await loadUsuarios();
          setConfirmModal({ isOpen: false });
        } catch (err) {
          console.error("Error:", err);
          setError(err.message);
          setConfirmModal({ isOpen: false });
        }
      },
    });
  }

  function getTenantNames(tenantIds) {
    if (!tenantIds || tenantIds.length === 0) return [];
    return tenantIds
      .map((id) => tenants.find((t) => t.id === id)?.nombre)
      .filter(Boolean);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Volver al panel"
              >
                ←
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                  👥 Gestión de usuarios
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={handleNew}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              <span>+</span> Nuevo usuario
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-16">
            <div className="text-zinc-500 dark:text-zinc-400">
              Cargando usuarios...
            </div>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👤</div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              No hay usuarios creados aún
            </p>
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              <span>+</span> Crear primer usuario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {usuarios.map((usuario) => (
              <div
                key={usuario.id}
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 relative group"
              >
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(usuario)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteClick(usuario.id, usuario.email)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>

                {/* User info */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${getAvatarColorForRole(
                      usuario.role
                    )}`}
                  >
                    {getInitial(usuario.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {usuario.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBgColorForRole(
                          usuario.role
                        )}`}
                      >
                        {usuario.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clients */}
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    Clientes:
                  </p>
                  {usuario.role === "superadmin" ? (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Todos los clientes
                    </p>
                  ) : usuario.tenant_ids && usuario.tenant_ids.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {getTenantNames(usuario.tenant_ids).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                      Ninguno asignado
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editingId ? "Editar usuario" : "Nuevo usuario"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl font-semibold transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={
                      editingId
                        ? "Dejar vacío para no cambiar"
                        : "••••••••"
                    }
                    className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value,
                      tenant_ids:
                        e.target.value === "superadmin"
                          ? []
                          : formData.tenant_ids,
                    })
                  }
                  className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {formData.role === "admin" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                    Clientes asignados
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {tenants.map((tenant) => (
                      <label
                        key={tenant.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.tenant_ids.includes(tenant.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                tenant_ids: [
                                  ...formData.tenant_ids,
                                  tenant.id,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                tenant_ids: formData.tenant_ids.filter(
                                  (id) => id !== tenant.id
                                ),
                              });
                            }
                          }}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {tenant.nombre}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {tenant.client_id}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={() => {
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
        }}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </main>
  );
}
