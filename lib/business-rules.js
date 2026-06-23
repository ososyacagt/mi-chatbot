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
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('business_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('activo', true)
    .or(`fecha_inicio.is.null,fecha_inicio.lte.${now}`)
    .or(`fecha_fin.is.null,fecha_fin.gte.${now}`)
    .order('prioridad', { ascending: false })

  return data || []
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
  const rules = await getActiveRules(tenantId)

  let processedItems = cartItems.map(item => ({ ...item }))
  const appliedRules = []
  let giftItems = []
  let totalDiscount = 0

  for (const rule of rules) {
    const { tipo, condiciones, acciones, nombre } = rule

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
        const subtotal = processedItems.reduce(
          (sum, item) => sum + item.precio * item.quantity, 0
        )
        const alreadyGifted = giftItems.some(
          g => g.productId === acciones.gift_product_id
        )
        if (subtotal >= condiciones.min_subtotal && !alreadyGifted) {
          const giftProduct = await getProductById(acciones.gift_product_id)
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
            appliedRules.push({
              ruleId: rule.id,
              tipo,
              nombre,
              descripcion: `Regalo: ${giftProduct.nombre}`,
              ahorro: giftProduct.precio
            })
          }
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
