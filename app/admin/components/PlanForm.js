"use client";

import { useState, useEffect } from "react";

export default function PlanForm({ plan, onSave, onCancel, loading }) {
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

  useEffect(() => {
    if (plan) {
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
        activo: plan.activo !== false,
        orden: plan.orden || 0,
        ecommerce_modes: plan.ecommerce_modes || [],
        max_productos: plan.max_productos || 0,
        max_categorias: plan.max_categorias || 0,
        max_reglas: plan.max_reglas || 0,
        chatbot_pedidos: plan.chatbot_pedidos || false,
        tienda_completa: plan.tienda_completa || false
      });
    }
  }, [plan]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
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
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
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
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar plan"}
        </button>
      </div>
    </form>
  );
}
