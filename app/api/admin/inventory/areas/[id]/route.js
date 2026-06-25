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

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    console.log('[DELETE area] Eliminando área:', id);

    const { error } = await supabase
      .from("pos_areas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log('[DELETE area] ✓ Área eliminada:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/inventory/areas/[id]] Error:", error.message);
    return NextResponse.json(
      { error: "Error al eliminar área: " + error.message },
      { status: 500 }
    );
  }
}
