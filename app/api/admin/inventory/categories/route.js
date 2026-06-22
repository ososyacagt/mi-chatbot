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

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", clientId)
      .single();

    console.log("[POST /api/admin/inventory/categories] Búsqueda de tenant:", {
      clientId,
      tenantFound: !!tenant,
      tenantError,
    });

    if (!tenant) {
      console.error("[POST /api/admin/inventory/categories] Tenant no encontrado para clientId:", clientId);
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const insertData = {
      tenant_id: tenant.id,
      nombre: body.nombre,
      descripcion: body.descripcion || "",
      emoji: body.emoji || "",
      orden: parseInt(body.orden) || 0,
      activo: body.activo !== false,
    };

    console.log('[POST categories] insert data:', insertData);

    const { data: category, error } = await supabase
      .from("product_categories")
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
