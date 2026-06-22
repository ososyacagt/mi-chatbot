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

    console.log("[PUT /api/admin/inventory/rules/[id]] Actualizando regla:", id);

    const { data: rule, error } = await supabase
      .from("business_rules")
      .update({
        tipo: body.tipo,
        nombre: body.nombre,
        condiciones: body.condiciones,
        acciones: body.acciones,
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin,
        activo: body.activo !== false,
        prioridad: body.prioridad || 0,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("[PUT /api/admin/inventory/rules/[id]] ✓ Actualizada:", id);

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("[PUT /api/admin/inventory/rules/[id]] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al actualizar regla" },
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

    console.log("[DELETE /api/admin/inventory/rules/[id]] Eliminando:", id);

    const { error } = await supabase
      .from("business_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log("[DELETE /api/admin/inventory/rules/[id]] ✓ Eliminada:", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/inventory/rules/[id]] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al eliminar regla" },
      { status: 500 }
    );
  }
}
