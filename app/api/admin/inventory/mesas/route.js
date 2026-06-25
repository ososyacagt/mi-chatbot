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

    const supabase = createSupabaseAdmin();
    const { data: mesas, error } = await supabase
      .from("pos_tables")
      .select("*")
      .eq("tenant_id", clientId)
      .order("numero", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ mesas: mesas || [] });
  } catch (error) {
    console.error("[GET /api/admin/inventory/mesas] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener mesas" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    console.log('[POST mesas] body recibido:', JSON.stringify(body, null, 2));
    console.log('[POST mesas] numero:', body.numero, '| numero_mesa:', body.numero_mesa);

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    if (body.numero === undefined || body.numero === null) {
      console.log('[POST mesas] Error: numero es undefined/null');
      return NextResponse.json(
        { error: "número es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: mesa, error } = await supabase
      .from("pos_tables")
      .insert({
        tenant_id: clientId,
        numero: String(body.numero),
        nombre: body.nombre || null,
        capacidad: parseInt(body.capacidad) || 4,
        activo: true
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[POST mesas] ✓ Mesa creada:', mesa.id);
    return NextResponse.json({ mesa }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/mesas] Error:", error.message);
    console.error("[POST /api/admin/inventory/mesas] Stack:", error.stack);
    return NextResponse.json(
      { error: "Error al crear mesa: " + error.message },
      { status: 500 }
    );
  }
}
