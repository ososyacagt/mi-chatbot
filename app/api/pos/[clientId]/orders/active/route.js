import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const posStatuses = searchParams.getAll("posStatus"); // supports ?posStatus=x&posStatus=y

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    let query = supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", clientId);

    if (posStatuses && posStatuses.length > 0) {
      query = query.in("pos_status", posStatuses);
    }

    const { data: orders, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error("[GET /api/pos/[clientId]/orders/active] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener órdenes activas: " + error.message },
      { status: 500 }
    );
  }
}
