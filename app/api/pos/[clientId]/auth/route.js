import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";

// GET: List all active POS users for a tenant (without pin_hash)
export async function GET(request, { params }) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: users, error } = await supabase
      .from("pos_users")
      .select("id, nombre, rol, area_id, activo")
      .eq("tenant_id", clientId)
      .eq("activo", true);

    if (error) throw error;

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("[GET /api/pos/[clientId]/auth] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener usuarios de POS: " + error.message },
      { status: 500 }
    );
  }
}

// POST: Authenticate POS user with PIN
export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    const { userId, pin } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    if (!userId || !pin) {
      return NextResponse.json(
        { error: "userId y pin son requeridos" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("pos_users")
      .select("id, nombre, rol, area_id, pin_hash, activo")
      .eq("id", userId)
      .eq("tenant_id", clientId)
      .eq("activo", true)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Usuario no encontrado o inactivo" },
        { status: 404 }
      );
    }

    // Verify PIN
    const isValid = bcrypt.compareSync(pin, user.pin_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "PIN incorrecto" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        areaId: user.area_id
      }
    });
  } catch (error) {
    console.error("[POST /api/pos/[clientId]/auth] Error:", error.message);
    return NextResponse.json(
      { error: "Error de autenticación: " + error.message },
      { status: 500 }
    );
  }
}
