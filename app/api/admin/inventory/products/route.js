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

    console.log("[GET /api/admin/inventory/products] Obteniendo productos para:", clientId);

    const supabase = createSupabaseAdmin();
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

    const { data: products } = await supabase
      .from("products")
      .select("*, variantes:product_variants(*)")
      .eq("tenant_id", tenant.id);

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error("[GET /api/admin/inventory/products] Error completo:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Error al obtener productos" },
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

    console.log("[POST /api/admin/inventory/products] Creando producto para:", clientId);

    const supabase = createSupabaseAdmin();
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

    const { data: product, error } = await supabase
      .from("products")
      .insert([
        {
          tenant_id: tenant.id,
          nombre: body.nombre,
          descripcion: body.descripcion,
          imagen: body.imagen,
          precio: body.precio,
          precio_original: body.precioOriginal,
          category_id: body.category_id,
          stock: body.stock,
          stock_minimo: body.stockMinimo,
          stock_maximo: body.stockMaximo,
          sku: body.sku,
          es_servicio: body.esServicio,
          fecha_expiracion: body.fechaExpiracion,
          featured: body.destacado,
          activo: body.activo !== false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    if (body.variantes && body.variantes.length > 0) {
      await supabase.from("product_variants").insert(
        body.variantes.map((v) => ({
          product_id: product.id,
          nombre: v.nombre,
          valor: v.valor,
          precio_adicional: v.precioAdicional,
          stock: v.stock,
        }))
      );
    }

    console.log("[POST /api/admin/inventory/products] ✓ Producto creado:", product.id);

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/products] Error completo:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}
