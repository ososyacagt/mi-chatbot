import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    console.log("[GET /api/store/[clientId]] Obteniendo tienda para:", clientId);

    const supabase = createSupabaseAdmin();

    // Obtener tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (tenant.ecommerce_mode === "none") {
      return NextResponse.json(
        { error: "E-commerce no habilitado" },
        { status: 403 }
      );
    }

    // Obtener categorías con productos
    const { data: categories = [] } = await supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("activo", true)
      .order("orden", { ascending: true });

    // Obtener productos con variantes
    const { data: products = [] } = await supabase
      .from("products")
      .select("*, variantes:product_variants(*)")
      .eq("tenant_id", tenant.id)
      .eq("activo", true)
      .order("nombre", { ascending: true });

    console.log("[GET /api/store/[clientId]] ✓ Retornando tienda:", {
      tenant: tenant.nombre,
      categorias: categories.length,
      productos: products.length,
    });

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        nombre: tenant.store_name || tenant.nombre,
        colorPrimary: tenant.store_logo ? undefined : "#3b82f6",
        whatsappNumber: tenant.whatsapp_number,
        currency: tenant.currency || "USD",
        storeName: tenant.store_name || tenant.nombre,
        storeLogo: tenant.store_logo,
        storeBanner: tenant.store_banner,
        topbarMessage: tenant.topbar_message || "Bienvenido a nuestra tienda",
        minOrderAmount: tenant.min_order_amount || 0,
        paymentMethods: tenant.payment_methods || [],
        ecommerceMode: tenant.ecommerce_mode,
      },
      categories,
      products,
    });
  } catch (error) {
    console.error("[GET /api/store/[clientId]] Error completo:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Error al obtener configuración de tienda" },
      { status: 500 }
    );
  }
}
