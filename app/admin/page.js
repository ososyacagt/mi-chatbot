"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TenantForm from "./components/TenantForm";

export default function AdminPanel() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [saving, setSaving] = useState(false);

  // Carga lista de tenants
  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar clientes");
      }

      setTenants(data.tenants || []);
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
        system_prompt: formData.systemPrompt,
        welcome_message: formData.welcomeMessage,
        color_primary: formData.colorPrimary,
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

  async function handleDelete(clientId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      return;
    }

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
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    }
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Panel de Administración
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Gestiona los clientes del chatbot
            </p>
          </div>
          <Link
            href="/"
            className="text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ← Volver al chat
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {showForm ? (
          <div className="max-w-2xl">
            <TenantForm
              tenant={editingTenant}
              onSave={handleSave}
              onCancel={handleCancel}
              loading={saving}
            />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <button
                onClick={handleNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                + Nuevo Cliente
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-zinc-500 dark:text-zinc-400">
                  Cargando clientes...
                </div>
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-zinc-500 dark:text-zinc-400">
                  No hay clientes creados. Crea uno para empezar.
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.client_id}
                    className="bg-white dark:bg-zinc-900 rounded-lg shadow border border-zinc-200 dark:border-zinc-800 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-zinc-200 dark:border-zinc-700"
                          style={{ backgroundColor: tenant.colorPrimary }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-zinc-900 dark:text-white">
                            {tenant.nombre}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {tenant.client_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(tenant)}
                          className="bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-4 py-2 rounded font-medium text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.client_id)}
                          className="bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded font-medium text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
