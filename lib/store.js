import { supabase } from "./supabase";

export async function getCategories(tenantId) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    console.error("[store.js] Error getting categories:", error);
    return [];
  }
  return data || [];
}

export async function getProducts(tenantId, categoryId) {
  let query = supabase
    .from("products")
    .select("*, variantes:product_variants(*)")
    .eq("tenant_id", tenantId)
    .eq("activo", true);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query.order("nombre", { ascending: true });

  if (error) {
    console.error("[store.js] Error getting products:", error);
    return [];
  }
  return data || [];
}

export async function getProduct(productId) {
  const { data, error } = await supabase
    .from("products")
    .select("*, variantes:product_variants(*)")
    .eq("id", productId)
    .single();

  if (error) {
    console.error("[store.js] Error getting product:", error);
    return null;
  }
  return data;
}

export async function checkStock(productId, cantidad, variantId) {
  if (variantId) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("stock")
      .eq("id", variantId)
      .single();

    if (error || !data) return false;
    return data.stock >= cantidad;
  } else {
    const { data, error } = await supabase
      .from("products")
      .select("stock")
      .eq("id", productId)
      .single();

    if (error || !data) return false;
    return data.stock >= cantidad;
  }
}

export async function updateStock(productId, cantidad, variantId) {
  if (variantId) {
    const { error } = await supabase.rpc("decrement_variant_stock", {
      variant_id: variantId,
      amount: cantidad,
    });
    return !error;
  } else {
    const { error } = await supabase.rpc("decrement_product_stock", {
      product_id: productId,
      amount: cantidad,
    });
    return !error;
  }
}

export async function createOrder(orderData) {
  const {
    tenantId,
    clienteNombre,
    clienteTelefono,
    clienteDireccion,
    notas,
    metodoPago,
    items,
    subtotal,
    descuentos,
    total,
  } = orderData;

  const numeroOrden = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data, error } = await supabase.from("orders").insert([
    {
      tenant_id: tenantId,
      numero_orden: numeroOrden,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      cliente_direccion: clienteDireccion,
      notas,
      metodo_pago: metodoPago,
      items,
      subtotal,
      descuentos,
      total,
      status: "pendiente",
    },
  ]).select().single();

  if (error) {
    console.error("[store.js] Error creating order:", error);
    return null;
  }
  return data;
}

export async function getOrders(tenantId, status) {
  let query = supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", tenantId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("[store.js] Error getting orders:", error);
    return [];
  }
  return data || [];
}

export async function getOrder(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("[store.js] Error getting order:", error);
    return null;
  }
  return data;
}
