"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin",
    tenant_id: "",
  });
  const [saving, setSaving] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.role) {
      setError("Todos los campos son requeridos");
      return;
    }

    if (formData.role === "admin" && !formData.tenant_id) {
      setError("Debes asignar un cliente para admins");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          tenant_id: formData.role === "superadmin" ? null : formData.tenant_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear usuario");

      await loadUsuarios();
      setShowForm(false);
      setFormData({ email: "", password: "", role: "admin", tenant_id: "" });
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) return;

    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");

      await loadUsuarios();
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    }
  }

  function getTenantName(tenantId) {
    return tenants.find((t) => t.id === tenantId)?.nombre || tenantId || "-";
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-blue-600 hover:text-blue-700">
              ← Atrás
            </Link>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
              👥 Gestión de Usuarios
            </h2>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Crea y gestiona usuarios administradores
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          ➕ Nuevo Usuario
        </button>
      </div>

      {/* Error mensaje */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                Nuevo Usuario
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl font-semibold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="usuario@ejemplo.com"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value,
                      tenant_id: e.target.value === "superadmin" ? "" : formData.tenant_id,
                    })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {formData.role === "admin" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Cliente Asignado
                  </label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) =>
                      setFormData({ ...formData, tenant_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="">Selecciona un cliente</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
                >
                  {saving ? "Creando..." : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="flex-1 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 disabled:opacity-50 text-zinc-900 dark:text-white px-4 py-2 rounded-lg font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      {loading ? (
        <div className="text-center py-16">
          <div className="text-zinc-500 dark:text-zinc-400">
            Cargando usuarios...
          </div>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👤</div>
          <div className="text-zinc-500 dark:text-zinc-400">
            No hay usuarios creados aún
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-200 dark:border-zinc-700">
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                  Rol
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                  Cliente
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr
                  key={usuario.id}
                  className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-zinc-900 dark:text-white">
                    {usuario.email}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        usuario.role === "superadmin"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {usuario.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {getTenantName(usuario.tenant_id)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                      title="Eliminar usuario"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
