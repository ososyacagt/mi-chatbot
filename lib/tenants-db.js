import { supabase, isSupabaseConfigured } from "./supabase";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_CURRENCY,
  DEFAULT_AI_PROVIDER,
  DEFAULT_AI_MODEL,
  DEFAULT_COLOR_PRIMARY,
  DEFAULT_WELCOME_MESSAGE,
  DEFAULT_ESCALATION_MESSAGE,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TENANT_NAME
} from "./constants";

function mapTenantFromDb(dbRecord) {
  if (!dbRecord) return null;
  return {
    id: dbRecord.client_id,
    client_id: dbRecord.client_id,
    nombre: dbRecord.nombre,
    systemPrompt: dbRecord.system_prompt,
    welcomeMessage: dbRecord.welcome_message,
    colorPrimary: dbRecord.color_primary,
    aiProvider: dbRecord.ai_provider || DEFAULT_AI_PROVIDER,
    aiModel: dbRecord.ai_model || DEFAULT_AI_MODEL,
    plan: dbRecord.plan || "basic",
    mensajeLimite: dbRecord.mensaje_limite || 100,
    mensajesUsados: dbRecord.mensajes_usados || 0,
    planResetDate: dbRecord.plan_reset_date,
    adminEmail: dbRecord.admin_email || null,
    escalationEnabled: dbRecord.escalation_enabled !== false,
    escalationMessage: dbRecord.escalation_message || DEFAULT_ESCALATION_MESSAGE,
    theme: dbRecord.theme || "auto",
    defaultLanguage: dbRecord.default_language || DEFAULT_LANGUAGE,
    autoDetectLanguage: dbRecord.auto_detect_language !== false,
    ecommerceMode: dbRecord.ecommerce_mode || 'none',
    whatsappNumber: dbRecord.whatsapp_number || null,
    currency: dbRecord.currency || DEFAULT_CURRENCY,
  };
}

const FALLBACK_TENANTS = [
  {
    id: "default",
    nombre: DEFAULT_TENANT_NAME,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    colorPrimary: DEFAULT_COLOR_PRIMARY,
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
  },
];

const DEFAULT_TENANT = FALLBACK_TENANTS[0];

async function getTenantFromSupabase(clientId) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error) {
      console.error(`[tenants] Error al buscar tenant "${clientId}":`, error.message);
      return null;
    }

    const mappedData = mapTenantFromDb(data);
    return mappedData;
  } catch (error) {
    console.error(`[tenants] Error inesperado buscando tenant:`, error.message);
    return null;
  }
}

export async function getTenant(clientId) {
  const tenantFromDb = await getTenantFromSupabase(clientId);
  if (tenantFromDb) {
    return tenantFromDb;
  }

  const fallbackTenant = FALLBACK_TENANTS.find(t => t.client_id === clientId) || DEFAULT_TENANT;
  return fallbackTenant;
}

async function getTenantsFromSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`[tenants] Error al buscar todos los tenants:`, error.message);
      return null;
    }

    const mappedData = (data || []).map(mapTenantFromDb);
    return mappedData;
  } catch (error) {
    console.error(`[tenants] Error inesperado buscando tenants:`, error.message);
    return null;
  }
}

export async function getTenants() {
  const tenantsFromDb = await getTenantsFromSupabase();
  if (tenantsFromDb && tenantsFromDb.length > 0) {
    return tenantsFromDb;
  }

  return FALLBACK_TENANTS;
}

export { DEFAULT_TENANT };
