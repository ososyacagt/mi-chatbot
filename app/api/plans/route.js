import { createSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request) {
  try {
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) throw error;

    return Response.json({
      plans: data || []
    });
  } catch (err) {
    console.error("[/api/plans] Error:", err);
    return Response.json(
      { error: "Error obteniendo planes" },
      { status: 500 }
    );
  }
}
