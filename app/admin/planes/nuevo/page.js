"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlanForm from "../../components/PlanForm";
import Toast from "../../components/Toast";

export default function NewPlanPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const handleSave = async (formData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        router.push("/admin/planes?success=created");
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
          Nuevo Plan
        </h1>
      </div>

      <PlanForm 
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
