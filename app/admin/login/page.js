/* UX/UI: Login rediseñado con fondo abstracto oscuro, glassmorphism, íconos SVG en inputs */
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
  const [showPassword, setShowPassword] = useState(false);

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
      const checkRes = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "check" }),
      });

      const checkData = await checkRes.json();

      if (!checkData.allowed) {
        setError(`Demasiados intentos. Espera ${checkData.waitMinutes} minuto${checkData.waitMinutes > 1 ? "s" : ""}.`);
        setWaitMinutes(checkData.waitMinutes);
        setLoading(false);
        return;
      }

      // Paso 2: Autenticación con Supabase
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (authError) {
        await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, action: "failed" }),
        });

        setError(authError.message || "Error al iniciar sesión");
        if (checkData.remaining !== undefined && checkData.remaining > 0) {
          setRemaining(checkData.remaining);
          if (checkData.remaining <= 2) {
            setWarning(`${checkData.remaining} intento${checkData.remaining > 1 ? "s" : ""} restante${checkData.remaining > 1 ? "s" : ""} antes del bloqueo`);
          }
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // Paso 4: Registrar éxito
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

  const isBlocked = waitMinutes > 0;

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-zinc-950">
      {/* Fondo abstracto con radiales */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[100px]" />
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Card con glassmorphism */}
      <div className="
        relative z-10 w-full max-w-md
        bg-white/[0.06] backdrop-blur-2xl
        border border-white/10
        rounded-2xl shadow-2xl shadow-black/40
        p-8
      ">
        {/* Logo / Ícono del producto */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/90 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-1">
          Panel de Administración
        </h1>
        <p className="text-zinc-400 text-sm text-center mb-7">
          Inicia sesión para continuar
        </p>

        {/* Alerta de bloqueo */}
        {isBlocked && (
          <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3.5 rounded-xl">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <div>
              <div className="font-semibold text-sm">Acceso bloqueado temporalmente</div>
              <div className="text-xs mt-0.5 opacity-80">Espera {waitMinutes} minuto{waitMinutes > 1 ? "s" : ""} antes de intentar de nuevo.</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isBlocked && (
          <div className="mb-5 flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Advertencia de intentos restantes */}
        {warning && (
          <div className="mb-5 flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-xl text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {warning}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className={`space-y-4 ${isBlocked ? "opacity-40 pointer-events-none select-none" : ""}`}
        >
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                disabled={loading || isBlocked}
                autoComplete="email"
                className="
                  w-full pl-10 pr-4 py-2.5
                  bg-white/5 border border-white/10
                  rounded-xl text-white placeholder-zinc-500 text-sm
                  focus:outline-none focus:border-blue-500/60 focus:bg-white/8
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || isBlocked}
                autoComplete="current-password"
                className="
                  w-full pl-10 pr-10 py-2.5
                  bg-white/5 border border-white/10
                  rounded-xl text-white placeholder-zinc-500 text-sm
                  focus:outline-none focus:border-blue-500/60 focus:bg-white/8
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Botón submit */}
          <button
            type="submit"
            disabled={loading || isBlocked}
            className="
              w-full py-2.5 mt-2 rounded-xl font-semibold text-sm text-white
              bg-blue-600 hover:bg-blue-500 active:bg-blue-700
              shadow-lg shadow-blue-600/25
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            "
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Iniciando sesión...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-6">
          ¿Problemas con el acceso? Contacta al administrador.
        </p>
      </div>
    </div>
  );
}
