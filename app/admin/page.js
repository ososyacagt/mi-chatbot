"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TenantForm from "./components/TenantForm";
import DocumentsSection from "./components/DocumentsSection";
import ConfirmModal from "./components/ConfirmModal";

export default function AdminPanel() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [escalationCounts, setEscalationCounts] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Eliminar",
    onConfirm: null,
    type: "danger",
  });

  // Carga usuario y lista de tenants
  useEffect(() => {
    loadUser();
    loadTenants();
  }, []);

  async function loadUser() {
    try {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      if (res.ok) {
        setUser(data);
      }
    } catch (err) {
      console.error("Error cargando usuario:", err);
    }
  }

  async function loadEscalationsForTenant(clientId) {
    try {
      const res = await fetch(`/api/admin/escalations?clientId=${clientId}&status=pending`);
      if (res.ok) {
        const data = await res.json();
        setEscalationCounts((prev) => ({
          ...prev,
          [clientId]: data.escalations?.length || 0,
        }));
      }
    } catch (err) {
      console.error(`Error cargando escalaciones para ${clientId}:`, err);
    }
  }

  async function loadTenants() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar clientes");
      }

      const loadedTenants = data.tenants || [];
      setTenants(loadedTenants);

      // Cargar escalaciones pendientes por cada cliente
      for (const tenant of loadedTenants) {
        await loadEscalationsForTenant(tenant.client_id);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(formData) {
    try {
      setSaving(true);
      setError(null);

      const isEditing = !!editingTenant;
      const url = isEditing
        ? `/api/admin/tenants/${editingTenant.client_id}`
        : "/api/admin/tenants";
      const method = isEditing ? "PUT" : "POST";

      console.log("[handleSave] isEditing:", isEditing);
      console.log("[handleSave] editingTenant.client_id:", editingTenant?.client_id);
      console.log("[handleSave] URL:", url);
      console.log("[handleSave] formData:", formData);

      // Convertir camelCase a snake_case para el API
      const apiData = {
        client_id: formData.client_id,
        nombre: formData.nombre,
        systemPrompt: formData.systemPrompt,
        welcomeMessage: formData.welcomeMessage,
        colorPrimary: formData.colorPrimary,
        theme: formData.theme || "auto",
        aiProvider: formData.aiProvider || "claude",
        aiModel: formData.aiModel || "claude-sonnet-4-6",
        plan: formData.plan || "basic",
        mensajeLimite: formData.mensajeLimite || 100,
        escalationEnabled: formData.escalationEnabled !== false,
        adminEmail: formData.adminEmail || null,
        escalationMessage: formData.escalationMessage || null,
        defaultLanguage: formData.defaultLanguage || "es",
        autoDetectLanguage: formData.autoDetectLanguage !== false,
      };

      console.log("[handleSave] apiData enviada:", apiData);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar cliente");
      }

      // Recarga la lista
      await loadTenants();
      setShowForm(false);
      setEditingTenant(null);
    } catch (err) {
      console.error("Error:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick(clientId, clientName) {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar "${clientName}"?`,
      message: "Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a este cliente.",
      confirmText: "Eliminar",
      type: "danger",
      onConfirm: async () => {
        try {
          setError(null);
          const res = await fetch(`/api/admin/tenants/${clientId}`, {
            method: "DELETE",
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || "Error al eliminar cliente");
          }

          await loadTenants();
          setConfirmModal({ isOpen: false });
        } catch (err) {
          console.error("Error:", err);
          setError(err.message);
          setConfirmModal({ isOpen: false });
        }
      },
    });
  }

  function handleEdit(tenant) {
    setEditingTenant(tenant);
    setShowForm(true);
  }

  function handleNew() {
    setEditingTenant(null);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingTenant(null);
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
              📊 Gestión de Clientes
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              {user?.role === "superadmin"
                ? "Crea y personaliza los chatbots para tus clientes"
                : `Gestionando cliente: ${tenants[0]?.nombre || ""}`}
            </p>
            {user && (
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                {user.email} • <span className="font-medium">{user.role}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {user?.role === "superadmin" && (
              <Link
                href="/admin/usuarios"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium transition-colors"
              >
                👥 Usuarios
              </Link>
            )}
            {user?.role === "superadmin" && (
              <Link
                href="/admin/auditoria"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2 border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 font-medium transition-colors"
              >
                🔍 Auditoría
              </Link>
            )}
            {user?.role === "superadmin" && (
              <Link
                href="/admin/invitaciones"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2 border-orange-600 text-orange-600 dark:text-orange-400 dark:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-medium transition-colors"
              >
                ✉️ Invitaciones
              </Link>
            )}
            {user?.role === "superadmin" && (
              <Link
                href="/admin/planes"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2 border-green-600 text-green-600 dark:text-green-400 dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 font-medium transition-colors"
              >
                💰 Planes
              </Link>
            )}
            {user?.role === "superadmin" && (
              <button
                onClick={handleNew}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium transition-colors shadow-md hover:shadow-lg"
              >
                ✨ Nuevo Cliente
              </button>
            )}
          </div>
        </div>
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
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                {editingTenant ? "Editar Cliente" : "Nuevo Cliente"}
              </h3>
              <button
                onClick={handleCancel}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl font-semibold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <TenantForm
                tenant={editingTenant}
                onSave={handleSave}
                onCancel={handleCancel}
                loading={saving}
              />
              {editingTenant && (
                <DocumentsSection clientId={editingTenant.client_id} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      {loading ? (
        <div className="text-center py-16">
          <div className="text-zinc-500 dark:text-zinc-400">Cargando clientes...</div>
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📋</div>
          <div className="text-zinc-500 dark:text-zinc-400">
            No hay clientes creados. ¡Crea uno para empezar!
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-auto">
          {tenants.map((tenant) => (
            <div
              key={tenant.client_id}
              className="bg-white dark:bg-zinc-900 rounded-xl shadow-md hover:shadow-lg transition-shadow border-l-4 p-6 flex flex-col"
              style={{ borderLeftColor: tenant.colorPrimary }}
            >
              {/* Header de la card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {tenant.nombre}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {tenant.client_id}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: tenant.colorPrimary }}
                />
              </div>

              {/* Información de la card */}
              <div className="space-y-2 mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>🤖</span>
                  <span>Claude (IA)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>🎨</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: tenant.colorPrimary }}
                    />
                    <code className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      {tenant.colorPrimary}
                    </code>
                  </div>
                </div>
              </div>

              {/* Uso de mensajes */}
              <div className="mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    💳 {tenant.plan ? tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1) : "Basic"}
                  </span>
                  {tenant.mensajeLimite === -1 ? (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      ∞ Unlimited
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      {tenant.mensajesUsados || 0}/{tenant.mensajeLimite || 100}
                    </span>
                  )}
                </div>
                {tenant.mensajeLimite === -1 ? (
                  <div className="h-2 bg-green-100 dark:bg-green-900/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: "100%" }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(((tenant.mensajesUsados || 0) / (tenant.mensajeLimite || 100)) * 100, 100)}%`,
                          backgroundColor:
                            ((tenant.mensajesUsados || 0) / (tenant.mensajeLimite || 100)) > 0.9
                              ? "#ef4444"
                              : ((tenant.mensajesUsados || 0) / (tenant.mensajeLimite || 100)) > 0.7
                              ? "#eab308"
                              : "#22c55e",
                        }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {((((tenant.mensajesUsados || 0) / (tenant.mensajeLimite || 100)) * 100).toFixed(0))}% usado
                    </p>
                  </>
                )}
              </div>

              {/* Botones de acción */}
              <div className="mt-auto space-y-1.5 pt-6">
                {/* Fila 1: Abrir chat + Historial */}
                <div className="flex gap-1.5">
                  <Link
                    href={`/chat/${tenant.id}`}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap text-center"
                  >
                    💬 Abrir chat
                  </Link>
                  <Link
                    href={`/admin/conversaciones?clientId=${tenant.id}`}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors bg-zinc-600 hover:bg-zinc-700 text-white whitespace-nowrap"
                  >
                    📋 Historial
                  </Link>
                </div>

                {/* Fila 2: Widget + Métricas */}
                <div className="flex gap-1.5">
                  <Link
                    href={`/admin/widget?client=${tenant.id}`}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors bg-violet-600 hover:bg-violet-700 text-white whitespace-nowrap"
                  >
                    🔗 Widget
                  </Link>
                  <Link
                    href={`/admin/metricas?clientId=${tenant.client_id}`}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
                  >
                    📊 Métricas
                  </Link>
                </div>

                {/* Fila 3: Escalaciones + Tienda + Editar */}
                <div className="flex gap-1.5">
                  <Link
                    href={`/admin/escalaciones?clientId=${tenant.client_id}`}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors bg-red-600 hover:bg-red-700 text-white whitespace-nowrap relative"
                  >
                    🆘 Escalaciones
                    {escalationCounts[tenant.client_id] > 0 && (
                      <span className="ml-1 inline-block bg-red-800 text-white text-xs font-bold rounded-full px-2 py-0.5">
                        {escalationCounts[tenant.client_id]}
                      </span>
                    )}
                  </Link>
                  <Link
                    href={`/admin/inventario?clientId=${tenant.client_id}`}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                  >
                    🛍️ Inventario
                  </Link>
                  <button
                    onClick={() => handleEdit(tenant)}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors bg-amber-500 hover:bg-amber-600 text-white whitespace-nowrap"
                  >
                    ✏️ Editar
                  </button>
                </div>

                {/* Fila 4: Eliminar (full width si superadmin) */}
                {user?.role === "superadmin" && (
                  <button
                    onClick={() => handleDeleteClick(tenant.client_id, tenant.nombre)}
                    className="w-full h-9 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors bg-red-700 hover:bg-red-800 text-white whitespace-nowrap"
                  >
                    🗑️ Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
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
