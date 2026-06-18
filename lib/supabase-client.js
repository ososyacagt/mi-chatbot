"use client";

import { createBrowserClient } from "@supabase/ssr";

let client = null;

export function getSupabaseClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error("Faltan variables de entorno de Supabase");
    }

    client = createBrowserClient(url, key);
  }
  return client;
}

// Mantener compatibilidad con imports existentes
export const supabaseClient = {
  auth: {
    signInWithPassword: (params) =>
      getSupabaseClient().auth.signInWithPassword(params),
    signOut: () => getSupabaseClient().auth.signOut(),
    getSession: () => getSupabaseClient().auth.getSession(),
    getUser: () => getSupabaseClient().auth.getUser(),
    onAuthStateChange: (cb) =>
      getSupabaseClient().auth.onAuthStateChange(cb),
  },
};
