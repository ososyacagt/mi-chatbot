import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser) {
      return NextResponse.json(
        { error: "No eres administrador" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const fechaInicio = searchParams.get("fecha_inicio");
    const fechaFin = searchParams.get("fecha_fin");
    const cliente = searchParams.get("cliente");
    const status = searchParams.get("status");
    const tipoOrden = searchParams.get("tipo_orden");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    console.log("[GET /api/admin/pos-orders] Obteniendo órdenes POS para:", clientId);

    const supabase = createSupabaseAdmin();

    // Query base para órdenes POS
    let query = supabase
      .from("orders")
      .select(
        "id, numero_orden, cliente_nombre, cliente_telefono, cliente_direccion, items, subtotal, descuento, total, moneda, metodo_pago, tipo_orden, mesa_id, mesa_numero, status, monto_recibido, notas, created_at",
        { count: "exact" }
      )
      .eq("tenant_id", clientId)
      .eq("origen", "pos")
      .order("created_at", { ascending: false });

    // Aplicar filtros dinámicos
    if (fechaInicio) {
      query = query.gte("created_at", fechaInicio + "T00:00:00");
    }

    if (fechaFin) {
      query = query.lte("created_at", fechaFin + "T23:59:59");
    }

    if (cliente) {
      query = query.ilike("cliente_nombre", `%${cliente}%`);
    }

    if (status && status !== "todas") {
      query = query.eq("status", status);
    }

    if (tipoOrden && tipoOrden !== "todos") {
      query = query.eq("tipo_orden", tipoOrden);
    }

    // Ejecutar query con paginación
    const { data: orders, count, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // Calcular totales
    const totales = {
      cantidad: count || 0,
      subtotal: 0,
      total: 0,
      por_metodo_pago: {
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        otros: 0
      },
      por_status: {
        pendiente: 0,
        cerrado: 0,
        cancelado: 0
      },
      por_tipo: {
        mostrador: 0,
        mesa: 0,
        llevar: 0,
        autoservicio: 0
      }
    };

    // Obtener todas las órdenes para cálculos de totales (sin paginación)
    const { data: allOrders } = await supabase
      .from("orders")
      .select("total, metodo_pago, status, tipo_orden, subtotal, descuento")
      .eq("tenant_id", clientId)
      .eq("origen", "pos");

    if (allOrders) {
      allOrders.forEach((order) => {
        totales.subtotal += order.subtotal || 0;
        totales.total += order.total || 0;

        // Por método de pago
        if (order.metodo_pago) {
          if (totales.por_metodo_pago[order.metodo_pago] !== undefined) {
            totales.por_metodo_pago[order.metodo_pago]++;
          } else {
            totales.por_metodo_pago.otros++;
          }
        }

        // Por status
        if (order.status && totales.por_status[order.status] !== undefined) {
          totales.por_status[order.status]++;
        }

        // Por tipo de orden
        if (order.tipo_orden && totales.por_tipo[order.tipo_orden] !== undefined) {
          totales.por_tipo[order.tipo_orden]++;
        }
      });
    }

    console.log(
      `[GET /api/admin/pos-orders] ✓ ${orders?.length || 0} órdenes POS obtenidas (total: ${count})`
    );

    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      limit,
      offset,
      totales
    });
  } catch (error) {
    console.error("[GET /api/admin/pos-orders] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener órdenes POS: " + error.message },
      { status: 500 }
    );
  }
}
