import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { orderId } = await params;

    console.log("[orden] orderId:", orderId);

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId es requerido" },
        { status: 400 }
      );
    }

    console.log("[GET /api/orden/[orderId]] Buscando orden:", orderId);

    const supabase = createSupabaseAdmin();

    // Obtener orden
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    console.log("[orden] resultado:", { data: order, error: orderError });

    if (orderError || !order) {
      console.error("[orden-api] Orden no encontrada:", orderId, "Error:", orderError);
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Obtener datos del tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select(
        `
        id,
        nombre,
        store_name,
        store_logo,
        store_banner,
        colorPrimary,
        ecommerce_mode,
        whatsapp_number,
        currency,
        topbar_message
      `
      )
      .eq("id", order.tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("[orden-api] Tenant no encontrado:", order.tenant_id);
      return NextResponse.json(
        { error: "Tienda no encontrada" },
        { status: 404 }
      );
    }

    console.log("[orden-api] ✓ Orden encontrada:", {
      numero_orden: order.numero_orden,
      tenant: tenant.nombre,
    });

    return NextResponse.json({
      order,
      tenant,
    });
  } catch (error) {
    console.error("[GET /api/orden/[orderId]] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener la orden" },
      { status: 500 }
    );
  }
}
