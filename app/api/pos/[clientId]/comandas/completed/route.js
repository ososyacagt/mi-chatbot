import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get("areaId");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Obtener hoy en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", clientId)
      .eq("origen", "pos")
      .in('pos_status', ['facturado_finalizado', 'entregado', 'cerrado'])
      .gte("created_at", `${today}T00:00:00`)
      .order("updated_at", { ascending: false });

    const { data: orders, error } = await query;

    console.log('[GET completadas] query ok:', !error, 'count:', orders?.length);
    if (error) console.log('[GET completadas] error:', error.message);

    if (error) throw error;

    // Filtrar comandas por área si se especifica
    const comandas = [];
    for (const order of orders || []) {
      const areaComandas = order.area_comandas || {};

      if (areaId && areaComandas[areaId]) {
        comandas.push({
          orderId: order.id,
          numeroOrden: order.numero_orden,
          mesa: order.tipo_orden === "mesa" ? (order.mesa_numero || order.mesa_id) : null,
          items: areaComandas[areaId],
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          clienteNombre: order.cliente_nombre || "Mostrador",
          status: order.status,
          posStatus: order.pos_status
        });
      } else if (!areaId) {
        Object.keys(areaComandas).forEach((aid) => {
          comandas.push({
            orderId: order.id,
            numeroOrden: order.numero_orden,
            areaId: aid,
            mesa: order.tipo_orden === "mesa" ? (order.mesa_numero || order.mesa_id) : null,
            items: areaComandas[aid],
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            clienteNombre: order.cliente_nombre || "Mostrador",
            status: order.status,
            posStatus: order.pos_status
          });
        });
      }
    }

    return NextResponse.json({ comandas });
  } catch (error) {
    console.error("[GET /api/pos/[clientId]/comandas/completed] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener comandas completadas" },
      { status: 500 }
    );
  }
}
