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

  // Cargar mapa de tenants
  useEffect(() => {
    async function loadTenants() {
      try {
        const res = await fetch("/api/admin/tenants");
        if (res.ok) {
          const data = await res.json();
          const map = {};
          (data.tenants || []).forEach((t) => {
            map[t.client_id] = t.nombre;
          });
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

  // Registrar notificaciones push cuando el usuario está autenticado
  useEffect(() => {
    if (!user?.email || pathname === "/admin/login") return;

    const registered = sessionStorage.getItem("push-registered");
    if (!registered) {
      console.log('[admin-layout] Iniciando registro push para:', user.email);
      registerPushNotifications(user.email).then((result) => {
        console.log('[admin-layout] Resultado push:', result);
        if (result) {
          sessionStorage.setItem("push-registered", "true");
          console.log("[AdminLayout] ✓ Notificaciones push registradas");
        } else {
          console.log("[AdminLayout] Push notifications no disponibles");
        }
      });
    }
  }, [user?.email, pathname]);

  // Polling global de escalaciones cada 5 segundos
  useEffect(() => {
    if (pathname === "/admin/login" || !user) return;

    console.log('[AdminLayout] ✓ Iniciando polling global de escalaciones');

    const pollEscalations = async () => {
      try {
        const res = await fetch("/api/admin/escalations?status=pending");
        if (!res.ok) return;

        const data = await res.json();
        const newCount = data.escalations?.length || 0;

        if (newCount > previousCountRef.current) {
          const newEscalation = data.escalations?.[0];
          const clientName = newEscalation ? tenantMap[newEscalation.tenant_id] : "Nuevo cliente";

          console.log('[AdminLayout] 🔔 Nueva escalación de:', clientName);

          // 1. Cambiar título
          document.title = '🔴 Nueva escalación - Admin';

          // 2. Mostrar toast
          setToast({
            message: `Nueva escalación recibida de ${clientName}`,
            type: 'new'
          });

          // 3. Sonido
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
            console.log('[AdminLayout] ✓ Sonido reproducido');
          } catch (err) {
            console.error('[AdminLayout] Audio error:', err.message);
          }

          // 4. Limpiar después de 5 segundos
          setTimeout(() => {
            setToast(null);
            document.title = 'Admin - Panel de Administración';
          }, 5000);
        }

        previousCountRef.current = newCount;
      } catch (err) {
        console.error("[AdminLayout] Polling error:", err.message);
      }
    };

    // Ejecutar inmediatamente y luego cada 5 segundos
    pollEscalations();
    const interval = setInterval(pollEscalations, 5000);

    return () => clearInterval(interval);
  }, [pathname, user, tenantMap]);

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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black">
      {/* Toast global de nuevas escalaciones */}
      {toast && (
        <div className="fixed top-0 left-0 right-0 bg-red-100 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 px-6 py-4 animate-pulse z-50">
          <div className="max-w-6xl mx-auto">
            <p className="text-red-700 dark:text-red-300 font-medium">
              🔴 {toast.message}
            </p>
          </div>
        </div>
      )}

      <header className={`bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex-shrink-0 ${toast ? 'mt-16' : ''}`}>
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
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
