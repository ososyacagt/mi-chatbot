"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function POSLoginPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId;

  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadConfigAndUsers();
    }
  }, [clientId]);

  const loadConfigAndUsers = async () => {
    try {
      setLoading(true);
      // Fetch POS config
      const configRes = await fetch(`/api/pos/${clientId}`);
      if (!configRes.ok) throw new Error("No se pudo cargar la configuración");
      const configData = await configRes.json();
      setConfig(configData.config);

      // Fetch POS users
      const usersRes = await fetch(`/api/pos/${clientId}/auth`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (err) {
      console.error("[POS Login] Error loading data:", err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (num) => {
    setError("");
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUser || !pin) return;

    try {
      setAuthenticating(true);
      setError("");

      const res = await fetch(`/api/pos/${clientId}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, pin }),
      });

      const data = await res.json();

      if (res.ok) {
        // Save to sessionStorage
        sessionStorage.setItem("posUser", JSON.stringify(data.user));
        router.push(`/pos/${clientId}`);
      } else {
        setError(data.error || "PIN incorrecto");
        setPin("");
      }
    } catch (err) {
      console.error("[POS Login] Error authenticating:", err);
      setError("Error de red al autenticar");
    } finally {
      setAuthenticating(false);
    }
  };

  // Submit automatically when PIN is 4 or more digits
  useEffect(() => {
    if (selectedUser && pin.length >= 4) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pin, selectedUser]);

  const handlePublicAccess = () => {
    const publicUser = {
      id: "public",
      nombre: "Auto-Servicio",
      rol: "operador",
      areaId: null,
      isPublic: true,
    };
    sessionStorage.setItem("posUser", JSON.stringify(publicUser));
    router.push(`/pos/${clientId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium animate-pulse">Cargando sistema POS...</p>
      </div>
    );
  }

  const primaryColor = config?.colorPrimary || "#3b82f6";
  const hasAutoservicio = config?.posModalidad?.includes("autoservicio");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      <div className="w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Left Side - User Selector */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🏪</span>
              <div>
                <h1 className="text-xl font-black tracking-tight">{config?.storeName || "Mi Chatbot"}</h1>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Terminal Punto de Venta</p>
              </div>
            </div>

            <h2 className="text-lg font-bold mb-4 text-slate-200">Selecciona tu usuario:</h2>

            {users.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl text-center">
                <p className="text-slate-400 text-sm mb-1">No hay usuarios POS registrados</p>
                <p className="text-xs text-slate-500">Regístralos en el Panel de Administración</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {users.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  const initials = user.nombre.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                  
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setPin("");
                        setError("");
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all duration-300 flex items-center gap-3 relative overflow-hidden group ${
                        isSelected
                          ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                          : "bg-slate-800/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                          isSelected ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
                        }`}
                        style={isSelected ? { backgroundColor: primaryColor } : {}}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-200 truncate">{user.nombre}</p>
                        <p className="text-xs text-slate-400 capitalize">{user.rol}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute right-3 top-3 w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {hasAutoservicio && (
            <div className="mt-8 pt-6 border-t border-slate-800/60">
              <button
                onClick={handlePublicAccess}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 hover:from-teal-500/20 hover:to-emerald-500/20 border border-teal-500/30 text-teal-400 hover:text-teal-300 font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
              >
                <span>🤖</span> Modo Kiosco / Auto-servicio Público
              </button>
            </div>
          )}
        </div>

        {/* Right Side - Keypad Entry */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center items-center bg-slate-950/40">
          <div className="w-full max-w-[280px] flex flex-col items-center">
            {selectedUser ? (
              <>
                <div className="text-center mb-6">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Ingresa PIN para</p>
                  <p className="font-black text-lg text-slate-100">{selectedUser.nombre}</p>
                </div>

                {/* PIN Dots display */}
                <div className="flex gap-4 mb-8 justify-center items-center h-8">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                        pin.length > i
                          ? "scale-110"
                          : "border-slate-800 bg-transparent"
                      }`}
                      style={pin.length > i ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                    />
                  ))}
                  {pin.length > 4 && (
                    <div className="text-xs text-slate-400 font-bold">+{pin.length - 4}</div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-xl mb-4 text-center font-medium animate-shake w-full">
                    {error}
                  </div>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleKeyPress(num.toString())}
                      className="aspect-square rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 font-bold text-xl active:scale-95 transition-all duration-100 flex items-center justify-center text-slate-200"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleClear}
                    className="aspect-square rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-900 hover:border-slate-800 font-bold text-sm text-slate-400 active:scale-95 transition-all duration-100 flex items-center justify-center"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={() => handleKeyPress("0")}
                    className="aspect-square rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 font-bold text-xl active:scale-95 transition-all duration-100 flex items-center justify-center text-slate-200"
                  >
                    0
                  </button>
                  <button
                    onClick={handleBackspace}
                    className="aspect-square rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-900 hover:border-slate-800 font-bold text-xl text-slate-400 active:scale-95 transition-all duration-100 flex items-center justify-center"
                  >
                    ⌫
                  </button>
                </div>

                {authenticating && (
                  <p className="mt-4 text-xs text-slate-400 animate-pulse">Verificando PIN...</p>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <span className="text-5xl block mb-4 filter drop-shadow-[0_10px_15px_rgba(59,130,246,0.15)]">🔐</span>
                <p className="text-slate-400 text-sm font-semibold">Selecciona un usuario a la izquierda para comenzar sesión.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
