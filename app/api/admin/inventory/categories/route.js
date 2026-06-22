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

    console.log("[GET /api/admin/inventory/categories] Obteniendo categorías para:", clientId);

    const supabase = createSupabaseAdmin();
    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", clientId)
      .order("orden", { ascending: true });

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error("[GET /api/admin/inventory/categories] Error completo:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getSession();
    console.log('[POST categories] session:', !!user);

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

    console.log("[POST categories] body recibido:", body);
    console.log("[POST /api/admin/inventory/categories] Validando campos:", {
      nombre: body.nombre,
      orden: body.orden,
      emoji: body.emoji,
      descripcion: body.descripcion,
    });

    if (!clientId) {
      console.error("[POST /api/admin/inventory/categories] clientId faltante");
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    if (!body.nombre) {
      console.error("[POST /api/admin/inventory/categories] nombre faltante");
      return NextResponse.json(
        { error: "nombre es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const insertData = {
      tenant_id: clientId,
      nombre: body.nombre,
      descripcion: body.descripcion || "",
      emoji: body.emoji || "",
      orden: parseInt(body.orden) || 0,
      activo: body.activo !== false,
    };

    console.log('[POST categories] insert data:', insertData);

    const { data: category, error } = await supabase
      .from("categories")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.log('[POST categories] supabase error:', error);
      throw error;
    }

    console.log("[POST /api/admin/inventory/categories] ✓ Categoría creada:", category.id);

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/categories] Error completo:", {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Error al crear categoría: " + error.message },
      { status: 500 }
    );
  }
}
