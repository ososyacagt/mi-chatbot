import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";

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

    console.log("[GET /api/admin/inventory/config] Obteniendo config para:", clientId);

    const supabase = createSupabaseAdmin();
    const { data: tenant } = await supabase
      .from("tenants")
      .select(
        "id, ecommerce_mode, whatsapp_number, currency, store_name, store_logo, store_banner, topbar_message, min_order_amount, payment_methods, nombre"
      )
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

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

    console.log("[PUT /api/admin/inventory/config] Actualizando config para:", clientId);

    const supabase = createSupabaseAdmin();
    const { data: config, error } = await supabase
      .from("tenants")
      .update({
        ecommerce_mode: body.ecommerce_mode,
        whatsapp_number: body.whatsapp_number,
        currency: body.currency,
        store_name: body.store_name,
        store_logo: body.store_logo,
        store_banner: body.store_banner,
        topbar_message: body.topbar_message,
        min_order_amount: body.min_order_amount,
        payment_methods: body.payment_methods,
      })
      .eq("client_id", clientId)
      .select()
      .single();

    if (error) throw error;

    console.log("[PUT /api/admin/inventory/config] ✓ Actualizada:", clientId);

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
