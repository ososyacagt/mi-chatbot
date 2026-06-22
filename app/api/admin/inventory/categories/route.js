import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const { data: categories } = await supabase
      .from("product_categories")
      .select("*")
      .eq("tenant_id", tenant.id)
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

    console.log("[POST /api/admin/inventory/categories] Creando categoría para:", clientId);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const { data: category, error } = await supabase
      .from("product_categories")
      .insert([
        {
          tenant_id: tenant.id,
          nombre: body.nombre,
          descripcion: body.descripcion,
          emoji: body.emoji,
          orden: body.orden,
          activo: body.activo !== false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    console.log("[POST /api/admin/inventory/categories] ✓ Creada:", category.id);

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/categories] Error completo:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Error al crear categoría" },
      { status: 500 }
    );
  }
}
