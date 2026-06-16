import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log initial values
console.log("[Supabase] NEXT_PUBLIC_SUPABASE_URL:", rawUrl ? `✓ (${rawUrl.substring(0, 30)}...)` : "❌ NO CONFIGURADA");
console.log("[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? `✓ (${supabaseAnonKey.substring(0, 20)}...)` : "❌ NO CONFIGURADA");

// Limpia la URL removiendo /rest/v1 si está presente
const supabaseUrl = rawUrl?.replace(/\/rest\/v1\/?$/, "");

console.log("[Supabase] URL después de limpiar:", supabaseUrl);

let supabase = null;
let initError = null;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("[Supabase] ✓ Cliente creado exitosamente");
  } else {
    console.warn("[Supabase] ⚠️ Falta URL o KEY, cliente no inicializado");
  }
} catch (error) {
  initError = error.message;
  console.error("[Supabase] ❌ Error al crear cliente:", error.message);
}

// Indica si Supabase está disponible
export const isSupabaseConfigured = () => {
  const configured = !!supabase && !!supabaseUrl && !!supabaseAnonKey;
  console.log("[isSupabaseConfigured] checking:", { supabaseExists: !!supabase, urlExists: !!supabaseUrl, keyExists: !!supabaseAnonKey, result: configured });
  return configured;
};

export { supabase, initError };
