"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [waitMinutes, setWaitMinutes] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setError("Email y contraseña son requeridos");
        setLoading(false);
        return;
      }

      // Paso 1: Verificar rate limit
      console.log("[Login] Verificando rate limit");
      const checkRes = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "check" }),
      });

      const checkData = await checkRes.json();

      if (!checkData.allowed) {
        console.log("[Login] Rate limit bloqueado");
        setError(`Demasiados intentos. Espera ${checkData.waitMinutes} minuto${checkData.waitMinutes > 1 ? "s" : ""}.`);
        setWaitMinutes(checkData.waitMinutes);
        setLoading(false);
        return;
      }

      // Paso 2: Intentar login directo con Supabase
      console.log("[Login] Intentando autenticación con Supabase");
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.log("[Login] Autenticación fallida:", authError.message);

        // Paso 3: Registrar intento fallido
        await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, action: "failed" }),
        });

        setError(authError.message || "Error al iniciar sesión");
        if (checkData.remaining !== undefined && checkData.remaining > 0) {
          setRemaining(checkData.remaining);
          if (checkData.remaining <= 2) {
            setWarning(`⚠️ ${checkData.remaining} intento${checkData.remaining > 1 ? "s" : ""} restante${checkData.remaining > 1 ? "s" : ""} antes del bloqueo`);
          }
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        console.log("[Login] No user data returned");
        setError("Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // Paso 4: Registrar login exitoso
      console.log("[Login] ✓ Sesión iniciada:", data.user.email);
      await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "success" }),
      });

      window.location.href = "/admin";
    } catch (err) {
      console.error("[Login] Error:", err);
      setError(err.message || "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
          Panel de Administración
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          Inicia sesión para continuar
        </p>

        {waitMinutes > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-950 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-4 rounded-lg flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <div className="font-semibold">Acceso bloqueado</div>
              <div className="text-sm mt-1">Espera {waitMinutes} minuto{waitMinutes > 1 ? "s" : ""} antes de intentar de nuevo.</div>
            </div>
          </div>
        )}

        {error && !waitMinutes && (
          <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {warning && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
            {warning}
          </div>
        )}

        <form onSubmit={handleLogin} className={`space-y-4 ${waitMinutes > 0 ? "opacity-50 pointer-events-none" : ""}`} disabled={waitMinutes > 0}>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              disabled={loading || waitMinutes > 0}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading || waitMinutes > 0}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || waitMinutes > 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
          ¿Problemas con el acceso? Contacta al administrador.
        </p>
      </div>
    </div>
  );
}
