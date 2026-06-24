import { NextResponse } from "next/server";
import { getSession, getAdminUser } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId requerido" },
        { status: 400 }
      );
    }

    console.log("[plan-info] Obteniendo info para clientId:", clientId);

    const supabase = createSupabaseAdmin();

    // Obtener plan del tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("plan")
      .eq("client_id", clientId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("slug", tenant?.plan || "basic")
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    // Contar actuales
    const [
      { count: countProductos },
      { count: countCategorias },
      { count: countReglas },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", clientId),
      supabase
        .from("categories")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", clientId),
      supabase
        .from("business_rules")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", clientId),
    ]);

    const currentProductos = countProductos || 0;
    const currentCategorias = countCategorias || 0;
    const currentReglas = countReglas || 0;

    const maxProductos = plan?.max_productos || 0;
    const maxCategorias = plan?.max_categorias || 0;
    const maxReglas = plan?.max_reglas || 0;

    console.log("[plan-info] Datos:", {
      plan: tenant?.plan,
      currentProductos,
      maxProductos,
      currentCategorias,
      maxCategorias,
      currentReglas,
      maxReglas,
    });

    return NextResponse.json({
      planNombre: plan?.nombre || "Basic",
      planSlug: tenant?.plan || "basic",
      ecommerceModes: plan?.ecommerce_modes || [],
      maxProductos,
      currentProductos,
      maxCategorias,
      currentCategorias,
      maxReglas,
      currentReglas,
      chatbotPedidos: plan?.chatbot_pedidos || false,
      tiendaCompleta: plan?.tienda_completa || false,
      atLimit: {
        productos: maxProductos > 0 && currentProductos >= maxProductos,
        categorias: maxCategorias > 0 && currentCategorias >= maxCategorias,
        reglas: maxReglas > 0 && currentReglas >= maxReglas,
      },
      nearLimit: {
        productos: maxProductos > 0 && currentProductos >= (maxProductos * 0.8),
        categorias: maxCategorias > 0 && currentCategorias >= (maxCategorias * 0.8),
        reglas: maxReglas > 0 && currentReglas >= (maxReglas * 0.8),
      },
    });
  } catch (error) {
    console.error("[plan-info] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
