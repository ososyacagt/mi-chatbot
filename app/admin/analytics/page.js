'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Toast from '../components/Toast'

const colorsByMetodo = {
  efectivo: '#10b981',
  tarjeta: '#3b82f6',
  transferencia: '#a855f7',
  whatsapp: '#14b8a6',
  otros: '#71717a'
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [periodo, setPeriodo] = useState('mes')
  const [customStart, setCustomStart] = useState(null)
  const [customEnd, setCustomEnd] = useState(null)
  const [tipo, setTipo] = useState('all')

  const [data, setData] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  useEffect(() => {
    async function loadData() {
      if (!clientId) {
        setError('Cliente no especificado')
        setLoading(false)
        return
      }

      // Validar que si el período es custom, ambas fechas estén completas
      if (periodo === 'custom' && (!customStart || !customEnd)) {
        setError('Por favor ingresa fecha de inicio y fin para el rango personalizado')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const today = new Date()
        const oneWeekAgo = new Date(today.getTime() - 7 * 86400000)
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

        let fechaInicio, fechaFin

        if (periodo === 'hoy') {
          fechaInicio = today.toISOString().substring(0, 10)
          fechaFin = today.toISOString().substring(0, 10)
        } else if (periodo === 'semana') {
          fechaInicio = oneWeekAgo.toISOString().substring(0, 10)
          fechaFin = today.toISOString().substring(0, 10)
        } else if (periodo === 'mes') {
          fechaInicio = firstDayOfMonth.toISOString().substring(0, 10)
          fechaFin = today.toISOString().substring(0, 10)
        } else if (periodo === 'custom') {
          fechaInicio = customStart
          fechaFin = customEnd
        }

        const [tenantRes, analyticsRes] = await Promise.all([
          fetch(`/api/tenants/${clientId}`),
          fetch(
            `/api/admin/analytics?clientId=${clientId}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&tipo=${tipo}`
          )
        ])

        if (!tenantRes.ok) throw new Error('No se pudo obtener datos del cliente')
        const tenantData = await tenantRes.json()
        setTenant(tenantData.tenant)

        if (!analyticsRes.ok) throw new Error('No se pudo obtener analíticas')
        const analyticsData = await analyticsRes.json()
        setData(analyticsData)
      } catch (err) {
        console.error('[Analytics] Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [clientId, periodo, tipo, customStart, customEnd])

  const handlePeriodChange = (newPeriodo) => {
    setError(null)
    setPeriodo(newPeriodo)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg max-w-md mx-auto mt-4">
        Error: {error}
      </div>
    )
  }

  if (!data || !tenant) {
    return (
      <div className="p-4 text-zinc-600">
        No hay datos disponibles
      </div>
    )
  }

  const { resumen, ventasPorDia, topProductos, porMetodoPago, horasPico, rendimientoEquipo } = data

  const maxVentasDia = Math.max(...ventasPorDia.map(d => d.total), 1)
  const maxMetodoPago = Math.max(...porMetodoPago.map(m => m.total), 1)
  const maxHoras = Math.max(...horasPico.map(h => h.ordenes), 1)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercent = (value) => {
    return (value > 0 ? '+' : '') + value.toFixed(1) + '%'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Volver
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              📊 Analíticas y Reportes
            </h1>
          </div>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">
          Cliente: <span className="font-semibold text-zinc-900 dark:text-white">{tenant.nombre}</span>
        </p>
      </div>

      {/* Selectores */}
      <div className="mb-8 space-y-4">
        {/* Período */}
        <div className="flex gap-2 flex-wrap">
          {['hoy', 'semana', 'mes'].map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                periodo === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : 'Este mes'}
            </button>
          ))}
          <button
            onClick={() => handlePeriodChange('custom')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              periodo === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            Rango personalizado
          </button>
        </div>

        {/* Custom range inputs */}
        {periodo === 'custom' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customStart || ''}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
            />
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">a</span>
            <input
              type="date"
              value={customEnd || ''}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
            />
            {!customStart || !customEnd ? (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Completa ambas fechas
              </span>
            ) : customStart > customEnd ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                Fecha inicio debe ser menor
              </span>
            ) : null}
          </div>
        )}

        {/* Tipo */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Todo' },
            { value: 'ecommerce', label: 'Solo E-commerce' },
            { value: 'pos', label: 'Solo POS' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTipo(value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                tipo === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Ventas hoy */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Ventas hoy</p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {formatCurrency(resumen.ventasHoy)}
              </p>
              <p className={`text-xs font-semibold mt-2 ${
                resumen.cambioHoy > 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {formatPercent(resumen.cambioHoy)} vs ayer
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        {/* Ventas mes */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Ventas del mes</p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {formatCurrency(resumen.ventasMes)}
              </p>
              <p className={`text-xs font-semibold mt-2 ${
                resumen.cambioMes > 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {formatPercent(resumen.cambioMes)} vs mes ant.
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>

        {/* Órdenes hoy */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Órdenes hoy</p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {resumen.ordenesHoy}
              </p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        {/* Ticket promedio */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Ticket promedio</p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
                {formatCurrency(resumen.ticketPromedio)}
              </p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Gráfica de ventas por día */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
          Ventas por día
        </h2>

        {ventasPorDia.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            Sin ventas en este período
          </div>
        ) : (
          <div className="flex items-end justify-between gap-1 h-64 overflow-x-auto pb-4">
            {ventasPorDia.map((day) => (
              <div
                key={day.fecha}
                className="flex flex-col items-center gap-2 flex-shrink-0"
              >
                <div className="relative h-48 w-6">
                  <div
                    className="absolute bottom-0 w-full rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${(day.total / maxVentasDia) * 100}%`,
                      backgroundColor: tenant.colorPrimary || '#3b82f6',
                    }}
                    title={`${day.fecha}: ${formatCurrency(day.total)}`}
                  />
                </div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {new Date(day.fecha + 'T00:00:00Z').toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top productos */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
            Top 10 productos
          </h2>

          {topProductos.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              Sin productos vendidos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300">#</th>
                    <th className="text-left py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300">Producto</th>
                    <th className="text-right py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300">Cantidad</th>
                    <th className="text-right py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductos.map((product, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <td className="py-3 px-2 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-2 text-zinc-900 dark:text-white truncate">
                        {product.nombre}
                      </td>
                      <td className="text-right py-3 px-2 text-zinc-900 dark:text-white">
                        {product.cantidad}
                      </td>
                      <td className="text-right py-3 px-2 text-zinc-900 dark:text-white font-semibold">
                        {formatCurrency(product.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ventas por método de pago */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
            Ventas por método de pago
          </h2>

          {porMetodoPago.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              Sin datos
            </div>
          ) : (
            <div className="space-y-4">
              {porMetodoPago.map((metodo) => (
                <div key={metodo.metodo}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="capitalize font-medium text-zinc-700 dark:text-zinc-300 text-sm">
                      {metodo.metodo}
                    </span>
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      {metodo.porcentaje.toFixed(1)}% · {metodo.ordenes} órdenes
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(metodo.total / maxMetodoPago) * 100}%`,
                        backgroundColor: colorsByMetodo[metodo.metodo] || colorsByMetodo.otros,
                      }}
                    />
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {formatCurrency(metodo.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Horas pico */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 my-8">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
          Horas pico
        </h2>

        <div className="flex items-end justify-between gap-1 h-48 overflow-x-auto pb-4">
          {horasPico.map((hora) => {
            const isMax = hora.ordenes === maxHoras && maxHoras > 0
            return (
              <div
                key={hora.hora}
                className="flex flex-col items-center gap-2 flex-shrink-0"
              >
                <div className="relative h-32 w-6">
                  <div
                    className="absolute bottom-0 w-full rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${(hora.ordenes / maxHoras) * 100}%`,
                      backgroundColor: isMax
                        ? tenant.colorPrimary || '#3b82f6'
                        : '#d4d4d8',
                    }}
                    title={`${hora.hora}h: ${hora.ordenes} órdenes`}
                  />
                </div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {String(hora.hora).padStart(2, '0')}h
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rendimiento del equipo */}
      {tipo !== 'ecommerce' && rendimientoEquipo.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
            Rendimiento del equipo
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Cajero
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Órdenes
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Total cobrado
                  </th>
                </tr>
              </thead>
              <tbody>
                {rendimientoEquipo.map((cajero) => (
                  <tr
                    key={cajero.nombre}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <td className="py-3 px-4 text-zinc-900 dark:text-white font-medium">
                      {cajero.nombre}
                    </td>
                    <td className="text-right py-3 px-4 text-zinc-900 dark:text-white">
                      {cajero.ordenes}
                    </td>
                    <td className="text-right py-3 px-4 text-zinc-900 dark:text-white font-semibold">
                      {formatCurrency(cajero.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  )
}
