import { supabase } from "@/lib/supabase";
import { getCategories, getProducts } from "@/lib/store";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return Response.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    console.log("[GET /api/store/[clientId]] Obteniendo configuración para:", clientId);

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (tenantError || !tenant) {
      return Response.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (tenant.ecommerce_mode === "none") {
      return Response.json(
        { error: "E-commerce no habilitado" },
        { status: 403 }
      );
    }

    const categories = await getCategories(tenant.id);
    const products = await getProducts(tenant.id);

    const { data: storeConfig } = await supabase
      .from("store_settings")
      .select("*")
      .eq("tenant_id", tenant.id)
      .single();

    console.log("[GET /api/store/[clientId]] ✓ Retornando configuración");

    return Response.json({
      tenant: {
        id: tenant.id,
        nombre: storeConfig?.store_name || tenant.nombre,
        whatsapp: storeConfig?.whatsapp_number,
        moneda: storeConfig?.currency || "USD",
        colorPrimary: storeConfig?.primary_color || "#3b82f6",
        logo: storeConfig?.logo_url,
        banner: storeConfig?.banner_url,
      },
      categories,
      products,
    });
  } catch (error) {
    console.error("[GET /api/store/[clientId]] Error completo:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return Response.json(
      { error: "Error al obtener configuración de tienda" },
      { status: 500 }
    );
  }
}
