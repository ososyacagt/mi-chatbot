"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function POSOrdenesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId");

  const [clientId, setClientId] = useState(clientIdParam || "");
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cliente, setCliente] = useState("");
  const [status, setStatus] = useState("todas");
  const [tipoOrden, setTipoOrden] = useState("todos");

  // Datos
  const [ordenes, setOrdenes] = useState([]);
  const [totales, setTotales] = useState(null);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);

  // Modal detalle
  const [ordenDetalle, setOrdenDetalle] = useState(null);

  const isSuperadmin = true; // TODO: verificar con adminUser.role

  useEffect(() => {
    cargarTenants();
  }, []);

  useEffect(() => {
    if (clientId) {
      cargarOrdenes();
    }
  }, [clientId, fechaInicio, fechaFin, cliente, status, tipoOrden, offset]);

  const cargarTenants = async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch (err) {
      console.error("[POS Órdenes] Error cargando tenants:", err);
    } finally {
      setLoading(false);
    }
  };

  const cargarOrdenes = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        clientId,
        limit,
        offset
      });

      if (fechaInicio) params.append("fecha_inicio", fechaInicio);
      if (fechaFin) params.append("fecha_fin", fechaFin);
      if (cliente) params.append("cliente", cliente);
      if (status && status !== "todas") params.append("status", status);
      if (tipoOrden && tipoOrden !== "todos") params.append("tipo_orden", tipoOrden);

      const res = await fetch(`/api/admin/pos-orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrdenes(data.orders || []);
        setTotales(data.totales || null);
      }
    } catch (err) {
      console.error("[POS Órdenes] Error cargando órdenes:", err);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setCliente("");
    setStatus("todas");
    setTipoOrden("todos");
    setOffset(0);
  };

  const getBadgeColor = (tipo) => {
    switch (tipo) {
      case "mostrador":
        return "bg-blue-100 text-blue-800";
      case "mesa":
        return "bg-purple-100 text-purple-800";
      case "llevar":
        return "bg-orange-100 text-orange-800";
      case "autoservicio":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (stat) => {
    switch (stat) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "cerrado":
        return "bg-green-100 text-green-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (value, currency = "GTQ") => {
    return `${currency} ${parseFloat(value || 0).toFixed(2)}`;
  };

  if (!isSuperadmin && !clientIdParam) {
    return (
      <div className="p-6">
        <p className="text-red-600">No autorizado para ver órdenes POS</p>
      </div>
    );
  }

  const tenantSeleccionado = tenants.find(t => t.id === clientId);
  const monedaTenant = tenantSeleccionado?.currency || "GTQ";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              ← Volver
            </button>
            <h1 className="text-3xl font-bold">🖥️ Órdenes POS</h1>
          </div>
        </div>

        {/* Selector de cliente (si es superadmin) */}
        {isSuperadmin && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Selecciona cliente:
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg w-full max-w-md"
            >
              <option value="">-- Seleccionar cliente --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtros */}
        {clientId && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cliente
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  setOffset(0);
                }}
                placeholder="Buscar por nombre"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="todas">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="cerrado">Cerrado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de orden
              </label>
              <select
                value={tipoOrden}
                onChange={(e) => {
                  setTipoOrden(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="todos">Todos</option>
                <option value="mostrador">Mostrador</option>
                <option value="mesa">Mesa</option>
                <option value="llevar">Para llevar</option>
                <option value="autoservicio">Auto-servicio</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={cargarOrdenes}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                🔍 Buscar
              </button>
              <button
                onClick={limpiarFiltros}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium text-sm"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>

      {clientId && (
        <div className="p-6 space-y-6">
          {/* Cards de totales */}
          {totales && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-600 mb-1">Total órdenes</div>
                <div className="text-3xl font-bold text-slate-900">
                  {totales.cantidad}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-600 mb-1">Total ventas</div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(totales.total, monedaTenant)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-600 mb-1">Subtotal</div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(totales.subtotal, monedaTenant)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="text-sm text-slate-600 mb-1">Por método pago</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Efectivo:</span>
                    <span className="font-medium">{totales.por_metodo_pago.efectivo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarjeta:</span>
                    <span className="font-medium">{totales.por_metodo_pago.tarjeta}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transfer:</span>
                    <span className="font-medium">{totales.por_metodo_pago.transferencia}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de órdenes */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-slate-600">Cargando órdenes...</div>
            ) : ordenes.length === 0 ? (
              <div className="p-6 text-center text-slate-600">No hay órdenes con estos filtros</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700"># Orden</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Tipo</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Cliente</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Items</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Total</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Pago</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Fecha</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ordenes.map((orden) => (
                      <tr key={orden.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          #{orden.numero_orden}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeColor(orden.tipo_orden)}`}>
                            {orden.tipo_orden}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {orden.cliente_nombre || orden.mesa_numero ? `Mesa ${orden.mesa_numero}` : "Mostrador"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {orden.items?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {formatCurrency(orden.total, monedaTenant)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {orden.metodo_pago}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(orden.status)}`}>
                            {orden.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(orden.created_at).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => setOrdenDetalle(orden)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Paginación */}
          {ordenes.length > 0 && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={ordenes.length < limit}
                className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal detalle orden */}
      {ordenDetalle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">Orden #{ordenDetalle.numero_orden}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeColor(ordenDetalle.tipo_orden)}`}>
                    {ordenDetalle.tipo_orden}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(ordenDetalle.status)}`}>
                    {ordenDetalle.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOrdenDetalle(null)}
                className="text-2xl text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-200">
                {ordenDetalle.mesa_numero && (
                  <div>
                    <div className="text-sm text-slate-600">Mesa</div>
                    <div className="font-medium">Mesa {ordenDetalle.mesa_numero}</div>
                  </div>
                )}
                {ordenDetalle.cliente_nombre && (
                  <div>
                    <div className="text-sm text-slate-600">Cliente</div>
                    <div className="font-medium">{ordenDetalle.cliente_nombre}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-slate-600">Método de pago</div>
                  <div className="font-medium">{ordenDetalle.metodo_pago}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Fecha</div>
                  <div className="font-medium">
                    {new Date(ordenDetalle.created_at).toLocaleString("es-ES")}
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h3 className="font-bold mb-3">Productos</h3>
                <div className="space-y-2">
                  {ordenDetalle.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100">
                      <div>
                        <div className="font-medium">{item.nombre}</div>
                        <div className="text-sm text-slate-600">
                          {item.quantity} x {formatCurrency(item.precio, monedaTenant)}
                        </div>
                      </div>
                      <div className="font-medium">
                        {formatCurrency(item.precio * item.quantity, monedaTenant)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(ordenDetalle.subtotal, monedaTenant)}</span>
                </div>
                {ordenDetalle.descuento > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(ordenDetalle.descuento, monedaTenant)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(ordenDetalle.total, monedaTenant)}</span>
                </div>
                {ordenDetalle.monto_recibido > 0 && (
                  <>
                    <div className="flex justify-between pt-2">
                      <span>Monto recibido:</span>
                      <span>{formatCurrency(ordenDetalle.monto_recibido, monedaTenant)}</span>
                    </div>
                    {ordenDetalle.monto_recibido > ordenDetalle.total && (
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>Cambio:</span>
                        <span>{formatCurrency(ordenDetalle.monto_recibido - ordenDetalle.total, monedaTenant)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Notas */}
              {ordenDetalle.notas && (
                <div>
                  <h3 className="font-bold mb-2">Notas</h3>
                  <div className="bg-slate-50 p-3 rounded text-slate-700">
                    {ordenDetalle.notas}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-8 pt-6 border-t border-slate-200">
              <button
                onClick={() => setOrdenDetalle(null)}
                className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
