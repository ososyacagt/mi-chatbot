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
    const body = await request.json();

    console.log("[PUT /api/admin/inventory/categories/[id]] Actualizando:", id);

    const { data: category, error } = await supabase
      .from("product_categories")
      .update({
        nombre: body.nombre,
        descripcion: body.descripcion,
        emoji: body.emoji,
        orden: body.orden,
        activo: body.activo !== false,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("[PUT /api/admin/inventory/categories/[id]] ✓ Actualizada:", id);

    return NextResponse.json({ category });
  } catch (error) {
    console.error("[PUT /api/admin/inventory/categories/[id]] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al actualizar categoría" },
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

    console.log("[DELETE /api/admin/inventory/categories/[id]] Eliminando:", id);

    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[DELETE /api/admin/inventory/categories/[id]] ✓ Eliminada:", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/inventory/categories/[id]] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al eliminar categoría" },
      { status: 500 }
    );
  }
}
