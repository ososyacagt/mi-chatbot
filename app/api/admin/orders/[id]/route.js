import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";

const VALID_STATUSES = ["pendiente", "confirmada", "en_proceso", "entregada", "cancelada"];

export async function GET(request, { params }) {
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

    const { id } = await params;
    console.log("[GET /api/admin/orders/[id]] Obteniendo orden:", id);

    const supabase = createSupabaseAdmin();
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    console.log(`[GET /api/admin/orders/[id]] ✓ Orden obtenida: ${order.numero_orden}`);

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[GET /api/admin/orders/[id]] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener orden" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
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

    const { id } = await params;
    const body = await request.json();
    const { newStatus } = body;

    console.log(`[PUT /api/admin/orders/[id]] Actualizando orden ${id} a status: ${newStatus}`);

    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Obtener orden actual
    const { data: order, error: getError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (getError || !order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Preparar notas con historial
    const timestamp = new Date().toLocaleString("es-MX");
    const historyEntry = `[${timestamp}] Status cambió de "${order.status}" a "${newStatus}"`;
    const updatedNotes = order.notas
      ? `${order.notas}\n${historyEntry}`
      : historyEntry;

    // Si se cancela la orden, devolver stock
    if (newStatus === "cancelada" && order.status !== "cancelada") {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          await supabase.rpc("increment_product_stock", {
            product_id: item.productId,
            amount: item.quantity,
          });
        }
      }
    }

    // Actualizar orden
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        notas: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`[PUT /api/admin/orders/[id]] ✓ Orden actualizada a ${newStatus}`);

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("[PUT /api/admin/orders/[id]] Error:", error.message);
    return NextResponse.json(
      { error: "Error al actualizar orden" },
      { status: 500 }
    );
  }
}
