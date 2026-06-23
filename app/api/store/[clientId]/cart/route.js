import { NextResponse } from "next/server";
import { checkStock, getProduct } from "@/lib/store";
import { applyBusinessRules } from "@/lib/business-rules";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    const { items } = body;

    console.log('[cart] body recibido:', JSON.stringify(body, null, 2));
    console.log('[cart] clientId:', clientId, 'tipo:', typeof clientId);
    console.log('[cart] items:', items, 'tipo:', typeof items, 'isArray:', Array.isArray(items));
    console.log('[cart] validación: !clientId=', !clientId, '!items=', !items, '!Array.isArray=', !Array.isArray(items));

    if (!clientId || !items || !Array.isArray(items)) {
      console.error('[cart] VALIDACIÓN FALLÓ');
      return NextResponse.json(
        { error: "clientId e items son requeridos" },
        { status: 400 }
      );
    }

    console.log("[POST /api/store/[clientId]/cart] Procesando carrito para:", clientId);
    console.log('[cart] items recibidos:', JSON.stringify(items, null, 2));

    const supabase = createSupabaseAdmin();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const processedItems = [];

    for (const item of items) {
      const product = await getProduct(item.productId);
      if (!product) continue;

      const stockAvailable = await checkStock(item.productId, item.quantity);

      if (!stockAvailable) {
        const errorMsg = `Stock insuficiente para ${product.nombre}`;
        console.log('[cart] error específico:', errorMsg);
        return NextResponse.json(
          { error: errorMsg },
          { status: 400 }
        );
      }

      processedItems.push({
        productId: item.productId,
        nombre: product.nombre,
        descripcion: product.descripcion,
        imagen: product.imagen,
        precio: product.precio,
        precioOriginal: product.precio_original || product.precio,
        quantity: item.quantity,
      });
    }

    const rulesResult = await applyBusinessRules(clientId, processedItems);
    console.log('[cart] resultado reglas:', JSON.stringify(rulesResult, null, 2));

    const subtotal = rulesResult.cartItems.reduce(
      (sum, item) => sum + item.precio * item.quantity,
      0
    );

    const total = Math.max(0, subtotal - rulesResult.totalDiscount);

    console.log("[POST /api/store/[clientId]/cart] ✓ Carrito procesado");

    return NextResponse.json({
      cartItems: rulesResult.cartItems,
      appliedRules: rulesResult.appliedRules,
      giftItems: rulesResult.giftItems,
      subtotal,
      totalDiscount: rulesResult.totalDiscount,
      total,
    });
  } catch (error) {
    console.error("[POST /api/store/[clientId]/cart] Error completo:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Error al procesar carrito: " + error.message },
      { status: 500 }
    );
  }
}
