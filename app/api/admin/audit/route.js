import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { getSession, getAdminUser, isSuperAdmin } from "@/lib/auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get("limit") || "50");
    const entityFilter = searchParams.get("entity");
    const actionFilter = searchParams.get("action");
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log("[audit] GET con params:", { limite, entityFilter, actionFilter, offset });

    // Verificar sesión
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del usuario admin
    const adminUser = await getAdminUser(user.id);
    if (!adminUser || !isSuperAdmin(adminUser)) {
      return NextResponse.json(
        { error: "Solo superadmin puede ver auditoría" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Construir query
    let query = supabase.from("audit_logs").select("*");

    if (entityFilter) {
      query = query.eq("entity", entityFilter);
    }

    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limite - 1);

    console.log("[audit] resultado:", { dataLength: data?.length, error });

    if (error) {
      console.error("[audit] Error:", error);
      return NextResponse.json(
        { error: "Error al obtener logs" },
        { status: 500 }
      );
    }

    // Obtener total de registros para paginación
    let countQuery = supabase.from("audit_logs").select("*", { count: "exact", head: true });

    if (entityFilter) {
      countQuery = countQuery.eq("entity", entityFilter);
    }

    if (actionFilter) {
      countQuery = countQuery.eq("action", actionFilter);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("[audit] Error counting:", countError);
    }

    return NextResponse.json({
      logs: data || [],
      total: count || 0,
      limit: limite,
      offset,
    });
  } catch (error) {
    console.error("[audit] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
