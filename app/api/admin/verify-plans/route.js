import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request) {
  try {
    const supabase = createSupabaseAdmin();

    // Verificar el estado actual de la tabla plans
    const { data: plans, error } = await supabase
      .from("plans")
      .select(`
        slug,
        nombre,
        ecommerce_modes,
        max_productos,
        max_categorias,
        max_reglas,
        chatbot_pedidos,
        tienda_completa,
        orden
      `)
      .order("orden", { ascending: true });

    if (error) {
      return NextResponse.json({
        error: "Error al obtener planes",
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Estado actual de la tabla plans:",
      plans: plans,
      summary: {
        totalPlanes: plans.length,
        planesSinEcommerce: plans.filter(p => !p.ecommerce_modes || p.ecommerce_modes.length === 0).length,
        planesConEcommerce: plans.filter(p => p.ecommerce_modes && p.ecommerce_modes.length > 0).length
      }
    });
  } catch (error) {
    console.error("[verify-plans] Error:", error);
    return NextResponse.json({
      error: "Error al verificar planes",
      details: error.message
    }, { status: 500 });
  }
}
