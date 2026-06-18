import { createSupabaseServer } from "./supabase-server";

export async function getSession() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getAdminUser(userId) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", userId)
    .single();

  console.log("[getAdminUser] userId:", userId, "data:", data, "error:", error);

  if (error || !data) return null;

  return {
    ...data,
    tenant_ids: data.tenant_ids || [],
  };
}

export function isSuperAdmin(adminUser) {
  return adminUser?.role === "superadmin";
}
