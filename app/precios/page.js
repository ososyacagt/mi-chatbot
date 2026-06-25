"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contactModal, setContactModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [contactForm, setContactForm] = useState({
    nombre: "",
    email: "",
    empresa: "",
    mensaje: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
        }
      } catch (err) {
        console.error("Error cargando planes:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  const getPrice = (plan) => {
    if (isAnnual) {
      const annualPrice = plan.precio * 12 * 0.8; // 20% descuento
      return annualPrice;
    }
    return plan.precio;
  };

  const getOriginalPrice = (plan) => {
    if (isAnnual) {
      return plan.precio * 12;
    }
    return null;
  };

  const openContactModal = (plan) => {
    setSelectedPlan(plan);
    setContactModal(true);
    setContactForm({ nombre: "", email: "", empresa: "", mensaje: "" });
    setSubmitSuccess(false);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: contactForm.nombre,
          email: contactForm.email,
          empresa: contactForm.empresa,
          plan: selectedPlan?.nombre,
          mensaje: contactForm.mensaje
        })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setContactForm({ nombre: "", email: "", empresa: "", mensaje: "" });
        setTimeout(() => {
          setContactModal(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Error enviando contacto:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Cargando planes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-black dark:to-slate-900">
      {/* Header */}
      <div className="px-6 py-20 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
          Planes y Precios
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-10">
          Elige el plan perfecto para tu negocio
        </p>

        {/* Toggle Mensual/Anual */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span
            className={`font-medium ${
              !isAnnual
                ? "text-slate-900 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Mensual
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              isAnnual
                ? "bg-blue-600"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isAnnual ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`font-medium ${
              isAnnual
                ? "text-slate-900 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Anual
          </span>
          {isAnnual && (
            <span className="ml-2 inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
              Ahorra 20%
            </span>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="px-6 pb-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl transition-all duration-300 ${
                plan.destacado
                  ? "md:scale-105 ring-2 ring-blue-600 dark:ring-blue-500 bg-white dark:bg-slate-800 shadow-2xl"
                  : "bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl"
              }`}
            >
              {/* Badge "Más popular" */}
              {plan.destacado && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Más popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {plan.nombre}
                </h3>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                  {plan.descripcion}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    {getOriginalPrice(plan) && (
                      <span className="text-lg text-slate-500 line-through">
                        ${getOriginalPrice(plan).toFixed(2)}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      ${getPrice(plan).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    /{isAnnual ? "año" : "mes"}
                  </p>
                </div>

                {/* Limits */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">Mensajes:</span> {plan.mensajeLimite?.toLocaleString() || "Ilimitado"}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">Documentos:</span> {plan.documentosLimite?.toLocaleString() || "Ilimitado"}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">Usuarios:</span> {plan.usuariosLimite?.toLocaleString() || "Ilimitado"}
                  </div>
                </div>

                {/* E-commerce Capabilities */}
                {(plan.ecommerce_modes && plan.ecommerce_modes.length > 0) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 space-y-4 text-sm border border-blue-200 dark:border-blue-800">
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-200 mb-3">🛍️ Modalidades de E-commerce:</p>
                      <div className="space-y-2">
                        {plan.ecommerce_modes.includes('catalogo_whatsapp') && (
                          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span>🛍️</span>
                            <span>Catálogo + WhatsApp</span>
                          </div>
                        )}
                        {plan.ecommerce_modes.includes('chatbot_simple') && (
                          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span>💬</span>
                            <span>Solo Chatbot (sin pedidos)</span>
                          </div>
                        )}
                        {plan.ecommerce_modes.includes('chatbot') && (
                          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span>🤖</span>
                            <span>Chatbot con pedidos</span>
                          </div>
                        )}
                        {plan.ecommerce_modes.includes('tienda') && (
                          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span>🏪</span>
                            <span>Tienda completa con checkout</span>
                          </div>
                        )}
                        {plan.ecommerce_modes.includes('pos') && (
                          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span>🖥️</span>
                            <span>Punto de Venta (POS)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* E-commerce Limits */}
                    {(plan.max_productos > 0 || plan.max_categorias > 0 || plan.max_reglas > 0) && (
                      <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
                        <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Límites de e-commerce:</p>
                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {plan.max_productos > 0 && (
                            <div>📦 Hasta {plan.max_productos.toLocaleString()} productos</div>
                          )}
                          {plan.max_categorias > 0 && (
                            <div>🏷️ Hasta {plan.max_categorias} categorías</div>
                          )}
                          {plan.max_reglas > 0 && (
                            <div>⚙️ Hasta {plan.max_reglas} reglas de negocio</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* No e-commerce for Basic plan */}
                {(!plan.ecommerce_modes || plan.ecommerce_modes.length === 0) && (
                  <div className="bg-slate-100 dark:bg-slate-700/30 rounded-lg p-4 mb-6 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <span>🛍️</span>
                    <span>Sin módulo de tienda</span>
                  </div>
                )}

                {/* Features */}
                <div className="mb-8 space-y-3">
                  {plan.caracteristicas &&
                    plan.caracteristicas.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="text-green-500 text-lg flex-shrink-0 mt-1">✓</span>
                        <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => openContactModal(plan)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                    plan.destacado
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                  }`}
                >
                  {plan.slug === "enterprise" ? "Contactar ventas" : "Empezar ahora"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-12 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            ¿Tienes preguntas?{" "}
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contacto@ejemplo.com"}`}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Contáctanos
            </a>
          </p>
          <Link
            href="/admin/login"
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium"
          >
            ¿Eres cliente? Ingresa al panel →
          </Link>
        </div>
      </div>

      {/* Contact Modal */}
      {contactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Contactar ventas
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Plan: <span className="font-semibold">{selectedPlan?.nombre}</span>
            </p>

            {submitSuccess ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✓</div>
                <p className="text-green-600 dark:text-green-400 font-semibold">
                  Solicitud enviada correctamente
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Nos pondremos en contacto pronto
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.nombre}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, nombre: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.empresa}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, empresa: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mensaje
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={contactForm.mensaje}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, mensaje: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setContactModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                  >
                    {submitting ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
