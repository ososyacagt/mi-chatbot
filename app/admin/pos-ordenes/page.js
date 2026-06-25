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
  const [posStatus, setPosStatus] = useState("todas");
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
  }, [clientId, fechaInicio, fechaFin, cliente, status, posStatus, tipoOrden, offset]);

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
      if (posStatus && posStatus !== "todas") params.append("pos_status", posStatus);
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
    setPosStatus("todas");
    setTipoOrden("todos");
    setOffset(0);
  };

  const getBadgeColor = (tipo) => {
    switch (tipo) {
      case "mostrador":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "mesa":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      case "para_llevar":
      case "llevar":
        return "bg-orange-100 text-orange-800 border border-orange-200";
      case "autoservicio":
      case "auto_servicio":
        return "bg-green-100 text-green-800 border border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getStatusBadge = (stat) => {
    switch (stat) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-850 border border-yellow-200";
      case "completada":
      case "cerrado":
        return "bg-green-100 text-green-850 border border-green-200";
      case "cancelado":
      case "cancelada":
        return "bg-red-100 text-red-850 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getPosStatusBadge = (stat) => {
    switch (stat) {
      case "ingresando":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "enviada":
        return "bg-indigo-100 text-indigo-850 border border-indigo-200";
      case "en_preparacion":
        return "bg-amber-100 text-amber-850 border border-amber-200 animate-pulse";
      case "lista":
        return "bg-lime-100 text-lime-850 border border-lime-200";
      case "pendiente_cobro":
        return "bg-yellow-100 text-yellow-850 border border-yellow-200";
      case "facturado_pendiente_entrega":
        return "bg-teal-100 text-teal-850 border border-teal-200";
      case "facturado_finalizado":
        return "bg-emerald-100 text-emerald-850 border border-emerald-200";
      case "cancelada":
        return "bg-red-100 text-red-850 border border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border border-slate-200";
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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm"
            >
              ← Volver
            </button>
            <h1 className="text-3xl font-black text-slate-800">🖥️ Historial de Órdenes POS</h1>
          </div>
        </div>

        {/* Selector de cliente (si es superadmin) */}
        {isSuperadmin && (
          <div className="mb-6 bg-slate-50 border border-slate-200/60 p-4 rounded-xl max-w-md">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Seleccionar Cliente:
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg w-full bg-white font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-slate-50/50 p-4 border border-slate-200/40 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Cliente / Mesa
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  setOffset(0);
                }}
                placeholder="Buscar por nombre"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status General
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700"
              >
                <option value="todas">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status POS
              </label>
              <select
                value={posStatus}
                onChange={(e) => {
                  setPosStatus(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700"
              >
                <option value="todas">Todos</option>
                <option value="ingresando">Ingresando (Carrito)</option>
                <option value="enviada">Enviada Cocina</option>
                <option value="en_preparacion">En Preparación</option>
                <option value="lista">Lista / Preparada</option>
                <option value="pendiente_cobro">Pendiente Cobro</option>
                <option value="facturado_pendiente_entrega">Facturado (P. Entrega)</option>
                <option value="facturado_finalizado">Facturado Finalizado</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tipo de orden
              </label>
              <select
                value={tipoOrden}
                onChange={(e) => {
                  setTipoOrden(e.target.value);
                  setOffset(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700"
              >
                <option value="todos">Todos</option>
                <option value="mostrador">🏪 Mostrador</option>
                <option value="mesa">📋 Mesa</option>
                <option value="para_llevar">🥡 Para llevar</option>
                <option value="auto_servicio">🤖 Auto-servicio</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {clientId && (
        <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Cards de totales */}
          {totales && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total órdenes</div>
                <div className="text-3xl font-black text-slate-900">
                  {totales.cantidad}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total facturado</div>
                <div className="text-2xl font-black text-slate-900">
                  {formatCurrency(totales.total, monedaTenant)}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Subtotal</div>
                <div className="text-2xl font-black text-slate-900">
                  {formatCurrency(totales.subtotal, monedaTenant)}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">Métodos de cobro</div>
                <div className="grid grid-cols-2 gap-x-2 text-xs font-semibold text-slate-600 mt-2">
                  <div className="flex justify-between">
                    <span>💵 Ef:</span>
                    <span className="font-bold text-slate-800">{totales.por_metodo_pago.efectivo || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💳 Tarj:</span>
                    <span className="font-bold text-slate-800">{totales.por_metodo_pago.tarjeta || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🏦 Trans:</span>
                    <span className="font-bold text-slate-800">{totales.por_metodo_pago.transferencia || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>⚙️ Otros:</span>
                    <span className="font-bold text-slate-800">{totales.por_metodo_pago.otros || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de órdenes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-16 text-center text-slate-500">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                Cargando órdenes...
              </div>
            ) : ordenes.length === 0 ? (
              <div className="p-16 text-center text-slate-500">
                <span className="text-4xl block mb-2">🔍</span>
                No hay órdenes registradas con los filtros actuales
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-6 py-4 text-left"># Orden</th>
                      <th className="px-6 py-4 text-left">Tipo</th>
                      <th className="px-6 py-4 text-left">Cliente / Mesa</th>
                      <th className="px-6 py-4 text-left">Items</th>
                      <th className="px-6 py-4 text-left">Total</th>
                      <th className="px-6 py-4 text-left">Método Pago</th>
                      <th className="px-6 py-4 text-left">Status General</th>
                      <th className="px-6 py-4 text-left">Status POS</th>
                      <th className="px-6 py-4 text-left">Fecha</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {ordenes.map((orden) => (
                      <tr key={orden.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          #{orden.numero_orden}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getBadgeColor(orden.tipo_orden)}`}>
                            {orden.tipo_orden === "auto_servicio" ? "auto-servicio" : orden.tipo_orden}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {orden.tipo_orden === "mesa" ? `Mesa ${orden.mesa_numero}` : (orden.cliente_nombre || "Mostrador")}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-500">
                          {orden.items?.length || 0}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          {formatCurrency(orden.total, monedaTenant)}
                        </td>
                        <td className="px-6 py-4 capitalize text-xs font-semibold text-slate-500">
                          {orden.metodo_pago}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadge(orden.status)}`}>
                            {orden.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getPosStatusBadge(orden.pos_status)}`}>
                            {orden.pos_status || "ingresando"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                          {new Date(orden.created_at).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setOrdenDetalle(orden)}
                            className="text-blue-600 hover:text-blue-700 font-bold text-xs"
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
            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 border border-slate-350 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-lg disabled:opacity-50 text-sm transition"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={ordenes.length < limit}
                className="px-4 py-2 border border-slate-350 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-lg disabled:opacity-50 text-sm transition"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal detalle orden */}
      {ordenDetalle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Orden #{ordenDetalle.numero_orden}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getBadgeColor(ordenDetalle.tipo_orden)}`}>
                    {ordenDetalle.tipo_orden}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusBadge(ordenDetalle.status)}`}>
                    {ordenDetalle.status}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getPosStatusBadge(ordenDetalle.pos_status)}`}>
                    POS: {ordenDetalle.pos_status || "ingresando"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOrdenDetalle(null)}
                className="text-3xl text-slate-400 hover:text-slate-600 font-medium"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-200">
                {ordenDetalle.mesa_numero && (
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mesa</div>
                    <div className="font-semibold text-slate-800">Mesa {ordenDetalle.mesa_numero}</div>
                  </div>
                )}
                {ordenDetalle.cliente_nombre && (
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cliente</div>
                    <div className="font-semibold text-slate-800">{ordenDetalle.cliente_nombre}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Método de pago</div>
                  <div className="font-semibold text-slate-800 capitalize">{ordenDetalle.metodo_pago}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Fecha / Hora</div>
                  <div className="font-semibold text-slate-800">
                    {new Date(ordenDetalle.created_at).toLocaleString("es-ES")}
                  </div>
                </div>

                {ordenDetalle.operador_nombre && (
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Operador POS</div>
                    <div className="font-semibold text-slate-800">{ordenDetalle.operador_nombre}</div>
                  </div>
                )}
                {ordenDetalle.cajero_nombre && (
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cajero</div>
                    <div className="font-semibold text-slate-800">{ordenDetalle.cajero_nombre}</div>
                  </div>
                )}
                {ordenDetalle.entrega_nombre && (
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Despachado por</div>
                    <div className="font-semibold text-slate-800">{ordenDetalle.entrega_nombre}</div>
                  </div>
                )}
              </div>

              {/* Productos */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Detalle de Productos</h3>
                <div className="space-y-2 border border-slate-100 rounded-2xl p-4">
                  {ordenDetalle.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 last:pb-0">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{item.nombre}</div>
                        <div className="text-xs text-slate-500 font-medium">
                          {item.quantity} x {formatCurrency(item.precio, monedaTenant)}
                        </div>
                      </div>
                      <div className="font-black text-slate-800">
                        {formatCurrency(item.precio * item.quantity, monedaTenant)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className="bg-slate-50 rounded-2xl p-5 space-y-2 border border-slate-100">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(ordenDetalle.subtotal, monedaTenant)}</span>
                </div>
                {ordenDetalle.descuento > 0 && (
                  <div className="flex justify-between text-sm text-red-600 font-medium">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(ordenDetalle.descuento, monedaTenant)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black border-t border-slate-200/80 pt-3 text-slate-900">
                  <span>Total:</span>
                  <span>{formatCurrency(ordenDetalle.total, monedaTenant)}</span>
                </div>
                {ordenDetalle.monto_recibido > 0 && (
                  <>
                    <div className="flex justify-between pt-2 text-sm text-slate-650 border-t border-slate-205 border-dashed">
                      <span>Monto recibido:</span>
                      <span>{formatCurrency(ordenDetalle.monto_recibido, monedaTenant)}</span>
                    </div>
                    {ordenDetalle.monto_recibido > ordenDetalle.total && (
                      <div className="flex justify-between text-green-600 text-sm font-bold">
                        <span>Cambio entregado:</span>
                        <span>{formatCurrency(ordenDetalle.monto_recibido - ordenDetalle.total, monedaTenant)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Notas */}
              {ordenDetalle.notas && (
                <div>
                  <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Notas del Pedido</h3>
                  <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl text-slate-700 text-sm font-medium">
                    {ordenDetalle.notas}
                  </div>
                </div>
              )}

              {/* Historial de POS */}
              {ordenDetalle.pos_historial && ordenDetalle.pos_historial.length > 0 && (
                <div className="border-t border-slate-200 pt-4 mt-6">
                  <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Historial de Estado (POS)</h3>
                  <div className="space-y-4 pl-4 border-l-2 border-slate-200">
                    {ordenDetalle.pos_historial.map((hist, idx) => (
                      <div key={idx} className="relative text-xs">
                        <div className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-350 border border-white" />
                        <div className="font-bold text-slate-800">
                          {hist.de ? `${hist.de} ➔ ` : "Creación: "}<span className="text-blue-600">{hist.a}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {new Date(hist.timestamp).toLocaleString("es-ES")} {hist.nota && `• ${hist.nota}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-8 pt-6 border-t border-slate-200">
              <button
                onClick={() => setOrdenDetalle(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
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
