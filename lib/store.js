import { createSupabaseAdmin } from "./supabase-admin";

export async function getCategories(tenantId) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    console.error("[store] Error obteniendo categorías:", error);
    return [];
  }
  return data || [];
}

export async function getProducts(tenantId, categoryId) {
  const supabase = createSupabaseAdmin();
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
    console.error("[store] Error obteniendo productos:", error);
    return [];
  }
  return data || [];
}

export async function getProduct(productId) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*, variantes:product_variants(*)")
    .eq("id", productId)
    .single();

  if (error) {
    console.error("[store] Error obteniendo producto:", error);
    return null;
  }
  return data;
}

export async function checkStock(productId, cantidad) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("stock, es_servicio")
    .eq("id", productId)
    .single();

  if (error || !data) return false;
  if (data?.es_servicio) return true;
  const stock = parseInt(data.stock, 10);
  const qty = parseInt(cantidad, 10);
  return stock >= qty;
}

export async function updateStock(productId, cantidad) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.rpc("decrement_product_stock", {
    product_id: productId,
    amount: cantidad,
  });
  return !error;
}

export async function createOrder(orderData) {
  const supabase = createSupabaseAdmin();
  const {
    tenantId,
    clienteNombre,
    clienteEmail,
    clienteTelefono,
    clienteDireccion,
    clienteCiudad,
    clientePais,
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
      cliente_email: clienteEmail,
      cliente_telefono: clienteTelefono,
      cliente_direccion: clienteDireccion,
      cliente_ciudad: clienteCiudad,
      cliente_pais: clientePais,
      notas,
      metodo_pago: metodoPago,
      items,
      subtotal,
      total,
      status: "pendiente",
    },
  ]).select().single();

  if (error) {
    console.error("[store] Error creando orden:", error.message);
    return null;
  }
  return data;
}

export async function getOrders(tenantId, status) {
  const supabase = createSupabaseAdmin();
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
    console.error("[store] Error obteniendo órdenes:", error);
    return [];
  }
  return data || [];
}

export async function getOrder(orderId) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("[store] Error obteniendo orden:", error);
    return null;
  }
  return data;
}
