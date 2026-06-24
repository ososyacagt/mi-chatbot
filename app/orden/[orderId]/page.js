"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const STATUS_STEPS = [
  { key: "pendiente", icon: "📋", label: "Pendiente" },
  { key: "confirmada", icon: "✅", label: "Confirmada" },
  { key: "en_proceso", icon: "📦", label: "En proceso" },
  { key: "entregada", icon: "🚚", label: "Entregada" },
];

function formatPrice(amount, currency) {
  const symbols = {
    GTQ: "Q",
    USD: "$",
    EUR: "€",
    MXN: "$",
  };
  const symbol = symbols[currency] || currency || "$";
  return `${symbol}${Number(amount).toFixed(2)}`;
}

const PAYMENT_METHOD_LABELS = {
  efectivo: "💰 Efectivo",
  tarjeta: "💳 Tarjeta",
  transferencia: "🏦 Transferencia",
  paypal: "🅿️ PayPal",
};

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.orderId;

  const [order, setOrder] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        console.log("[order-tracking] Cargando orderId:", orderId);
        const url = `/api/orden/${orderId}`;
        console.log("[order-tracking] URL:", url);

        const res = await fetch(url);
        console.log("[order-tracking] Status:", res.status);

        if (!res.ok) {
          const errorData = await res.json();
          console.error("[order-tracking] Error respuesta:", errorData);
          setError("Orden no encontrada");
          setLoading(false);
          return;
        }
        const data = await res.json();
        console.log("[order-tracking] Datos recibidos:", data);
        setOrder(data.order);
        setTenant(data.tenant);
      } catch (err) {
        console.error("[order-tracking] Error:", err);
        setError("Error al cargar la orden");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <p className="text-gray-600">Cargando seguimiento de tu pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Orden no encontrada"}
          </h1>
          <p className="text-gray-600 mb-6">
            No pudimos encontrar tu pedido. Verifica el número e intenta de nuevo.
          </p>
          <Link
            href="/catalogo"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            ← Volver
          </Link>
        </div>
      </div>
    );
  }

  const statusIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const currentStep = statusIndex >= 0 ? statusIndex : 0;
  const isDelivered = order.status === "entregado";
  const isCancelled = order.status === "cancelado";

  const storeUrl =
    tenant.ecommerce_mode === "tienda"
      ? `/tienda/${order.tenant_id}`
      : `/catalogo/${order.tenant_id}`;

  const whatsappUrl = tenant.whatsapp_number
    ? `https://wa.me/${tenant.whatsapp_number.replace(/[^\d]/g, "")}?text=Hola, consulto sobre mi orden %23${order.numero_orden}`
    : null;

  const createdDate = new Date(order.created_at);
  const formattedDate = createdDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            {tenant.store_logo && (
              <img
                src={tenant.store_logo}
                alt={tenant.store_name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            )}
            <div>
              <p className="text-sm text-gray-600">
                {tenant.store_name || tenant.nombre}
              </p>
              <h1 className="text-2xl font-bold text-gray-900">
                Seguimiento de tu pedido
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Order Status */}
        {isCancelled ? (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 text-center">
            <p className="text-4xl mb-3">❌</p>
            <p className="text-lg font-bold text-red-700">Pedido Cancelado</p>
            <p className="text-sm text-red-600 mt-2">
              Este pedido ha sido cancelado. Por favor contacta con nosotros si tienes preguntas.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-6">ESTADO DEL PEDIDO</p>

            <div className="flex items-center justify-between mb-6">
              {STATUS_STEPS.map((step, idx) => (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-2 transition-all border-2 ${
                      idx < currentStep
                        ? "bg-green-100 border-green-500"
                        : idx === currentStep
                        ? "border-2"
                        : "bg-gray-100 border-gray-300"
                    }`}
                    style={
                      idx < currentStep
                        ? {}
                        : idx === currentStep && !isCancelled
                        ? {
                            backgroundColor: `${tenant.colorPrimary}20`,
                            borderColor: tenant.colorPrimary,
                          }
                        : {}
                    }
                  >
                    {idx < currentStep ? (
                      <span className="text-white">✓</span>
                    ) : (
                      step.icon
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className={`text-xs font-medium text-center ${
                      idx <= currentStep ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>

                  {/* Connector Line */}
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`w-full h-1 mt-4 mb-4 ${
                        idx < currentStep ? "bg-green-500" : "bg-gray-300"
                      }`}
                      style={{
                        gridColumn: "span 1",
                        marginTop: "-1.5rem",
                        marginBottom: "1rem",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Status Timeline */}
            <div className="border-t pt-4">
              {order.status_timeline &&
                Object.entries(order.status_timeline)
                  .filter(([key]) => key !== "cancelado")
                  .map(([key, timestamp]) => (
                    <div key={key} className="flex gap-4 pb-4 last:pb-0">
                      <div className="text-2xl">
                        {STATUS_STEPS.find((s) => s.key === key)?.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {STATUS_STEPS.find((s) => s.key === key)?.label}
                        </p>
                        {timestamp && (
                          <p className="text-sm text-gray-500">
                            {new Date(timestamp).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}

        {/* Order Details Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600 uppercase mb-1">Número de orden</p>
              <p className="text-xl font-bold text-gray-900">#{order.numero_orden}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase mb-1">Fecha del pedido</p>
              <p className="text-sm text-gray-900">{formattedDate}</p>
            </div>
          </div>
          {order.payment_method && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">
                {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
              </span>
            </div>
          )}
        </div>

        {/* Customer Data */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-4 uppercase">DATOS DEL CLIENTE</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Nombre</p>
              <p className="font-medium text-gray-900">{order.cliente_nombre || "No especificado"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Teléfono</p>
              <p className="font-medium text-gray-900">{order.cliente_telefono || "No especificado"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Dirección</p>
              <p className="font-medium text-gray-900">{order.cliente_direccion || "No especificada"}</p>
            </div>
            {order.cliente_ciudad && (
              <div>
                <p className="text-xs text-gray-500">Ciudad</p>
                <p className="font-medium text-gray-900">{order.cliente_ciudad}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-4 uppercase">PRODUCTOS</p>
          <div className="space-y-4">
            {order.items &&
              order.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 pb-4 border-b last:pb-0 last:border-0">
                  {/* Product Image/Placeholder */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.nombre}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gray-400">
                        {item.nombre.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.nombre}</p>
                    {item.variante && (
                      <p className="text-xs text-gray-600">{item.variante}</p>
                    )}
                    <p className="text-sm text-gray-700 mt-1">
                      {item.quantity} x {formatPrice(item.precio || 0, tenant?.currency || "USD")}
                    </p>
                  </div>

                  {/* Item Subtotal */}
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.subtotal || item.quantity * item.precio, tenant?.currency || "USD")}
                    </p>
                    {item.esRegalo && (
                      <p className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mt-1 whitespace-nowrap">
                        🎁 GRATIS
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">
                {formatPrice(order.subtotal || 0, tenant?.currency || "USD")}
              </span>
            </div>
            {order.total_discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Descuento</span>
                <span className="text-green-600 font-medium">
                  -{formatPrice(order.total_discount, tenant?.currency || "USD")}
                </span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span
                className="text-2xl font-bold"
                style={{ color: tenant.colorPrimary }}
              >
                {formatPrice(order.total || order.subtotal || 0, tenant?.currency || "USD")}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              💬 Contactar por WhatsApp
            </a>
          )}
          <Link
            href={storeUrl}
            className="block text-center border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium transition"
          >
            ← Volver a la tienda
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          Powered by {process.env.NEXT_PUBLIC_BRAND_NAME || "Mi Chatbot"}
        </div>
      </div>
    </div>
  );
}
