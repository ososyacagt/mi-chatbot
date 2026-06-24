import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { clientId, orderId } = await params;

    if (!clientId || !orderId) {
      return NextResponse.json(
        { error: "clientId y orderId son requeridos" },
        { status: 400 }
      );
    }

    console.log("[GET /api/store/[clientId]/orden/[orderId]] Obteniendo orden:", {
      clientId,
      orderId,
    });

    const supabase = createSupabaseAdmin();

    // Verificar que el cliente existe
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Obtener la orden
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("tenant_id", clientId)
      .single();

    if (error || !order) {
      console.error("[GET /api/store/[clientId]/orden/[orderId]] Error:", error);
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    console.log("[GET /api/store/[clientId]/orden/[orderId]] ✓ Orden encontrada:", order.numero_orden);

    return NextResponse.json({
      order: {
        id: order.id,
        numero_orden: order.numero_orden,
        cliente_nombre: order.cliente_nombre,
        cliente_email: order.cliente_email,
        cliente_telefono: order.cliente_telefono,
        cliente_direccion: order.cliente_direccion,
        cliente_ciudad: order.cliente_ciudad,
        cliente_pais: order.cliente_pais,
        notas: order.notas,
        metodo_pago: order.metodo_pago,
        items: order.items,
        subtotal: order.subtotal,
        descuentos: order.descuentos,
        total: order.total,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
      },
    });
  } catch (error) {
    console.error("[GET /api/store/[clientId]/orden/[orderId]] Error completo:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Error al obtener la orden" },
      { status: 500 }
    );
  }
}
