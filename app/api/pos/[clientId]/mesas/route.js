import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { clientId } = params;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: mesas, error } = await supabase
      .from("pos_tables")
      .select("*")
      .eq("tenant_id", clientId)
      .order("numero");

    if (error) throw error;

    return NextResponse.json({ mesas: mesas || [] });
  } catch (error) {
    console.error("[GET /api/pos/[clientId]/mesas] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener mesas" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { clientId } = params;
    const body = await request.json();
    const { mesaId, estado } = body;

    if (!clientId || !mesaId || !estado) {
      return NextResponse.json(
        { error: "mesaId y estado son requeridos" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: mesa, error } = await supabase
      .from("pos_tables")
      .update({ estado })
      .eq("id", mesaId)
      .eq("tenant_id", clientId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ mesa });
  } catch (error) {
    console.error("[PUT /api/pos/[clientId]/mesas] Error:", error.message);
    return NextResponse.json(
      { error: "Error al actualizar mesa" },
      { status: 500 }
    );
  }
}
