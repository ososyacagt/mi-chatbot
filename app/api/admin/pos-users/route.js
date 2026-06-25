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

// GET: List all POS users for a tenant (including inactive, so admin can manage them)
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

    const supabase = createSupabaseAdmin();
    const { data: users, error } = await supabase
      .from("pos_users")
      .select("*")
      .eq("tenant_id", clientId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("[GET /api/admin/pos-users] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener usuarios de POS" },
      { status: 500 }
    );
  }
}

// POST: Create a new POS user
export async function POST(request) {
  try {
    const authError = await authCheck();
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      );
    }

    const body = await request.json();
    const { clientId, nombre, rol, pin, areaId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    if (!nombre || !rol || !pin) {
      return NextResponse.json(
        { error: "nombre, rol y pin son requeridos" },
        { status: 400 }
      );
    }

    // Hash the PIN
    const pinHash = bcrypt.hashSync(pin, 10);

    const supabase = createSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("pos_users")
      .insert({
        tenant_id: clientId,
        nombre,
        rol,
        pin_hash: pinHash,
        area_id: areaId || null,
        activo: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/pos-users] Error:", error.message);
    return NextResponse.json(
      { error: "Error al crear usuario de POS: " + error.message },
      { status: 500 }
    );
  }
}
