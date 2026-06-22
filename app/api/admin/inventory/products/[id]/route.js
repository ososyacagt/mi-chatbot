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

export async function PUT(request, { params }) {
  try {
    const authError = await authCheck();
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const body = await request.json();

    console.log("[PUT /api/admin/inventory/products/[id]] Actualizando:", id);

    const supabase = createSupabaseAdmin();
    const { data: product, error } = await supabase
      .from("products")
      .update({
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
        destacado: body.destacado,
        activo: body.activo !== false,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (body.variantes) {
      await supabase.from("product_variants").delete().eq("product_id", id);

      if (body.variantes.length > 0) {
        await supabase.from("product_variants").insert(
          body.variantes.map((v) => ({
            product_id: id,
            nombre: v.nombre,
            valor: v.valor,
            precio_adicional: v.precioAdicional,
            stock: v.stock,
          }))
        );
      }
    }

    console.log("[PUT /api/admin/inventory/products/[id]] ✓ Actualizado:", id);

    return NextResponse.json({ product });
  } catch (error) {
    console.error("[PUT /api/admin/inventory/products/[id]] Error completo:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const authError = await authCheck();
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const { id } = await params;

    console.log("[DELETE /api/admin/inventory/products/[id]] Eliminando:", id);

    const supabase = createSupabaseAdmin();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[DELETE /api/admin/inventory/products/[id]] ✓ Eliminado:", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/inventory/products/[id]] Error completo:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
