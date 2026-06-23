import { createSupabaseAdmin } from './supabase-admin'

export async function getCatalogContext(tenantId) {
  const supabase = createSupabaseAdmin()

  // Obtener categorías
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nombre, emoji')
    .eq('tenant_id', tenantId)
    .eq('activo', true)
    .order('orden')

  // Obtener productos con variantes
  const { data: products } = await supabase
    .from('products')
    .select('*, variantes:product_variants(*)')
    .eq('tenant_id', tenantId)
    .eq('activo', true)
    .order('nombre')

  if (!products?.length) return null

  // Obtener moneda del tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('currency, whatsapp_number, store_name')
    .eq('client_id', tenantId)
    .single()

  const currency = tenant?.currency || 'USD'

  // Formatear catálogo como texto para el contexto del bot
  let catalogText = `CATÁLOGO DE PRODUCTOS EN TIEMPO REAL:\n`
  catalogText += `Moneda: ${currency}\n\n`

  for (const cat of categories || []) {
    const catProducts = products.filter(p => p.category_id === cat.id)
    if (!catProducts.length) continue

    catalogText += `${cat.emoji || '📦'} ${cat.nombre.toUpperCase()}\n`

    for (const p of catProducts) {
      const stockStatus = p.es_servicio
        ? '(servicio disponible)'
        : p.stock > 0
          ? `(stock: ${p.stock} unidades)`
          : '(AGOTADO)'

      catalogText += `• ${p.nombre} - ${currency} ${p.precio} ${stockStatus}\n`

      if (p.precio_original && p.precio_original > p.precio) {
        catalogText += `  (Precio original: ${currency} ${p.precio_original} - ¡Oferta!)\n`
      }

      if (p.variantes?.length > 0) {
        const variantesActivas = p.variantes.filter(v => v.activo && v.stock > 0)
        if (variantesActivas.length > 0) {
          catalogText += `  Variantes disponibles: ${variantesActivas.map(v =>
            `${v.nombre}: ${v.valor}${v.precio_adicional > 0 ? ` (+${currency} ${v.precio_adicional})` : ''}`
          ).join(', ')}\n`
        }
      }

      if (p.descripcion) {
        const desc = p.descripcion.replace(/<[^>]*>/g, '').substring(0, 100)
        catalogText += `  ${desc}...\n`
      }
    }
    catalogText += '\n'
  }

  return {
    catalogText,
    products,
    currency,
    whatsappNumber: tenant?.whatsapp_number,
    storeName: tenant?.store_name
  }
}

export async function createChatbotOrder({
  tenantId, items, clienteNombre, clienteTelefono,
  clienteDireccion, notas, giftItems, appliedRules,
  subtotal, total, currency
}) {
  const supabase = createSupabaseAdmin()

  const numeroOrden = 'ORD-' + Date.now().toString(36).toUpperCase()

  const todosLosItems = [
    ...items,
    ...(giftItems || []).map(g => ({ ...g, precio: 0, esRegalo: true }))
  ]

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      tenant_id: tenantId,
      numero_orden: numeroOrden,
      cliente_nombre: clienteNombre,
      cliente_telefono: clienteTelefono,
      cliente_direccion: clienteDireccion,
      items: todosLosItems,
      subtotal: subtotal || total,
      descuento: (subtotal || total) - total,
      total,
      moneda: currency || 'USD',
      metodo_pago: 'chatbot',
      status: 'pendiente',
      notas,
      reglas_aplicadas: appliedRules || []
    })
    .select()
    .single()

  if (error) throw error

  // Decrementar stock
  for (const item of items) {
    if (!item.esRegalo && item.productId) {
      if (item.variantId) {
        await supabase.rpc('decrement_variant_stock', {
          p_variant_id: item.variantId,
          p_cantidad: item.quantity
        })
      } else {
        await supabase.rpc('decrement_product_stock', {
          p_product_id: item.productId,
          p_cantidad: item.quantity
        })
      }
    }
  }

  return order
}
