import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getAdminUser(userId) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, role, tenant_id")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[getAdminUser] Error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[getAdminUser] Error inesperado:", error);
    return null;
  }
}

export function isSuperAdmin(adminUser) {
  return adminUser && adminUser.role === "superadmin";
}
