import { createSupabaseAdmin } from './supabase-admin'

export async function getPlanLimits(tenantId) {
  const supabase = createSupabaseAdmin()

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan')
    .eq('client_id', tenantId)
    .single()

  if (tenantError || !tenant) {
    console.error('[plan-limits] Error fetching tenant:', tenantError)
    return null
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('slug', tenant.plan)
    .single()

  if (planError || !plan) {
    console.error('[plan-limits] Error fetching plan:', planError)
    return null
  }

  return plan
}

export async function canUseEcommerceMode(tenantId, mode) {
  const plan = await getPlanLimits(tenantId)
  if (!plan) return false
  const allowedModes = plan.ecommerce_modes || []
  return allowedModes.includes(mode)
}

export async function checkProductLimit(tenantId) {
  const plan = await getPlanLimits(tenantId)
  if (!plan || plan.max_productos === 0) return { allowed: false, limit: 0, current: 0 }

  const supabase = createSupabaseAdmin()
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[plan-limits] Error counting products:', error)
    return { allowed: false, limit: plan.max_productos, current: 0 }
  }

  return {
    allowed: (count || 0) < plan.max_productos,
    limit: plan.max_productos,
    current: count || 0
  }
}

export async function checkCategoryLimit(tenantId) {
  const plan = await getPlanLimits(tenantId)
  if (!plan || plan.max_categorias === 0) return { allowed: false, limit: 0, current: 0 }

  const supabase = createSupabaseAdmin()
  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[plan-limits] Error counting categories:', error)
    return { allowed: false, limit: plan.max_categorias, current: 0 }
  }

  return {
    allowed: (count || 0) < plan.max_categorias,
    limit: plan.max_categorias,
    current: count || 0
  }
}

export async function checkRuleLimit(tenantId) {
  const plan = await getPlanLimits(tenantId)
  if (!plan || plan.max_reglas === 0) return { allowed: false, limit: 0, current: 0 }

  const supabase = createSupabaseAdmin()
  const { count, error } = await supabase
    .from('business_rules')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[plan-limits] Error counting rules:', error)
    return { allowed: false, limit: plan.max_reglas, current: 0 }
  }

  return {
    allowed: (count || 0) < plan.max_reglas,
    limit: plan.max_reglas,
    current: count || 0
  }
}
