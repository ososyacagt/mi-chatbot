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
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    console.log("[GET /api/admin/orders] Obteniendo órdenes para:", clientId);

    const supabase = createSupabaseAdmin();

    // Contar órdenes por status
    const { data: countByStatus } = await supabase
      .from("orders")
      .select("status", { count: "exact" })
      .eq("tenant_id", clientId);

    const statusCounts = {
      total: countByStatus?.length || 0,
      pendiente: 0,
      confirmada: 0,
      en_proceso: 0,
      entregada: 0,
      cancelada: 0,
    };

    countByStatus?.forEach((order) => {
      if (order.status && statusCounts.hasOwnProperty(order.status)) {
        statusCounts[order.status]++;
      }
    });
    statusCounts.total = Object.values(statusCounts).reduce(
      (sum, val) => (typeof val === "number" ? sum + val : sum),
      0
    ) / 6;

    // Obtener órdenes
    let query = supabase
      .from("orders")
      .select(
        "id, numero_orden, cliente_nombre, cliente_telefono, cliente_direccion, items, subtotal, total, metodo_pago, status, notas, created_at",
        { count: "exact" }
      )
      .eq("tenant_id", clientId)
      .order("created_at", { ascending: false });

    if (status && status !== "todas") {
      query = query.eq("status", status);
    }

    const { data: orders, count } = await query.range(offset, offset + limit - 1);

    console.log(
      `[GET /api/admin/orders] ✓ ${orders?.length || 0} órdenes obtenidas`
    );

    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      limit,
      offset,
      statusCounts,
    });
  } catch (error) {
    console.error("[GET /api/admin/orders] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener órdenes" },
      { status: 500 }
    );
  }
}
