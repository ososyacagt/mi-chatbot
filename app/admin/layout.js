/* UX/UI: Admin layout con header refinado, toast de escalaciones mejorado y spinner premium */
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";
import Link from "next/link";
import { registerPushNotifications } from "@/lib/push-client";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [tenantMap, setTenantMap] = useState({});
  const previousCountRef = useRef(0);

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
          router.push("/admin/login");
          return;
        }
        setUser(session.user);
      } catch (error) {
        console.error("[AdminLayout] Error:", error);
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }

    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }
    checkSession();
  }, [pathname, router]);

  // Cargar mapa de tenants
  useEffect(() => {
    async function loadTenants() {
      try {
        const res = await fetch("/api/admin/tenants");
        if (res.ok) {
          const data = await res.json();
          const map = {};
          (data.tenants || []).forEach((t) => { map[t.client_id] = t.nombre; });
          setTenantMap(map);
        }
      } catch (err) {
        console.error("[AdminLayout] Error cargando tenants:", err);
      }
    }
    if (user && pathname !== "/admin/login") {
      loadTenants();
    }
  }, [user, pathname]);

  // Registrar notificaciones push
  useEffect(() => {
    if (!user?.email || pathname === "/admin/login") return;
    const registered = sessionStorage.getItem("push-registered");
    if (!registered) {
      registerPushNotifications(user.email).then((result) => {
        if (result) sessionStorage.setItem("push-registered", "true");
      });
    }
  }, [user?.email, pathname]);

  // Polling global de escalaciones cada 5 segundos
  useEffect(() => {
    if (pathname === "/admin/login" || !user) return;

    const pollEscalations = async () => {
      try {
        const res = await fetch("/api/admin/escalations?status=pending");
        if (!res.ok) return;

        const data = await res.json();
        const newCount = data.escalations?.length || 0;

        if (newCount > previousCountRef.current) {
          const newEscalation = data.escalations?.[0];
          const clientName = newEscalation ? tenantMap[newEscalation.tenant_id] : "Nuevo cliente";

          document.title = "🔴 Nueva escalación - Admin";
          setToast({ message: `Nueva escalación recibida de ${clientName}`, type: "new" });

          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
          } catch (err) {
            console.error("[AdminLayout] Audio error:", err.message);
          }

          setTimeout(() => {
            setToast(null);
            document.title = "Admin - Panel de Administración";
          }, 8000);
        }

        previousCountRef.current = newCount;
      } catch (err) {
        console.error("[AdminLayout] Polling error:", err.message);
      }
    };

    pollEscalations();
    const interval = setInterval(pollEscalations, 5000);
    return () => clearInterval(interval);
  }, [pathname, user, tenantMap]);

  async function handleLogout() {
    try {
      await supabaseClient.auth.signOut();
      router.push("/admin/login");
    } catch (error) {
      console.error("[AdminLayout] Error al cerrar sesión:", error);
    }
  }

  // Login: sin header
  if (pathname === "/admin/login") return children;

  // Loading premium
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">

      {/* ── Toast de nueva escalación ────────────────────────────── */}
      {toast && (
        <div className="
          fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4
          animate-[slide-down_300ms_ease-out]
        ">
          <style>{`
            @keyframes slide-down {
              from { opacity: 0; transform: translate(-50%, -16px); }
              to   { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
          <div className="
            bg-red-600 text-white px-5 py-4 rounded-2xl shadow-xl shadow-red-600/25
            flex items-center gap-3
          ">
            {/* Punto pulsante */}
            <span className="relative flex-shrink-0 w-3 h-3">
              <span className="absolute inset-0 rounded-full bg-white/50 animate-ping" />
              <span className="relative block w-3 h-3 rounded-full bg-white" />
            </span>
            <p className="font-semibold text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => { setToast(null); document.title = "Admin - Panel de Administración"; }}
              className="opacity-70 hover:opacity-100 rounded"
              aria-label="Cerrar notificación"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Header principal ─────────────────────────────────────── */}
      <header className="
        sticky top-0 z-40
        bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md
        border-b border-zinc-200/80 dark:border-zinc-800/80
        px-6 py-3.5 flex-shrink-0
      ">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo + título */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">
                Panel de Administración
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Inicio
            </Link>

            <button
              onClick={handleLogout}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                text-xs font-medium text-zinc-500 dark:text-zinc-400
                hover:bg-red-50 dark:hover:bg-red-950/30
                hover:text-red-600 dark:hover:text-red-400
              "
              title="Cerrar sesión"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
