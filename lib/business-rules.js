import { createSupabaseAdmin } from "./supabase-admin";

export const RULE_TYPES = {
  CROSS_SELL: "cross_sell",
  VOLUME_PRICING: "volume_pricing",
  KIT_COMBO: "kit_combo",
  INTRO_PRICE: "intro_price",
  GIFT_PURCHASE: "gift_purchase",
  LIMITED_EDITION: "limited_edition",
};

export async function applyBusinessRules(tenantId, cartItems) {
  const supabase = createSupabaseAdmin();
  const { data: rules, error } = await supabase
    .from("business_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("activo", true);

  if (error) {
    console.error("[business-rules.js] Error fetching rules:", error);
    return {
      cartItems,
      appliedRules: [],
      totalDiscount: 0,
      giftItems: [],
    };
  }

  let modifiedItems = JSON.parse(JSON.stringify(cartItems));
  const appliedRules = [];
  let totalDiscount = 0;
  const giftItems = [];
  const now = new Date();

  for (const rule of rules || []) {
    const { fecha_inicio, fecha_fin } = rule;

    if (fecha_inicio && new Date(fecha_inicio) > now) continue;
    if (fecha_fin && new Date(fecha_fin) < now) continue;

    switch (rule.tipo) {
      case RULE_TYPES.CROSS_SELL:
        const crossResult = applyCrossSell(modifiedItems, rule);
        if (crossResult.applied) {
          modifiedItems = crossResult.items;
          appliedRules.push({
            ruleId: rule.id,
            tipo: rule.tipo,
            descripcion: rule.nombre,
            ahorro: crossResult.discount,
          });
          totalDiscount += crossResult.discount;
        }
        break;

      case RULE_TYPES.VOLUME_PRICING:
        const volResult = applyVolumePricing(modifiedItems, rule);
        if (volResult.applied) {
          modifiedItems = volResult.items;
          appliedRules.push({
            ruleId: rule.id,
            tipo: rule.tipo,
            descripcion: rule.nombre,
            ahorro: volResult.discount,
          });
          totalDiscount += volResult.discount;
        }
        break;

      case RULE_TYPES.KIT_COMBO:
        const kitResult = applyKitCombo(modifiedItems, rule);
        if (kitResult.applied) {
          modifiedItems = kitResult.items;
          appliedRules.push({
            ruleId: rule.id,
            tipo: rule.tipo,
            descripcion: rule.nombre,
            ahorro: kitResult.discount,
          });
          totalDiscount += kitResult.discount;
        }
        break;

      case RULE_TYPES.INTRO_PRICE:
        const introResult = applyIntroPrice(modifiedItems, rule);
        if (introResult.applied) {
          modifiedItems = introResult.items;
          appliedRules.push({
            ruleId: rule.id,
            tipo: rule.tipo,
            descripcion: rule.nombre,
            ahorro: introResult.discount,
          });
          totalDiscount += introResult.discount;
        }
        break;

      case RULE_TYPES.GIFT_PURCHASE:
        const subtotal = modifiedItems.reduce(
          (sum, item) => sum + item.precio * item.quantity,
          0
        );
        if (subtotal >= rule.condiciones.min_subtotal) {
          giftItems.push({
            productId: rule.condiciones.gift_product_id,
            quantity: 1,
            precio: 0,
            esRegalo: true,
          });
          appliedRules.push({
            ruleId: rule.id,
            tipo: rule.tipo,
            descripcion: rule.nombre,
            ahorro: 0,
          });
        }
        break;

      case RULE_TYPES.LIMITED_EDITION:
        const limitedResult = checkLimitedEdition(modifiedItems, rule);
        if (!limitedResult.valid) {
          modifiedItems = modifiedItems.filter(
            (item) => item.productId !== rule.condiciones.product_id
          );
          appliedRules.push({
            ruleId: rule.id,
            tipo: rule.tipo,
            descripcion: `${rule.nombre} - Stock agotado o expirado`,
            ahorro: 0,
          });
        }
        break;
    }
  }

  return {
    cartItems: modifiedItems,
    appliedRules,
    totalDiscount,
    giftItems,
  };
}

function applyCrossSell(items, rule) {
  const { trigger_product_id, discount_product_id, discount_percent } =
    rule.condiciones;
  const hasTriggger = items.some((item) => item.productId === trigger_product_id);

  if (hasTriggger) {
    const discountItem = items.find(
      (item) => item.productId === discount_product_id
    );
    if (discountItem) {
      const discount = discountItem.precio * discountItem.quantity * (discount_percent / 100);
      discountItem.descuento = (discountItem.descuento || 0) + discount;
      return { applied: true, items, discount };
    }
  }

  return { applied: false, items, discount: 0 };
}

function applyVolumePricing(items, rule) {
  const { product_id, tiers } = rule.condiciones;
  const item = items.find((i) => i.productId === product_id);

  if (!item) return { applied: false, items, discount: 0 };

  const tierMatch = tiers.find((tier) => item.quantity >= tier.min_qty);
  if (tierMatch) {
    const oldPrice = item.precio;
    const newPrice = tierMatch.price;
    const discount = (oldPrice - newPrice) * item.quantity;
    item.precioOriginal = oldPrice;
    item.precio = newPrice;
    return { applied: true, items, discount };
  }

  return { applied: false, items, discount: 0 };
}

function applyKitCombo(items, rule) {
  const { product_ids } = rule.condiciones;
  const hasAllProducts = product_ids.every((id) =>
    items.some((item) => item.productId === id)
  );

  if (!hasAllProducts) return { applied: false, items, discount: 0 };

  let discount = 0;
  if (rule.acciones.discount_percent) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.precio * item.quantity,
      0
    );
    discount = subtotal * (rule.acciones.discount_percent / 100);
  } else if (rule.acciones.fixed_price) {
    const currentTotal = items.reduce(
      (sum, item) => sum + item.precio * item.quantity,
      0
    );
    discount = Math.max(0, currentTotal - rule.acciones.fixed_price);
  }

  return { applied: true, items, discount };
}

function applyIntroPrice(items, rule) {
  const { product_id, special_price } = rule.acciones;
  const item = items.find((i) => i.productId === product_id);

  if (!item) return { applied: false, items, discount: 0 };

  const oldPrice = item.precio;
  const discount = (oldPrice - special_price) * item.quantity;
  item.precioOriginal = oldPrice;
  item.precio = special_price;

  return { applied: true, items, discount };
}

function checkLimitedEdition(items, rule) {
  const { max_stock, expires_at } = rule.condiciones;
  const now = new Date();

  if (expires_at && new Date(expires_at) < now) {
    return { valid: false };
  }

  return { valid: true };
}
