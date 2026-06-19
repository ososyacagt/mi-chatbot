"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function InvitacionesPage() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [generatingInvitation, setGeneratingInvitation] = useState(false);
  const [newInvitation, setNewInvitation] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  async function loadInvitations() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/invitations");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar invitaciones");
      }

      setInvitations(data.invitations || []);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateInvitation() {
    try {
      setGeneratingInvitation(true);
      setError(null);

      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al generar invitación");
      }

      setNewInvitation(data.invitation);
      setEmail("");
      await loadInvitations();
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setGeneratingInvitation(false);
    }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getInvitationStatus(invitation) {
    if (invitation.used) {
      return { status: "usado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    }
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return { status: "expirado", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" };
    }
    return { status: "pendiente", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Volver
            </Link>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
              ✉️ Invitaciones de onboarding
            </h2>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium transition-colors shadow-md hover:shadow-lg"
          >
            ✨ Generar nueva
          </button>
        </div>
      </div>

      {/* Error mensaje */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                Generar nueva invitación
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewInvitation(null);
                }}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {newInvitation ? (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
                    ✓ Invitación generada exitosamente
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      URL de invitación
                    </label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        readOnly
                        value={newInvitation.url}
                        className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(newInvitation.url, "url")}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                      >
                        {copiedId === "url" ? "✓ Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Token
                    </label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        readOnly
                        value={newInvitation.token}
                        className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(newInvitation.token, "token")}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                      >
                        {copiedId === "token" ? "✓ Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Expira: {new Date(newInvitation.expires_at).toLocaleDateString("es-ES")}
                  </p>

                  <button
                    onClick={() => {
                      setShowModal(false);
                      setNewInvitation(null);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Si proporcionas un email, se pre-completará en el formulario
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateInvitation}
                      disabled={generatingInvitation}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      {generatingInvitation ? "Generando..." : "Generar"}
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border-2 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de invitaciones */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-zinc-500 dark:text-zinc-400">Cargando invitaciones...</div>
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">✉️</div>
          <div className="text-zinc-500 dark:text-zinc-400 mb-6">
            No hay invitaciones creadas. ¡Crea una para empezar!
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            ✨ Generar invitación
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                  Token
                </th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                  Estado
                </th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => {
                const { status, color } = getInvitationStatus(invitation);
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
                const invitationUrl = `${appUrl}/onboarding?token=${invitation.token}`;

                return (
                  <tr
                    key={invitation.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                      {invitation.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                      {invitation.token.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>
                        {status === "pendiente" && "⏳ Pendiente"}
                        {status === "usado" && "✓ Usado"}
                        {status === "expirado" && "✗ Expirado"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(invitation.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(invitationUrl, invitation.id)}
                          className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-sm font-medium transition-colors"
                        >
                          {copiedId === invitation.id ? "✓" : "Copiar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
