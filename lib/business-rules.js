import { createSupabaseAdmin } from './supabase-admin'

export const RULE_TYPES = {
  CROSS_SELL: 'cross_sell',
  VOLUME_PRICING: 'volume_pricing',
  KIT_COMBO: 'kit_combo',
  INTRO_PRICE: 'intro_price',
  GIFT_PURCHASE: 'gift_purchase',
  LIMITED_EDITION: 'limited_edition'
}

async function getActiveRules(tenantId) {
  const supabase = createSupabaseAdmin()

  const { data, error } = await supabase
    .from('business_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('activo', true)
    .order('prioridad', { ascending: false })

  console.log('[rules] query result:', data?.length, error)

  if (error) {
    console.error('[rules] error:', error)
    return []
  }

  // Filtrar por fecha en JavaScript en lugar de en la query
  const now = new Date()
  const filtered = (data || []).filter(rule => {
    if (rule.fecha_inicio && new Date(rule.fecha_inicio) > now) return false
    if (rule.fecha_fin && new Date(rule.fecha_fin) < now) return false
    return true
  })

  console.log('[rules] reglas después de filtro fecha:', filtered.length)
  return filtered
}

async function getProductById(productId) {
  const supabase = createSupabaseAdmin()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()
  return data
}

export async function applyBusinessRules(tenantId, cartItems) {
  console.log('[rules] tenantId:', tenantId)
  const rules = await getActiveRules(tenantId)
  console.log('[rules] reglas activas encontradas:', rules.length)
  rules.forEach(r => console.log('[rules] regla:', r.tipo, r.condiciones, r.activo))

  let processedItems = cartItems.map(item => ({ ...item }))
  const appliedRules = []
  let giftItems = []
  let totalDiscount = 0

  for (const rule of rules) {
    const { tipo, condiciones, acciones, nombre } = rule
    console.log('[rules] Procesando regla:', tipo, condiciones)

    try {
      // REGLA 1: CROSS_SELL
      if (tipo === RULE_TYPES.CROSS_SELL) {
        const triggerInCart = processedItems.find(
          item => item.productId === condiciones.trigger_product_id
        )
        if (triggerInCart) {
          const discountItem = processedItems.find(
            item => item.productId === condiciones.discount_product_id
          )
          if (discountItem) {
            const descuento = (discountItem.precio * condiciones.discount_percent / 100) * discountItem.quantity
            discountItem.precio = discountItem.precio * (1 - condiciones.discount_percent / 100)
            discountItem.descuentoAplicado = condiciones.discount_percent
            totalDiscount += descuento
            appliedRules.push({
              ruleId: rule.id,
              tipo,
              nombre,
              descripcion: `${condiciones.discount_percent}% de descuento aplicado`,
              ahorro: descuento
            })
          }
        }
      }

      // REGLA 2: VOLUME_PRICING
      if (tipo === RULE_TYPES.VOLUME_PRICING) {
        const targetItem = processedItems.find(
          item => item.productId === condiciones.product_id
        )
        if (targetItem && condiciones.tiers) {
          const sortedTiers = [...condiciones.tiers].sort(
            (a, b) => b.min_qty - a.min_qty
          )
          const applicableTier = sortedTiers.find(
            tier => targetItem.quantity >= tier.min_qty
          )
          if (applicableTier) {
            const ahorro = (targetItem.precio - applicableTier.price) * targetItem.quantity
            if (ahorro > 0) {
              totalDiscount += ahorro
              targetItem.precioOriginal = targetItem.precio
              targetItem.precio = applicableTier.price
              targetItem.descuentoVolumen = true
              appliedRules.push({
                ruleId: rule.id,
                tipo,
                nombre,
                descripcion: `Precio por volumen: Q${applicableTier.price} c/u`,
                ahorro
              })
            }
          }
        }
      }

      // REGLA 3: KIT_COMBO
      if (tipo === RULE_TYPES.KIT_COMBO) {
        const kitProductIds = condiciones.product_ids || []
        const allInCart = kitProductIds.every(pid =>
          processedItems.some(item => item.productId === pid)
        )
        if (allInCart && kitProductIds.length > 0) {
          let ahorro = 0
          if (acciones.fixed_price) {
            const currentTotal = processedItems
              .filter(item => kitProductIds.includes(item.productId))
              .reduce((sum, item) => sum + item.precio * item.quantity, 0)
            ahorro = currentTotal - acciones.fixed_price
            processedItems = processedItems.map(item => {
              if (kitProductIds.includes(item.productId)) {
                const proportion = (item.precio * item.quantity) / currentTotal
                item.precio = item.precio - (ahorro * proportion / item.quantity)
              }
              return item
            })
          } else if (acciones.discount_percent) {
            processedItems = processedItems.map(item => {
              if (kitProductIds.includes(item.productId)) {
                const descItem = item.precio * acciones.discount_percent / 100 * item.quantity
                ahorro += descItem
                item.precio = item.precio * (1 - acciones.discount_percent / 100)
              }
              return item
            })
          }
          if (ahorro > 0) {
            totalDiscount += ahorro
            appliedRules.push({
              ruleId: rule.id,
              tipo,
              nombre,
              descripcion: `Kit completo: ${acciones.discount_percent ? acciones.discount_percent + '% off' : 'precio especial'}`,
              ahorro
            })
          }
        }
      }

      // REGLA 4: INTRO_PRICE
      if (tipo === RULE_TYPES.INTRO_PRICE) {
        const now = new Date()
        const expires = new Date(condiciones.expires_at)
        if (now < expires) {
          const targetItem = processedItems.find(
            item => item.productId === condiciones.product_id
          )
          if (targetItem && acciones.special_price < targetItem.precio) {
            const ahorro = (targetItem.precio - acciones.special_price) * targetItem.quantity
            totalDiscount += ahorro
            targetItem.precioOriginal = targetItem.precio
            targetItem.precio = acciones.special_price
            appliedRules.push({
              ruleId: rule.id,
              tipo,
              nombre,
              descripcion: `Precio de introducción hasta ${expires.toLocaleDateString()}`,
              ahorro
            })
          }
        }
      }

      // REGLA 5: GIFT_PURCHASE
      if (tipo === RULE_TYPES.GIFT_PURCHASE) {
        console.log('[gift] evaluando regla:', nombre)
        console.log('[gift] condiciones:', JSON.stringify(condiciones))
        console.log('[gift] acciones:', JSON.stringify(acciones))

        const subtotal = processedItems.reduce(
          (sum, item) => sum + (item.precio * item.quantity), 0
        )
        console.log('[gift] subtotal calculado:', subtotal)
        console.log('[gift] min_subtotal requerido:', condiciones.min_subtotal)
        console.log('[gift] condicion cumplida:', subtotal >= condiciones.min_subtotal)

        const alreadyGifted = giftItems.some(
          g => g.productId === acciones.gift_product_id
        )
        console.log('[gift] ya regalado:', alreadyGifted)

        if (subtotal >= condiciones.min_subtotal && !alreadyGifted) {
          console.log('[gift] Condiciones cumplidas, obteniendo producto...')
          const giftProduct = await getProductById(acciones.gift_product_id)
          console.log('[gift] Producto obtenido:', giftProduct?.nombre, giftProduct?.precio)

          if (giftProduct) {
            giftItems.push({
              productId: giftProduct.id,
              nombre: giftProduct.nombre,
              imagen: giftProduct.imagenes?.[0] || null,
              precio: 0,
              precioOriginal: giftProduct.precio,
              quantity: 1,
              esRegalo: true
            })
            console.log('[gift] Regalo agregado al carrito')
            appliedRules.push({
              ruleId: rule.id,
              tipo,
              nombre,
              descripcion: `Regalo: ${giftProduct.nombre}`,
              ahorro: giftProduct.precio
            })
          } else {
            console.log('[gift] ERROR: No se pudo obtener el producto regalo')
          }
        } else {
          console.log('[gift] Condiciones NO cumplidas. Subtotal insuficiente o regalo ya existe')
        }
      }

      // REGLA 6: LIMITED_EDITION
      if (tipo === RULE_TYPES.LIMITED_EDITION) {
        const targetItem = processedItems.find(
          item => item.productId === condiciones.product_id
        )
        if (targetItem) {
          const now = new Date()
          const expires = condiciones.expires_at ? new Date(condiciones.expires_at) : null

          if (expires && now > expires) {
            processedItems = processedItems.filter(
              item => item.productId !== condiciones.product_id
            )
            appliedRules.push({
              ruleId: rule.id,
              tipo,
              nombre,
              descripcion: 'Producto de edición limitada agotado',
              ahorro: 0,
              warning: true
            })
          } else if (condiciones.max_stock && targetItem.quantity > condiciones.max_stock) {
            targetItem.quantity = condiciones.max_stock
            targetItem.limitadoA = condiciones.max_stock
            appliedRules.push({
              ruleId: rule.id,
              tipo,
              nombre,
              descripcion: `Cantidad limitada a ${condiciones.max_stock} por cliente`,
              ahorro: 0,
              warning: true
            })
          }
        }
      }

    } catch (ruleError) {
      console.error('[business-rules] Error aplicando regla:', rule.id, ruleError)
    }
  }

  return {
    cartItems: processedItems,
    giftItems,
    appliedRules,
    totalDiscount
  }
}
