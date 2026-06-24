"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function OrderTrackingPage() {
  const params = useParams();
  const clientId = params.clientId;
  const orderId = params.orderId;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storeData, setStoreData] = useState(null);

  useEffect(() => {
    loadOrder();
    loadStore();
  }, [clientId, orderId]);

  const loadStore = async () => {
    try {
      const res = await fetch(`/api/store/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setStoreData(data.tenant);
      }
    } catch (err) {
      console.error("Error loading store:", err);
    }
  };

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/store/${clientId}/orden/${orderId}`);
      if (!res.ok) {
        throw new Error("Orden no encontrada");
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusSteps = [
    { id: 'pendiente', label: 'Pendiente', icon: '⏳' },
    { id: 'confirmada', label: 'Confirmada', icon: '✅' },
    { id: 'en_proceso', label: 'En proceso', icon: '📦' },
    { id: 'entregada', label: 'Entregada', icon: '🚚' },
  ];

  const getStatusIndex = (status) => {
    return statusSteps.findIndex(s => s.id === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <div className="text-slate-600">Cargando orden...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Orden no encontrada</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <a
            href={`/tienda/${clientId}`}
            className="inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            Volver a la tienda
          </a>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-slate-600">Orden no disponible</div>
        </div>
      </div>
    );
  }

  const moneda = storeData?.currency || 'Q';
  const currentStatusIndex = getStatusIndex(order.status);
  const primaryColor = storeData?.colorPrimary || "#3b82f6";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              {storeData?.nombre || 'Mi Tienda'}
            </h1>
            <a
              href={`/tienda/${clientId}`}
              className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
            >
              ← Volver a tienda
            </a>
          </div>
          <p className="text-slate-600">Seguimiento de tu pedido</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ORDER HEADER */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-slate-900">
              Orden #{order.numero_orden}
            </h2>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                order.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                order.status === 'en_proceso' ? 'bg-purple-100 text-purple-800' :
                'bg-green-100 text-green-800'
              }`}>
                {statusSteps.find(s => s.id === order.status)?.label || order.status}
              </span>
            </div>
          </div>
          <p className="text-slate-600 text-sm">
            {new Date(order.created_at).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* STATUS TIMELINE */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-6">Estado del pedido</h3>

          <div className="space-y-4">
            {statusSteps.map((step, idx) => {
              const isCompleted = idx <= currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;

              return (
                <div key={step.id} className="flex items-start gap-4">
                  {/* Circle */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    isCurrent ? 'bg-blue-100 ring-4 ring-blue-200' :
                    isCompleted ? 'bg-green-100' :
                    'bg-slate-100'
                  }`}>
                    {isCompleted ? '✓' : step.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <h4 className={`font-semibold ${
                      isCompleted ? 'text-slate-900' : 'text-slate-500'
                    }`}>
                      {step.label}
                    </h4>
                    <p className={`text-sm ${
                      isCompleted ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {step.id === 'pendiente' ? 'Tu pedido ha sido recibido' :
                       step.id === 'confirmada' ? 'Tu pedido ha sido confirmado' :
                       step.id === 'en_proceso' ? 'Tu pedido está siendo preparado' :
                       'Tu pedido ha sido entregado'}
                    </p>
                  </div>

                  {/* Line connector */}
                  {idx < statusSteps.length - 1 && (
                    <div className={`absolute left-6 w-1 h-8 ${
                      isCompleted ? 'bg-green-400' : 'bg-slate-200'
                    }`} style={{ marginTop: '3rem', marginLeft: idx === 0 ? '1.5rem' : '1.5rem' }}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CUSTOMER INFO */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-4">Datos del cliente</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">Nombre</p>
              <p className="font-semibold text-slate-900">{order.cliente_nombre}</p>
            </div>

            {order.cliente_email && (
              <div>
                <p className="text-sm text-slate-600 mb-1">Email</p>
                <p className="font-semibold text-slate-900">{order.cliente_email}</p>
              </div>
            )}

            {order.cliente_telefono && (
              <div>
                <p className="text-sm text-slate-600 mb-1">Teléfono</p>
                <p className="font-semibold text-slate-900">{order.cliente_telefono}</p>
              </div>
            )}

            {order.cliente_direccion && (
              <div className="md:col-span-2">
                <p className="text-sm text-slate-600 mb-1">Dirección de entrega</p>
                <p className="font-semibold text-slate-900">{order.cliente_direccion}</p>
                {(order.cliente_ciudad || order.cliente_pais) && (
                  <p className="text-sm text-slate-600">
                    {order.cliente_ciudad && `${order.cliente_ciudad}, `}{order.cliente_pais}
                  </p>
                )}
              </div>
            )}
          </div>

          {storeData?.whatsappNumber && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <a
                href={`https://wa.me/${storeData.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                💬 Contactar por WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* PRODUCTS */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-4">Productos</h3>

          <div className="space-y-3">
            {order.items && order.items.map((item, idx) => (
              <div key={idx} className="flex gap-4 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                {item.imagen && (
                  <img
                    src={item.imagen}
                    alt={item.nombre}
                    className="w-16 h-16 rounded object-cover bg-slate-100"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{item.nombre}</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    {item.quantity}x {moneda} {item.precio.toFixed(2)}
                    {item.esRegalo && (
                      <span className="ml-2 text-green-600 font-semibold">🎁 GRATIS</span>
                    )}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {moneda} {(item.precio * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAYMENT SUMMARY */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-slate-900 mb-4">Resumen de pago</h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-semibold">{moneda} {order.subtotal?.toFixed(2) || '0.00'}</span>
            </div>

            {order.descuentos && order.descuentos > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuentos:</span>
                <span className="font-semibold">-{moneda} {order.descuentos.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-lg border-t border-slate-200 pt-3">
              <span className="font-bold">Total:</span>
              <span className="font-bold" style={{ color: primaryColor }}>
                {moneda} {order.total.toFixed(2)}
              </span>
            </div>

            {order.metodo_pago && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">Método de pago:</p>
                <p className="font-semibold text-slate-900">
                  {order.metodo_pago === 'whatsapp' ? '📱 WhatsApp' :
                   order.metodo_pago === 'efectivo' ? '💵 Efectivo contra entrega' :
                   order.metodo_pago === 'transferencia' ? '🏦 Transferencia bancaria' :
                   order.metodo_pago === 'stripe' ? '💳 Tarjeta de crédito' :
                   order.metodo_pago}
                </p>
              </div>
            )}

            {order.notas && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">Notas del pedido:</p>
                <p className="font-semibold text-slate-900">{order.notas}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="font-bold text-lg mb-2">{storeData?.nombre}</h3>
          {storeData?.whatsappNumber && (
            <a
              href={`https://wa.me/${storeData.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 text-sm block mb-4"
            >
              💬 {storeData.whatsappNumber}
            </a>
          )}
          <p className="text-slate-400 text-sm">
            © 2026 {storeData?.nombre}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
