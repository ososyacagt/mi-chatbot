import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request,
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = request.nextUrl.pathname.startsWith("/admin/login");

  console.log("[Middleware] Ruta:", request.nextUrl.pathname);
  console.log("[Middleware] Usuario:", user?.email);
  console.log("[Middleware] Es admin:", isAdminRoute);
  console.log("[Middleware] Es login:", isLoginPage);

  if (isAdminRoute && !isLoginPage && !user) {
    console.log("[Middleware] Redirigiendo a /admin/login (sin usuario)");
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (isLoginPage && user) {
    console.log("[Middleware] Redirigiendo a /admin (usuario logueado)");
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && !isLoginPage && user) {
    try {
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id, email, role, tenant_id")
        .eq("id", user.id)
        .single();

      if (adminUser) {
        response.headers.set("x-admin-role", adminUser.role || "");
        response.headers.set("x-admin-tenant", adminUser.tenant_id || "");
        console.log("[Middleware] Admin role:", adminUser.role);
      }
    } catch (error) {
      console.error("[Middleware] Error obteniendo adminUser:", error);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
