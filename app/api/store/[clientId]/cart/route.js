import { checkStock, getProduct } from "@/lib/store";
import { applyBusinessRules } from "@/lib/business-rules";
import { supabase } from "@/lib/supabase";

export async function POST(request, { params }) {
  try {
    const { clientId } = await params;
    const { items } = await request.json();

    if (!clientId || !items || !Array.isArray(items)) {
      return Response.json(
        { error: "clientId e items son requeridos" },
        { status: 400 }
      );
    }

    console.log("[POST /api/store/[clientId]/cart] Procesando carrito para:", clientId);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (!tenant) {
      return Response.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const processedItems = [];

    for (const item of items) {
      const product = await getProduct(item.productId);
      if (!product) continue;

      const stockAvailable = await checkStock(
        item.productId,
        item.quantity,
        item.variantId
      );

      if (!stockAvailable) {
        return Response.json(
          { error: `Stock insuficiente para ${product.nombre}` },
          { status: 400 }
        );
      }

      let itemPrice = product.precio;
      let variantInfo = null;

      if (item.variantId && product.variantes) {
        const variant = product.variantes.find((v) => v.id === item.variantId);
        if (variant) {
          itemPrice += variant.precio_adicional || 0;
          variantInfo = {
            id: variant.id,
            nombre: variant.nombre,
            valor: variant.valor,
          };
        }
      }

      processedItems.push({
        productId: item.productId,
        nombre: product.nombre,
        descripcion: product.descripcion,
        imagen: product.imagen,
        precio: itemPrice,
        precioOriginal: product.precio_original || itemPrice,
        quantity: item.quantity,
        variantId: item.variantId,
        variantInfo,
      });
    }

    const rulesResult = await applyBusinessRules(tenant.id, processedItems);

    const subtotal = rulesResult.cartItems.reduce(
      (sum, item) => sum + item.precio * item.quantity,
      0
    );

    const total = Math.max(0, subtotal - rulesResult.totalDiscount);

    console.log("[POST /api/store/[clientId]/cart] ✓ Carrito procesado");

    return Response.json({
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
    return Response.json(
      { error: "Error al procesar carrito" },
      { status: 500 }
    );
  }
}
