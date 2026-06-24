"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TenantForm from "@/app/admin/components/TenantForm";

export default function NuevoClientePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave(formData) {
    try {
      setSaving(true);
      setError(null);

      const apiData = {
        client_id: formData.client_id, nombre: formData.nombre,
        systemPrompt: formData.systemPrompt, welcomeMessage: formData.welcomeMessage,
        colorPrimary: formData.colorPrimary, theme: formData.theme || "auto",
        aiProvider: formData.aiProvider || "claude", aiModel: formData.aiModel || "claude-sonnet-4-6",
        plan: formData.plan || "basic", mensajeLimite: formData.mensajeLimite || 100,
        escalationEnabled: formData.escalationEnabled !== false, adminEmail: formData.adminEmail || null,
        escalationMessage: formData.escalationMessage || null, defaultLanguage: formData.defaultLanguage || "es",
        autoDetectLanguage: formData.autoDetectLanguage !== false,
      };

      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear cliente");

      router.push("/admin");
      router.refresh();
    } catch (err) {
      console.error("Error:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/admin"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
            Nuevo Cliente
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configura un nuevo chatbot y espacio de trabajo
          </p>
        </div>
      </div>

      <TenantForm 
        tenant={null} 
        onSave={handleSave} 
        onCancel={() => router.push("/admin")} 
        loading={saving} 
      />
    </main>
  );
}
