import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";
import { canUseEcommerceMode } from "@/lib/plan-limits";

async function authCheck() {
  const user = await getSession();
  if (!user) {
    return { error: "No autorizado", status: 401 };
  }

  const adminUser = await getAdminUser(user.id);
  if (!adminUser) {
    return { error: "No eres administrador", status: 403 };
  }

  return null;
}

export async function GET(request) {
  try {
    const authError = await authCheck();
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }


    const supabase = createSupabaseAdmin();
    const { data: tenant } = await supabase
      .from("tenants")
      .select(
        "id, ecommerce_mode, ecommerce_modes, whatsapp_number, currency, store_name, store_logo, store_banner, topbar_message, min_order_amount, payment_methods, nombre, pos_modalidad, pos_flujo_cobro"
      )
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    console.log('[GET config] Configuración cargada para:', clientId);
    console.log('[GET config] pos_modalidad:', tenant.pos_modalidad);
    console.log('[GET config] pos_flujo_cobro:', tenant.pos_flujo_cobro);

    return NextResponse.json({ config: tenant });
  } catch (error) {
    console.error("[GET /api/admin/inventory/config] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const authError = await authCheck();
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const body = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el plan permite todas las modalidades
    const modes = body.ecommerce_modes || [];
    for (const mode of modes) {
      const allowed = await canUseEcommerceMode(clientId, mode);
      if (!allowed) {
        return NextResponse.json({
          error: `Tu plan no incluye la modalidad "${mode}". Actualiza a Pro o Enterprise.`
        }, { status: 403 });
      }
    }

    const supabase = createSupabaseAdmin();

    console.log('[PUT config] Guardando configuración para:', clientId);
    console.log('[PUT config] pos_modalidad:', body.pos_modalidad);
    console.log('[PUT config] pos_flujo_cobro:', body.pos_flujo_cobro);

    const { data: config, error } = await supabase
      .from("tenants")
      .update({
        ecommerce_modes: body.ecommerce_modes || [],
        ecommerce_mode: body.ecommerce_modes?.[0] || 'none',
        whatsapp_number: body.whatsapp_number || null,
        currency: body.currency || 'USD',
        store_name: body.store_name || null,
        store_logo: body.store_logo || null,
        store_banner: body.store_banner || null,
        topbar_message: body.topbar_message || null,
        min_order_amount: body.min_order_amount !== '' && body.min_order_amount != null
          ? parseFloat(body.min_order_amount) : null,
        payment_methods: body.payment_methods || [],
        pos_modalidad: body.pos_modalidad || [],
        pos_flujo_cobro: body.pos_flujo_cobro || 'entrega_inmediata',
      })
      .eq("client_id", clientId)
      .select()
      .single();

    if (error) throw error;

    console.log('[PUT config] ✓ Configuración guardada:', { pos_modalidad: config.pos_modalidad, pos_flujo_cobro: config.pos_flujo_cobro });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[PUT /api/admin/inventory/config] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}
