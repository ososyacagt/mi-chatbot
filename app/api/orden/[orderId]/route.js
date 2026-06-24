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
    console.log("[orden-api] Datos cliente:", {
      nombre: order?.cliente_nombre,
      telefono: order?.cliente_telefono,
      direccion: order?.cliente_direccion,
    });

    if (orderError || !order) {
      console.error("[orden-api] Orden no encontrada:", orderId, "Error:", orderError);
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Obtener datos del tenant
    console.log("[orden-api] Buscando tenant con client_id:", order.tenant_id);

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select(
        "nombre, color_primary, whatsapp_number, ecommerce_mode, store_name, store_logo, client_id, currency"
      )
      .eq("client_id", order.tenant_id)
      .single();

    console.log("[orden-api] Tenant resultado:", { tenant, error: tenantError });

    // Si no encuentra tenant, usar datos por defecto
    const tenantData = tenant || {
      nombre: "Tienda",
      color_primary: "#3b82f6",
      whatsapp_number: null,
      ecommerce_mode: "catalogo_whatsapp",
      store_name: "Tienda",
      store_logo: null,
      client_id: order.tenant_id,
      currency: order.currency || "USD",
    };

    console.log("[orden-api] ✓ Orden encontrada:", {
      numero_orden: order.numero_orden,
      tenant: tenantData.nombre,
    });

    return NextResponse.json({
      order,
      tenant: tenantData,
    });
  } catch (error) {
    console.error("[GET /api/orden/[orderId]] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener la orden" },
      { status: 500 }
    );
  }
}
