import { supabase, isSupabaseConfigured } from "./supabase";

// Mapea campos snake_case de Supabase a camelCase
function mapTenantFromDb(dbRecord) {
  if (!dbRecord) return null;
  return {
    id: dbRecord.client_id,
    client_id: dbRecord.client_id,
    nombre: dbRecord.nombre,
    systemPrompt: dbRecord.system_prompt,
    welcomeMessage: dbRecord.welcome_message,
    colorPrimary: dbRecord.color_primary,
    aiProvider: dbRecord.ai_provider || "claude",
    aiModel: dbRecord.ai_model || "claude-sonnet-4-6",
    plan: dbRecord.plan || "basic",
    mensajeLimite: dbRecord.mensaje_limite || 100,
    mensajesUsados: dbRecord.mensajes_usados || 0,
    planResetDate: dbRecord.plan_reset_date,
  };
}

// Datos mínimos hardcodeados para usar como fallback si Supabase falla
const FALLBACK_TENANTS = [
  {
    id: "default",
    nombre: "Asistente Virtual",
    systemPrompt: "Eres un asistente virtual útil, claro y cordial. Responde de forma concisa y servicial.",
    colorPrimary: "#2563eb",
    welcomeMessage: "¡Hola! ¿En qué puedo ayudarte hoy?",
  },
];

const DEFAULT_TENANT = FALLBACK_TENANTS[0];

// Busca un tenant en Supabase por client_id
async function getTenantFromSupabase(clientId) {
  if (!isSupabaseConfigured()) {
    console.log(`[getTenant] Supabase no está configurado, usando fallback`);
    return null;
  }

  try {
    console.log(`[getTenant] Buscando tenant con clientId: "${clientId}" en Supabase`);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error) {
      console.error(`[getTenant] Error al buscar tenant "${clientId}" en Supabase:`, error.code, error.message);
      return null;
    }

    const mappedData = mapTenantFromDb(data);
    console.log(`[getTenant] ✓ Tenant encontrado en Supabase:`, mappedData?.id);
    return mappedData;
  } catch (error) {
    console.error(`[getTenant] Error inesperado:`, error.message);
    return null;
  }
}

// Obtiene un tenant desde Supabase con fallback hardcodeado
export async function getTenant(clientId) {
  console.log(`[getTenant] Inicio - clientId: "${clientId}"`);

  // Intenta obtener de Supabase primero
  const tenantFromDb = await getTenantFromSupabase(clientId);
  if (tenantFromDb) {
    return tenantFromDb;
  }

  // Fallback a datos hardcodeados
  const fallbackTenant = FALLBACK_TENANTS.find(t => t.client_id === clientId) || DEFAULT_TENANT;
  console.log(`[getTenant] Usando fallback hardcodeado - devolviendo:`, fallbackTenant?.client_id);
  return fallbackTenant;
}

// Busca todos los tenants en Supabase
async function getTenantsFromSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    console.log(`[getTenants] Buscando todos los tenants en Supabase`);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`[getTenants] Error al buscar tenants en Supabase:`, error.code, error.message);
      return null;
    }

    const mappedData = (data || []).map(mapTenantFromDb);
    console.log(`[getTenants] ✓ ${mappedData?.length || 0} tenants encontrados en Supabase`);
    return mappedData;
  } catch (error) {
    console.error(`[getTenants] Error inesperado:`, error.message);
    return null;
  }
}

// Obtiene lista de tenants desde Supabase con fallback hardcodeado
export async function getTenants() {
  console.log(`[getTenants] Inicio`);

  // Intenta obtener de Supabase primero
  const tenantsFromDb = await getTenantsFromSupabase();
  if (tenantsFromDb && tenantsFromDb.length > 0) {
    return tenantsFromDb;
  }

  // Fallback a datos hardcodeados
  console.log(`[getTenants] Usando fallback hardcodeado - devolviendo ${FALLBACK_TENANTS.length} tenants`);
  return FALLBACK_TENANTS;
}

export { DEFAULT_TENANT };
