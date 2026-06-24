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
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    slug: "",
    precio: "",
    moneda: "USD",
    periodo: "mes",
    descripcion: "",
    mensajeLimite: "",
    documentosLimite: "",
    usuariosLimite: "",
    caracteristicas: [],
    destacado: false,
    activo: true,
    orden: 0,
    ecommerce_modes: [],
    max_productos: 0,
    max_categorias: 0,
    max_reglas: 0,
    chatbot_pedidos: false,
    tienda_completa: false
  });
  const [newFeature, setNewFeature] = useState("");
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
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        console.log('[loadPlans] ✓ Datos crudos del API:', data.plans);

        const plansData = (data.plans || []).map(plan => {
          console.log(`[loadPlans] Plan "${plan.nombre}":`, {
            caracteristicasRaw: plan.caracteristicas,
            type: typeof plan.caracteristicas,
            isArray: Array.isArray(plan.caracteristicas)
          });

          return {
            ...plan,
            // Garantizar que características sea siempre array
            caracteristicas: Array.isArray(plan.caracteristicas)
              ? plan.caracteristicas
              : typeof plan.caracteristicas === 'string'
              ? JSON.parse(plan.caracteristicas || '[]')
              : []
          };
        });

        console.log('[loadPlans] Planes después de procesar:', plansData.map(p => ({
          id: p.id,
          nombre: p.nombre,
          caracteristicas: p.caracteristicas,
          caracteristicasLength: p.caracteristicas?.length
        })));

        setPlans(plansData);
      }
    } catch (err) {
      console.error("Error cargando planes:", err);
    } finally {
      setLoading(false);
    }
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setFormData({
      nombre: "",
      slug: "",
      precio: "",
      moneda: "USD",
      periodo: "mes",
      descripcion: "",
      mensajeLimite: "",
      documentosLimite: "",
      usuariosLimite: "",
      caracteristicas: [],
      destacado: false,
      activo: true,
      orden: 0
    });
    setNewFeature("");
    setShowModal(true);
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setFormData({
      nombre: plan.nombre,
      slug: plan.slug,
      precio: plan.precio,
      moneda: plan.moneda || "USD",
      periodo: plan.periodo || "mes",
      descripcion: plan.descripcion || "",
      mensajeLimite: plan.mensaje_limite || "",
      documentosLimite: plan.documentos_limite || "",
      usuariosLimite: plan.usuarios_limite || "",
      caracteristicas: plan.caracteristicas || [],
      destacado: plan.destacado || false,
      activo: plan.activo || true,
      orden: plan.orden || 0,
      ecommerce_modes: plan.ecommerce_modes || [],
      max_productos: plan.max_productos || 0,
      max_categorias: plan.max_categorias || 0,
      max_reglas: plan.max_reglas || 0,
      chatbot_pedidos: plan.chatbot_pedidos || false,
      tienda_completa: plan.tienda_completa || false
    });
    setNewFeature("");
    setShowModal(true);
  };

  const generateSlug = (nombre) => {
    return nombre
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleNameChange = (e) => {
    const nombre = e.target.value;
    setFormData({
      ...formData,
      nombre,
      slug: generateSlug(nombre)
    });
  };

  const addFeature = () => {
    const trimmedFeature = newFeature.trim();
    if (trimmedFeature && !formData.caracteristicas.includes(trimmedFeature)) {
      console.log('[addFeature] Agregando característica:', trimmedFeature);
      setFormData({
        ...formData,
        caracteristicas: [...formData.caracteristicas, trimmedFeature]
      });
      setNewFeature("");
    }
  };

  const removeFeature = (idx) => {
    setFormData({
      ...formData,
      caracteristicas: formData.caracteristicas.filter((_, i) => i !== idx)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : "/api/admin/plans";
      const method = editingPlan ? "PUT" : "POST";

      console.log('[handleSubmit] Enviando datos:', {
        url,
        method,
        caracteristicas: formData.caracteristicas,
        caracteristicasType: typeof formData.caracteristicas,
        caracteristicasIsArray: Array.isArray(formData.caracteristicas)
      });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        console.log('[handleSubmit] ✓ Plan guardado correctamente');
        setToast({ message: "✓ Plan guardado correctamente", type: "success" });
        setShowModal(false);
        await loadPlans();
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
        await loadPlans();
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              {editingPlan ? "Editar plan" : "Nuevo plan"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del plan
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={handleNameChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Slug (URL-friendly)
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Precio y Moneda */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Precio
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) =>
                      setFormData({ ...formData, precio: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Moneda
                  </label>
                  <select
                    value={formData.moneda}
                    onChange={(e) =>
                      setFormData({ ...formData, moneda: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GTQ">GTQ</option>
                  </select>
                </div>
              </div>

              {/* Período */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Período
                </label>
                <select
                  value={formData.periodo}
                  onChange={(e) =>
                    setFormData({ ...formData, periodo: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="mes">Mes</option>
                  <option value="año">Año</option>
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Límites */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Límite de mensajes
                  </label>
                  <input
                    type="number"
                    value={formData.mensajeLimite}
                    onChange={(e) =>
                      setFormData({ ...formData, mensajeLimite: e.target.value })
                    }
                    placeholder="Ilimitado"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Límite de documentos
                  </label>
                  <input
                    type="number"
                    value={formData.documentosLimite}
                    onChange={(e) =>
                      setFormData({ ...formData, documentosLimite: e.target.value })
                    }
                    placeholder="Ilimitado"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Límite de usuarios
                  </label>
                  <input
                    type="number"
                    value={formData.usuariosLimite}
                    onChange={(e) =>
                      setFormData({ ...formData, usuariosLimite: e.target.value })
                    }
                    placeholder="Ilimitado"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Características */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Características
                </label>
                <div className="space-y-2 mb-3">
                  {formData.caracteristicas.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded"
                    >
                      <span className="text-slate-900 dark:text-white">{feat}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(idx)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                    placeholder="Agregar característica..."
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-4 py-2 rounded text-slate-900 dark:text-white font-medium"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Orden */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Orden (para mostrar en web)
                </label>
                <input
                  type="number"
                  value={formData.orden}
                  onChange={(e) =>
                    setFormData({ ...formData, orden: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* E-commerce modes */}
              <div className="space-y-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-slate-900 dark:text-white">Modalidades de e-commerce disponibles:</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ecommerce_modes?.includes('catalogo_whatsapp')}
                    onChange={(e) => {
                      const modes = formData.ecommerce_modes || [];
                      if (e.target.checked) {
                        setFormData({ ...formData, ecommerce_modes: [...modes, 'catalogo_whatsapp'] });
                      } else {
                        setFormData({ ...formData, ecommerce_modes: modes.filter(m => m !== 'catalogo_whatsapp') });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-slate-900 dark:text-white">🛍️ Catálogo + WhatsApp</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ecommerce_modes?.includes('chatbot')}
                    onChange={(e) => {
                      const modes = formData.ecommerce_modes || [];
                      if (e.target.checked) {
                        setFormData({ ...formData, ecommerce_modes: [...modes, 'chatbot'] });
                      } else {
                        setFormData({ ...formData, ecommerce_modes: modes.filter(m => m !== 'chatbot') });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-slate-900 dark:text-white">🤖 Chatbot con pedidos</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ecommerce_modes?.includes('tienda')}
                    onChange={(e) => {
                      const modes = formData.ecommerce_modes || [];
                      if (e.target.checked) {
                        setFormData({ ...formData, ecommerce_modes: [...modes, 'tienda'] });
                      } else {
                        setFormData({ ...formData, ecommerce_modes: modes.filter(m => m !== 'tienda') });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-slate-900 dark:text-white">🏪 Tienda completa</span>
                </label>
              </div>

              {/* E-commerce limits */}
              <div className="space-y-4 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="font-semibold text-slate-900 dark:text-white">Límites de e-commerce (0 = sin límite):</p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    📦 Máximo de productos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_productos}
                    onChange={(e) =>
                      setFormData({ ...formData, max_productos: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="ej: 50, 500, 0 para sin límite"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    🏷️ Máximo de categorías
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_categorias}
                    onChange={(e) =>
                      setFormData({ ...formData, max_categorias: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="ej: 10, 50, 0 para sin límite"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    ⚙️ Máximo de reglas de negocio
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_reglas}
                    onChange={(e) =>
                      setFormData({ ...formData, max_reglas: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="ej: 5, 20, 0 para sin límite"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) =>
                      setFormData({ ...formData, activo: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-slate-900 dark:text-white font-medium">
                    Plan activo
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.destacado}
                    onChange={(e) =>
                      setFormData({ ...formData, destacado: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-slate-900 dark:text-white font-medium">
                    Marcar como destacado
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Guardar plan"}
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
