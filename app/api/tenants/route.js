import { getTenants } from "@/lib/tenants-db";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET(request) {
  console.log("[/api/tenants] Inicio de solicitud");
  console.log("[/api/tenants] NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓" : "❌");
  console.log("[/api/tenants] NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓" : "❌");
  console.log("[/api/tenants] isSupabaseConfigured():", isSupabaseConfigured());

  try {
    console.log("[/api/tenants] Llamando a getTenants()...");
    const tenants = await getTenants();
    console.log("[/api/tenants] getTenants() retornó:", tenants?.length || 0, "tenants");
    console.log("[/api/tenants] Primer tenant:", tenants?.[0]?.id || "N/A");

    return Response.json({
      tenants,
      debug: {
        supabaseConfigured: isSupabaseConfigured(),
        tenantsCount: tenants?.length || 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[/api/tenants] Error:", error);
    return Response.json(
      {
        error: "Ocurrió un error al obtener la lista de clientes.",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
