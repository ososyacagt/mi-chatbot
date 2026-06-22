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

    console.log("[PUT /api/admin/inventory/orders/[id]] Actualizando orden:", id);

    const { data: order, error } = await supabase
      .from("orders")
      .update({
        status: body.status,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    console.log("[PUT /api/admin/inventory/orders/[id]] ✓ Actualizada:", id);

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[PUT /api/admin/inventory/orders/[id]] Error completo:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Error al actualizar orden" },
      { status: 500 }
    );
  }
}
