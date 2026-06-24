"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlanForm from "../../components/PlanForm";
import Toast from "../../components/Toast";

export default function EditPlanPage({ params }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const planId = unwrappedParams.id;

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  useEffect(() => {
    async function loadPlan() {
      try {
        const res = await fetch("/api/admin/plans");
        if (res.ok) {
          const data = await res.json();
          const foundPlan = data.plans?.find(p => p.id.toString() === planId);
          if (foundPlan) {
            const processedPlan = {
              ...foundPlan,
              caracteristicas: Array.isArray(foundPlan.caracteristicas)
                ? foundPlan.caracteristicas
                : typeof foundPlan.caracteristicas === 'string'
                ? JSON.parse(foundPlan.caracteristicas || '[]')
                : [],
              ecommerce_modes: Array.isArray(foundPlan.ecommerce_modes)
                ? foundPlan.ecommerce_modes
                : typeof foundPlan.ecommerce_modes === 'string'
                ? JSON.parse(foundPlan.ecommerce_modes || '[]')
                : []
            };
            console.log('[EditPlanPage] Plan cargado:', {
              id: processedPlan.id,
              nombre: processedPlan.nombre,
              ecommerce_modes: processedPlan.ecommerce_modes
            });
            setPlan(processedPlan);
          } else {
            setToast({ message: "✗ Plan no encontrado", type: "error" });
          }
        } else {
          setToast({ message: "✗ Error al cargar planes", type: "error" });
        }
      } catch (err) {
        console.error("Error cargando plan:", err);
        setToast({ message: "✗ Error de conexión", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [planId]);

  const handleSave = async (formData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        router.push("/admin/planes?success=updated");
      } else {
        const error = await res.json();
        setToast({ message: "✗ Error: " + error.error, type: "error" });
      }
    } catch (err) {
      console.error("Error guardando plan:", err);
      setToast({ message: "✗ Error al guardar el plan", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-slate-600 dark:text-slate-400">Cargando plan...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-red-600 dark:text-red-400">Plan no encontrado.</div>
        <Link href="/admin/planes" className="text-blue-600 hover:underline mt-4 inline-block">
          Volver a planes
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto pb-16">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/admin/planes"
          className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Volver
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Editar Plan: {plan.nombre}
        </h1>
      </div>

      <PlanForm 
        plan={plan}
        onSave={handleSave} 
        onCancel={() => router.push("/admin/planes")} 
        loading={submitting} 
      />

      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}
    </div>
  );
}
