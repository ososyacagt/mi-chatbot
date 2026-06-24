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
    const { data: areas, error } = await supabase
      .from("pos_areas")
      .select("*")
      .eq("tenant_id", clientId)
      .order("orden", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ areas: areas || [] });
  } catch (error) {
    console.error("[GET /api/admin/inventory/areas] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener áreas" },
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

    if (!body.nombre || !body.tipo) {
      return NextResponse.json(
        { error: "nombre y tipo son requeridos" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: area, error } = await supabase
      .from("pos_areas")
      .insert({
        tenant_id: clientId,
        nombre: body.nombre,
        tipo: body.tipo,
        color: body.color || "#000000",
        orden: body.orden || 0,
        activo: body.activo !== false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ area }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/areas] Error:", error.message);
    return NextResponse.json(
      { error: "Error al crear área" },
      { status: 500 }
    );
  }
}
