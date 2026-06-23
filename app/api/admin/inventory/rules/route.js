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

    console.log("[GET /api/admin/inventory/rules] Obteniendo reglas para:", clientId);

    const supabase = createSupabaseAdmin();
    const { data: rules } = await supabase
      .from("business_rules")
      .select("*")
      .eq("tenant_id", clientId)
      .order("prioridad", { ascending: true });

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    console.error("[GET /api/admin/inventory/rules] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al obtener reglas" },
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

    console.log("[POST /api/admin/inventory/rules] Creando regla para:", clientId);

    const supabase = createSupabaseAdmin();
    const { data: rule, error } = await supabase
      .from("business_rules")
      .insert([
        {
          tenant_id: clientId,
          tipo: body.tipo,
          nombre: body.nombre,
          condiciones: body.condiciones,
          acciones: body.acciones,
          fecha_inicio: body.fecha_inicio || null,
          fecha_fin: body.fecha_fin || null,
          activo: body.activo !== false,
          prioridad: body.prioridad || 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    console.log("[POST /api/admin/inventory/rules] ✓ Regla creada:", rule.id);

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/rules] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al crear regla" },
      { status: 500 }
    );
  }
}
