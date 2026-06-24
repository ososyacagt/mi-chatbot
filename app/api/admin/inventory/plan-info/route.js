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

    console.log("[GET /api/admin/inventory/plan-info] Obteniendo info de plan para:", clientId);

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

    const planInfo = {
      planNombre: plan.nombre,
      planSlug: plan.slug,
      ecommerceModes: plan.ecommerce_modes || [],
      maxProductos: plan.max_productos,
      currentProductos: productLimit.current,
      maxCategorias: plan.max_categorias,
      currentCategorias: categoryLimit.current,
      maxReglas: plan.max_reglas,
      currentReglas: ruleLimit.current,
      chatbotPedidos: plan.chatbot_pedidos,
      tiendaCompleta: plan.tienda_completa,
      atLimit: {
        productos: productLimit.current >= productLimit.limit && productLimit.limit > 0,
        categorias: categoryLimit.current >= categoryLimit.limit && categoryLimit.limit > 0,
        reglas: ruleLimit.current >= ruleLimit.limit && ruleLimit.limit > 0,
      },
      nearLimit: {
        productos: productLimit.current >= (productLimit.limit * 0.8) && productLimit.limit > 0,
        categorias: categoryLimit.current >= (categoryLimit.limit * 0.8) && categoryLimit.limit > 0,
        reglas: ruleLimit.current >= (ruleLimit.limit * 0.8) && ruleLimit.limit > 0,
      }
    };

    return NextResponse.json(planInfo);
  } catch (error) {
    console.error("[GET /api/admin/inventory/plan-info] Error:", {
      message: error.message,
    });
    return NextResponse.json(
      { error: "Error al obtener información del plan" },
      { status: 500 }
    );
  }
}
