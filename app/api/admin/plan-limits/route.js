import { NextResponse } from "next/server";
import { getSession, getAdminUser } from "@/lib/auth";
import { getPlanLimits, checkProductLimit, checkCategoryLimit, checkRuleLimit } from "@/lib/plan-limits";

export async function GET(request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminUser = await getAdminUser(user.id);
    if (!adminUser) {
      return NextResponse.json(
        { error: "No eres administrador" },
        { status: 403 }
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

    console.log("[GET /api/admin/plan-limits] Obteniendo límites para:", clientId);

    const plan = await getPlanLimits(clientId);
    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    const [productLimit, categoryLimit, ruleLimit] = await Promise.all([
      checkProductLimit(clientId),
      checkCategoryLimit(clientId),
      checkRuleLimit(clientId),
    ]);

    return NextResponse.json({
      plan: {
        nombre: plan.nombre,
        slug: plan.slug,
        ecommerce_modes: plan.ecommerce_modes || [],
        max_productos: plan.max_productos,
        max_categorias: plan.max_categorias,
        max_reglas: plan.max_reglas,
        chatbot_pedidos: plan.chatbot_pedidos,
        tienda_completa: plan.tienda_completa,
      },
      limits: {
        productos: productLimit,
        categorias: categoryLimit,
        reglas: ruleLimit,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/plan-limits] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al obtener límites del plan" },
      { status: 500 }
    );
  }
}
