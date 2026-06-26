import { getSession, getAdminUser, isSuperAdmin } from '@/lib/auth'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const parseJsonbArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch {
      return value.includes(',')
        ? value.split(',').map(v => v.trim())
        : value ? [value] : []
    }
  }
  return []
}

const parseDate = (ts) => {
  if (!ts) return new Date()
  const withZ = ts.endsWith('Z') ? ts : ts + 'Z'
  return new Date(withZ)
}

const getDateString = (date) => date.toISOString().substring(0, 10)
const getMonth = (date) => date.toISOString().substring(0, 7)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const tipo = searchParams.get('tipo') || 'all'
    let fechaInicio = searchParams.get('fechaInicio')
    let fechaFin = searchParams.get('fechaFin')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId requerido' }, { status: 400 })
    }

    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const adminUser = await getAdminUser(user.id)
    if (!adminUser) {
      return NextResponse.json({ error: 'No tiene permisos de admin' }, { status: 403 })
    }

    if (!isSuperAdmin(adminUser)) {
      if (!adminUser.tenant_ids?.includes(clientId)) {
        return NextResponse.json({ error: 'Sin acceso a este cliente' }, { status: 403 })
      }
    }

    const today = new Date()
    const yesterday = new Date(today.getTime() - 86400000)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const firstDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0)

    if (!fechaInicio) {
      fechaInicio = getDateString(firstDayOfMonth)
    }
    if (!fechaFin) {
      fechaFin = getDateString(today)
    }

    const startBroad = getDateString(
      new Date(Math.min(
        parseDate(fechaInicio).getTime(),
        firstDayOfPrevMonth.getTime()
      ))
    )
    const endBroad = getDateString(
      new Date(Math.max(
        parseDate(fechaFin).getTime(),
        today.getTime()
      ))
    )

    const supabase = createSupabaseAdmin()

    const [ordersResult, posUsersResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, metodo_pago, items, created_at, cajero_id, origen, status')
        .eq('tenant_id', clientId)
        .gte('created_at', startBroad + 'T00:00:00')
        .lte('created_at', endBroad + 'T23:59:59'),
      supabase
        .from('pos_users')
        .select('id, nombre')
        .eq('tenant_id', clientId)
    ])

    if (ordersResult.error) throw ordersResult.error
    if (posUsersResult.error) throw posUsersResult.error

    let orders = ordersResult.data || []

    if (tipo === 'pos') {
      orders = orders.filter(o => o.origen === 'pos')
    } else if (tipo === 'ecommerce') {
      orders = orders.filter(o => o.origen !== 'pos')
    }

    const posUsers = posUsersResult.data || []
    const posUserMap = Object.fromEntries(posUsers.map(u => [u.id, u.nombre]))

    const todayStr = getDateString(today)
    const yesterdayStr = getDateString(yesterday)
    const currentMonth = getMonth(today)
    const prevMonth = getMonth(lastDayOfPrevMonth)

    const ordersHoy = orders.filter(o => getDateString(parseDate(o.created_at)) === todayStr)
    const ordersAyer = orders.filter(o => getDateString(parseDate(o.created_at)) === yesterdayStr)
    const ordersThisMonth = orders.filter(o => getMonth(parseDate(o.created_at)) === currentMonth)
    const ordersPrevMonth = orders.filter(o => getMonth(parseDate(o.created_at)) === prevMonth)

    const ventasHoy = ordersHoy.reduce((sum, o) => sum + (o.total || 0), 0)
    const ventasAyer = ordersAyer.reduce((sum, o) => sum + (o.total || 0), 0)
    const ventasMes = ordersThisMonth.reduce((sum, o) => sum + (o.total || 0), 0)
    const ventasMesAnt = ordersPrevMonth.reduce((sum, o) => sum + (o.total || 0), 0)

    const cambioHoy = ventasAyer === 0 ? 0 : ((ventasHoy - ventasAyer) / ventasAyer) * 100
    const cambioMes = ventasMesAnt === 0 ? 0 : ((ventasMes - ventasMesAnt) / ventasMesAnt) * 100
    const ordenesHoy = ordersHoy.length
    const ticketPromedio = ordenesHoy > 0 ? ventasHoy / ordenesHoy : 0

    const ventasPorDiaMap = {}
    orders.forEach(order => {
      const fecha = getDateString(parseDate(order.created_at))
      if (fecha >= fechaInicio && fecha <= fechaFin) {
        if (!ventasPorDiaMap[fecha]) {
          ventasPorDiaMap[fecha] = { total: 0, ordenes: 0 }
        }
        ventasPorDiaMap[fecha].total += order.total || 0
        ventasPorDiaMap[fecha].ordenes += 1
      }
    })
    const ventasPorDia = Object.entries(ventasPorDiaMap)
      .map(([fecha, data]) => ({ fecha, ...data }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))

    const productosMap = {}
    orders.forEach(order => {
      const items = parseJsonbArray(order.items)
      items.forEach(item => {
        if (item && item.nombre) {
          const key = item.nombre
          const cantidad = item.cantidad || item.quantity || 1
          const precio = item.precio || item.price || 0
          if (!productosMap[key]) {
            productosMap[key] = { nombre: key, cantidad: 0, total: 0 }
          }
          productosMap[key].cantidad += cantidad
          productosMap[key].total += cantidad * precio
        }
      })
    })
    const topProductos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)

    const metodoPagoMap = {}
    orders.forEach(order => {
      const metodo = order.metodo_pago || 'otros'
      if (!metodoPagoMap[metodo]) {
        metodoPagoMap[metodo] = { metodo, total: 0, ordenes: 0 }
      }
      metodoPagoMap[metodo].total += order.total || 0
      metodoPagoMap[metodo].ordenes += 1
    })
    const totalVentas = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const porMetodoPago = Object.values(metodoPagoMap)
      .map(m => ({
        ...m,
        porcentaje: totalVentas > 0 ? (m.total / totalVentas) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)

    const horasPicoArray = Array(24).fill(null).map((_, i) => ({ hora: i, ordenes: 0 }))
    orders.forEach(order => {
      const ts = order.created_at
      const hora = parseInt(ts.substring(11, 13))
      if (hora >= 0 && hora < 24) {
        horasPicoArray[hora].ordenes += 1
      }
    })

    const posOrders = orders.filter(o => o.origen === 'pos')
    const cajeroMap = {}
    posOrders.forEach(order => {
      const cajeroPK = order.cajero_id
      if (cajeroPK) {
        if (!cajeroMap[cajeroPK]) {
          const cajeroNombre = posUserMap[cajeroPK] || 'Cajero (ID: ' + cajeroPK + ')'
          cajeroMap[cajeroPK] = { nombre: cajeroNombre, ordenes: 0, total: 0 }
        }
        cajeroMap[cajeroPK].ordenes += 1
        cajeroMap[cajeroPK].total += order.total || 0
      }
    })
    const rendimientoEquipo = Object.values(cajeroMap)
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({
      resumen: {
        ventasHoy,
        ventasAyer,
        cambioHoy,
        ventasMes,
        ventasMesAnt,
        cambioMes,
        ordenesHoy,
        ticketPromedio: Number(ticketPromedio.toFixed(2))
      },
      ventasPorDia,
      topProductos,
      porMetodoPago,
      horasPico: horasPicoArray,
      rendimientoEquipo
    })
  } catch (error) {
    console.error('[GET /api/admin/analytics] Error:', error.message)
    return NextResponse.json(
      { error: 'Error al procesar: ' + error.message },
      { status: 500 }
    )
  }
}
