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
      .from("pos_mesas")
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

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    if (body.numero === undefined || body.numero === null) {
      return NextResponse.json(
        { error: "número es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: mesa, error } = await supabase
      .from("pos_mesas")
      .insert({
        tenant_id: clientId,
        numero: body.numero,
        nombre: body.nombre || null,
        capacidad: body.capacidad || 4,
        estado: "libre"
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ mesa }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/mesas] Error:", error.message);
    return NextResponse.json(
      { error: "Error al crear mesa" },
      { status: 500 }
    );
  }
}
