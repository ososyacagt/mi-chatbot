"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Eliminar",
    onConfirm: null,
    type: "danger",
  });

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/admin/plans");
        if (res.ok) {
          const data = await res.json();
          const plansData = (data.plans || []).map(plan => {
            return {
              ...plan,
              caracteristicas: Array.isArray(plan.caracteristicas)
                ? plan.caracteristicas
                : typeof plan.caracteristicas === 'string'
                ? JSON.parse(plan.caracteristicas || '[]')
                : []
            };
          });
          setPlans(plansData);
        }
      } catch (err) {
        console.error("Error cargando planes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);



  const openNewPlan = () => {
    router.push("/admin/planes/nuevo");
  };

  const openEditPlan = (plan) => {
    router.push(`/admin/planes/${plan.id}`);
  };

  const handleToggleActive = async (plan) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !plan.activo })
      });

      if (res.ok) {
        await loadPlans();
      }
    } catch (err) {
      console.error("Error toggling plan:", err);
    }
  };

  const handleToggleDestacado = async (plan) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destacado: !plan.destacado })
      });

      if (res.ok) {
        await loadPlans();
      }
    } catch (err) {
      console.error("Error toggling destacado:", err);
    }
  };

  const handleDeleteClick = (plan) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar plan",
      message: `¿Estás seguro de que deseas eliminar el plan "${plan.nombre}"?`,
      confirmText: "Eliminar",
      onConfirm: () => handleDelete(plan),
      type: "danger",
    });
  };

  const handleDelete = async (plan) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setToast({ message: "✓ Plan eliminado correctamente", type: "success" });
        window.location.reload();
      } else {
        const error = await res.json();
        setToast({ message: "✗ Error: " + error.error, type: "error" });
      }
      setConfirmModal({ ...confirmModal, isOpen: false });
    } catch (err) {
      console.error("Error deleting plan:", err);
      setToast({ message: "✗ Error al eliminar el plan", type: "error" });
      setConfirmModal({ ...confirmModal, isOpen: false });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-slate-600 dark:text-slate-400">Cargando planes...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Volver
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            💰 Gestión de planes
          </h1>
        </div>
        <button
          onClick={openNewPlan}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          + Nuevo plan
        </button>
      </div>

      {/* Plans List */}
      <div className="grid gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {plan.nombre}
                  </h3>
                  {plan.destacado && (
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-xs font-semibold">
                      Destacado
                    </span>
                  )}
                  {!plan.activo && (
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded text-xs font-semibold">
                      Inactivo
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4">
                  <div>
                    <span className="font-semibold">Precio:</span> ${plan.precio.toFixed(2)} {plan.moneda}/{plan.periodo}
                  </div>
                  <div>
                    <span className="font-semibold">Slug:</span> {plan.slug}
                  </div>
                  <div>
                    <span className="font-semibold">Orden:</span> {plan.orden}
                  </div>
                  <div>
                    <span className="font-semibold">Usuarios:</span> {plan.usuarios_limite || "Ilimitado"}
                  </div>
                </div>

                {plan.descripcion && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {plan.descripcion}
                  </p>
                )}

                {(() => {
                  const chars = Array.isArray(plan.caracteristicas)
                    ? plan.caracteristicas
                    : typeof plan.caracteristicas === 'string'
                    ? JSON.parse(plan.caracteristicas || '[]')
                    : [];
                  return chars.length > 0 && (
                    <div className="text-sm mb-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Características:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {chars.map((feat, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => openEditPlan(plan)}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClick(plan)}
                  className="px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/40"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={plan.activo}
                  onChange={() => handleToggleActive(plan)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Activo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={plan.destacado}
                  onChange={() => handleToggleDestacado(plan)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Destacado</span>
              </label>
            </div>
          </div>
        ))}

        {plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No hay planes creados aún
            </p>
            <button
              onClick={openNewPlan}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Crear primer plan
            </button>
          </div>
        )}
      </div>



      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        type={confirmModal.type}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
}
