"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (!session) {
          // No hay sesión, redirigir a login
          router.push("/admin/login");
          return;
        }

        setUser(session.user);
        console.log("[AdminLayout] ✓ Sesión válida:", session.user.email);
      } catch (error) {
        console.error("[AdminLayout] Error:", error);
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }

    // No verificar si estamos en login
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    checkSession();
  }, [pathname, router]);

  // Si estamos en login, no mostrar el header
  if (pathname === "/admin/login") {
    return children;
  }

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-zinc-500 dark:text-zinc-400">Verificando sesión...</div>
      </div>
    );
  }

  // Si no hay usuario, no mostrar nada (el useEffect redirigirá)
  if (!user) {
    return null;
  }

  async function handleLogout() {
    try {
      await supabaseClient.auth.signOut();
      console.log("[AdminLayout] ✓ Sesión cerrada");
      router.push("/admin/login");
    } catch (error) {
      console.error("[AdminLayout] Error al cerrar sesión:", error);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Panel de Administración
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ← Volver al chat
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
