import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSession, getAdminUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

// PUT: Update a POS user
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
    const { nombre, rol, pin, areaId, activo } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (rol !== undefined) updateData.rol = rol;
    if (areaId !== undefined) updateData.area_id = areaId || null;
    if (activo !== undefined) updateData.activo = activo;

    // Hash the PIN if provided
    if (pin) {
      updateData.pin_hash = bcrypt.hashSync(pin, 10);
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = createSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("pos_users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[PUT /api/admin/pos-users/[id]] Error:", error.message);
    return NextResponse.json(
      { error: "Error al actualizar usuario de POS: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE: Deactivate (soft delete) or permanent delete a POS user
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
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get("hard") === "true";

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    if (hard) {
      // Hard delete: delete row from database
      const { error } = await supabase
        .from("pos_users")
        .delete()
        .eq("id", id);

      if (error) {
        // Check for foreign key violation (PostgreSQL code 23503)
        if (error.code === "23503") {
          return NextResponse.json(
            { error: "No se puede eliminar permanentemente este usuario porque tiene órdenes registradas en el POS. Desactívalo en su lugar." },
            { status: 409 }
          );
        }
        throw error;
      }

      return NextResponse.json({ success: true, message: "Usuario eliminado permanentemente" });
    } else {
      // Soft delete: set activo = false
      const { data: user, error } = await supabase
        .from("pos_users")
        .update({
          activo: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, user });
    }
  } catch (error) {
    console.error("[DELETE /api/admin/pos-users/[id]] Error:", error.message);
    return NextResponse.json(
      { error: "Error al procesar eliminación de usuario: " + error.message },
      { status: 500 }
    );
  }
}
