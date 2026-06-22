import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";

function cleanHTML(html) {
  if (!html) return '';
  return html
    .replace(/class="[^"]*"/g, '')
    .replace(/style="[^"]*"/g, '')
    .replace(/<span>/g, '')
    .replace(/<\/span>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    const { data: products } = await supabase
      .from("products")
      .select("*, variantes:product_variants(*)")
      .eq("tenant_id", clientId);

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
    console.log('[POST products] body recibido:', JSON.stringify(body, null, 2));

    const insertData = {
      tenant_id: clientId,
      nombre: body.nombre,
      descripcion: cleanHTML(body.descripcion),
      imagenes: body.imagen ? [body.imagen] : [],
      precio: parseFloat(body.precio) || 0,
      precio_original: body.precioOriginal ? parseFloat(body.precioOriginal) : null,
      category_id: body.category_id,
      stock: parseInt(body.stock) || 0,
      stock_minimo: parseInt(body.stockMinimo) || 0,
      stock_maximo: body.stockMaximo ? parseInt(body.stockMaximo) : null,
      sku: body.sku,
      es_servicio: body.esServicio,
      fecha_expiracion: body.fechaExpiracion || null,
      destacado: body.destacado,
      activo: body.activo !== false,
    };

    console.log('[POST products] insert data que se enviará:', JSON.stringify(insertData, null, 2));

    const supabase = createSupabaseAdmin();
    const { data: product, error } = await supabase
      .from("products")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.log('[POST products] supabase error completo:', JSON.stringify(error, null, 2));
      throw error;
    }

    if (body.variantes && body.variantes.length > 0) {
      const variantesData = body.variantes
        .filter(v => v.nombre && v.nombre.trim())
        .map(v => ({
          product_id: product.id,
          nombre: v.nombre?.trim() || '',
          valor: v.valor?.trim() || '',
          precio_adicional: v.precioAdicional !== '' && v.precioAdicional != null
            ? parseFloat(v.precioAdicional) : 0,
          stock: v.stock !== '' && v.stock != null
            ? parseInt(v.stock) : 0,
          sku: v.sku?.trim() || null,
          activo: true
        }));

      if (variantesData.length > 0) {
        const variantsError = await supabase.from("product_variants").insert(variantesData);

        if (variantsError.error) {
          console.log('[POST products] variantes error:', JSON.stringify(variantsError.error, null, 2));
          throw variantsError.error;
        }
      }
    }

    console.log("[POST /api/admin/inventory/products] ✓ Producto creado:", product.id);

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/inventory/products] Error completo:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: "Error al crear producto: " + error.message },
      { status: 500 }
    );
  }
}
