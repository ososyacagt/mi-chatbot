/* UX/UI: Dashboard rediseñado con cards jerarquizadas, skeleton loader, acciones agrupadas e íconos SVG */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmModal from "./components/ConfirmModal";

/* ─── Íconos SVG compactos ───────────────────────────────────── */
const Icon = {
  chat: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>,
  history: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  widget: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
  metrics: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  escalation: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
  inventory: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
  store: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>,
  orders: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>,
  edit: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>,
  delete: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  users: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  audit: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" /></svg>,
  invitations: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>,
  plans: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
  plus: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
};

/* ─── Skeleton de carga ──────────────────────────────────────── */
function TenantCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
          <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
        <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4" />
      <div className="grid grid-cols-4 gap-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ─── Tarjeta de cliente ─────────────────────────────────────── */
function TenantCard({ tenant, user, escalationCounts, pendingOrdersCounts, onDelete }) {
  const usedRatio = tenant.mensajeLimite === -1
    ? 1
    : (tenant.mensajesUsados || 0) / (tenant.mensajeLimite || 100);

  const barColor =
    tenant.mensajeLimite === -1 ? "bg-emerald-500"
    : usedRatio > 0.9 ? "bg-red-500"
    : usedRatio > 0.7 ? "bg-amber-500"
    : "bg-emerald-500";

  const escalations = escalationCounts[tenant.client_id] || 0;
  const pendingOrders = pendingOrdersCounts[tenant.client_id] || 0;

  return (
    <article className="
      bg-white dark:bg-zinc-900
      rounded-2xl border border-zinc-200 dark:border-zinc-800
      shadow-sm hover:shadow-md
      transition-shadow duration-200
      flex flex-col overflow-hidden
    ">
      {/* Barra de color de marca */}
      <div className="h-1 w-full" style={{ backgroundColor: tenant.colorPrimary }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-zinc-900 dark:text-white truncate">{tenant.nombre}</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">{tenant.client_id}</p>
          </div>
          <div
            className="w-9 h-9 rounded-xl flex-shrink-0 ring-2 ring-white dark:ring-zinc-900 shadow-sm"
            style={{ backgroundColor: tenant.colorPrimary }}
            title={`Color: ${tenant.colorPrimary}`}
          />
        </div>

        {/* Uso de mensajes */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 capitalize">
              {tenant.plan || "Basic"}
            </span>
            {tenant.mensajeLimite === -1 ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">∞ Unlimited</span>
            ) : (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {tenant.mensajesUsados || 0}/{tenant.mensajeLimite || 100}
              </span>
            )}
          </div>
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(usedRatio * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Acciones — separadas en grupos semánticos */}
        <div className="mt-auto space-y-2">
          {/* Grupo secundario: Gestión */}
          <div className="grid grid-cols-4 gap-2">
            <Link
              href={`/admin/conversaciones?clientId=${tenant.id}`}
              className="flex items-center justify-center gap-1 h-8 px-2 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
              title="Historial"
            >
              {Icon.history} <span className="hidden sm:inline">Historial</span>
            </Link>
            <Link
              href={`/admin/metricas?clientId=${tenant.client_id}`}
              className="flex items-center justify-center gap-1 h-8 px-2 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
              title="Métricas"
            >
              {Icon.metrics} <span className="hidden sm:inline">Métricas</span>
            </Link>
            <Link
              href={`/admin/inventario?clientId=${tenant.client_id}`}
              className="flex items-center justify-center gap-1 h-8 px-2 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
              title="Inventario"
            >
              {Icon.inventory} <span className="hidden sm:inline">Inventario</span>
            </Link>
            <Link
              href={`/admin/widget?client=${tenant.id}`}
              className="flex items-center justify-center gap-1 h-8 px-2 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
              title="Widget"
            >
              {Icon.widget} <span className="hidden sm:inline">Widget</span>
            </Link>
          </div>

          {/* Grupo de alertas: Escalaciones y Órdenes */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/admin/escalaciones?clientId=${tenant.client_id}`}
              className="relative flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-950/30 hover:bg-rose-200 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900"
            >
              {Icon.escalation} Escalaciones
              {escalations > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 animate-pulse">
                  {escalations}
                </span>
              )}
            </Link>
            <Link
              href={`/admin/ordenes?clientId=${tenant.client_id}`}
              className="relative flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/30 hover:bg-indigo-200 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-900"
            >
              {Icon.orders} Órdenes
              {pendingOrders > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
                  {pendingOrders}
                </span>
              )}
            </Link>
          </div>

          {/* Botones dinámicos según modalidades activas */}
          <div className="flex flex-wrap gap-2">
            {tenant.ecommerceModes?.includes('catalogo_whatsapp') && (
              <a href={`/catalogo/${tenant.id}`} target="_blank" rel="noopener noreferrer"
                className="h-9 inline-flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs transition-colors bg-cyan-600 hover:bg-cyan-700 text-white whitespace-nowrap">
                🛍️ Catálogo
              </a>
            )}
            {tenant.ecommerceModes?.includes('chatbot_simple') && (
              <a href={`/chat/${tenant.id}`} target="_blank" rel="noopener noreferrer"
                className="h-9 inline-flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs transition-colors bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
                💬 Chatbot
              </a>
            )}
            {tenant.ecommerceModes?.includes('chatbot') && (
              <a href={`/chat/${tenant.id}`} target="_blank" rel="noopener noreferrer"
                className="h-9 inline-flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs transition-colors bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap">
                🤖 Chatbot
              </a>
            )}
            {tenant.ecommerceModes?.includes('tienda') && (
              <a href={`/tienda/${tenant.id}`} target="_blank" rel="noopener noreferrer"
                className="h-9 inline-flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs transition-colors bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap">
                🏪 Tienda
              </a>
            )}
            {tenant.ecommerceModes?.includes('pos') && (
              <a href={`/pos/${tenant.id}`} target="_blank" rel="noopener noreferrer"
                className="h-9 inline-flex items-center justify-center px-3 py-2 rounded-lg font-medium text-xs transition-colors bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap">
                🖥️ POS
              </a>
            )}
            {(!tenant.ecommerceModes || tenant.ecommerceModes.length === 0) && (
              <span className="text-xs text-zinc-400 py-2">
                🛒 E-commerce (inactivo)
              </span>
            )}
          </div>


          {/* Grupo de admin */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 mt-1">
            <Link
              href={`/admin/clientes/${tenant.client_id}`}
              className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-950/30 hover:bg-blue-200 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-900 shadow-sm"
            >
              {Icon.edit} Editar
            </Link>
            {tenant.ecommerceModes?.includes('pos') && (
              <Link
                href={`/admin/pos-ordenes?clientId=${tenant.id}`}
                className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-orange-100 dark:bg-orange-950/30 hover:bg-orange-200 dark:hover:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-900 shadow-sm"
              >
                📊 Órdenes POS
              </Link>
            )}
            {user?.role === "superadmin" && (
              <button
                onClick={() => onDelete(tenant.client_id, tenant.nombre)}
                className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-700 dark:text-red-400 shadow-sm"
              >
                {Icon.delete} Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─── Página principal ───────────────────────────────────────── */
export default function AdminPanel() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [escalationCounts, setEscalationCounts] = useState({});
  const [pendingOrdersCounts, setPendingOrdersCounts] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: "", message: "", confirmText: "Eliminar", onConfirm: null, type: "danger",
  });

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/admin/me");
        const data = await res.json();
        if (res.ok) setUser(data);
      } catch (err) {
        console.error("Error cargando usuario:", err);
      }
    }

    async function loadEscalationsForTenant(clientId) {
      try {
        const res = await fetch(`/api/admin/escalations?clientId=${clientId}&status=pending`);
        if (res.ok) {
          const data = await res.json();
          setEscalationCounts((prev) => ({ ...prev, [clientId]: data.escalations?.length || 0 }));
        }
      } catch (err) {
        console.error(`Error cargando escalaciones para ${clientId}:`, err);
      }
    }

    async function loadPendingOrdersForTenant(clientId) {
      try {
        const res = await fetch(`/api/admin/orders?clientId=${clientId}&status=pendiente`);
        if (res.ok) {
          const data = await res.json();
          setPendingOrdersCounts((prev) => ({ ...prev, [clientId]: data.orders?.length || 0 }));
        }
      } catch (err) {
        console.error(`Error cargando órdenes para ${clientId}:`, err);
      }
    }

    async function loadTenants() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/tenants");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar clientes");

        const loadedTenants = data.tenants || [];
        setTenants(loadedTenants);
        console.log('[admin] tenant bava ecommerceModes:', loadedTenants.find(t => t.id === 'bava')?.ecommerceModes);
        console.log('[admin] tenant bava raw:', loadedTenants.find(t => t.id === 'bava'));
        await Promise.all(
          loadedTenants.map(tenant => Promise.all([
            loadEscalationsForTenant(tenant.client_id),
            loadPendingOrdersForTenant(tenant.client_id)
          ]))
        );
      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
    loadTenants();
  }, []);


  function handleDeleteClick(clientId, clientName) {
    setConfirmModal({
      isOpen: true,
      title: `Eliminar "${clientName}"`,
      message: "Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a este cliente.",
      confirmText: "Eliminar cliente",
      type: "danger",
      onConfirm: async () => {
        try {
          setError(null);
          const res = await fetch(`/api/admin/tenants/${clientId}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Error al eliminar cliente");
          await fetch("/api/admin/tenants"); // Trick to reload
          location.reload();
          setConfirmModal({ isOpen: false });
        } catch (err) {
          console.error("Error:", err);
          setError(err.message);
          setConfirmModal({ isOpen: false });
        }
      },
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-16">

      {/* ── Header de página ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
            Gestión de Clientes
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {user?.role === "superadmin"
              ? "Crea y personaliza los chatbots para tus clientes"
              : `Gestionando cliente: ${tenants[0]?.nombre || ""}`}
          </p>
          {user && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              {user.email} ·{" "}
              <span className="font-medium capitalize px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                {user.role}
              </span>
            </p>
          )}
        </div>

        {/* Acciones de superadmin */}
        {user?.role === "superadmin" && (
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/admin/usuarios",    icon: Icon.users,       label: "Usuarios",     color: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-transparent border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30" },
              { href: "/admin/auditoria",   icon: Icon.audit,       label: "Auditoría",    color: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-transparent border-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-950/30" },
              { href: "/admin/invitaciones",icon: Icon.invitations,  label: "Invitaciones", color: "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-transparent border-orange-300 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/30" },
              { href: "/admin/planes",      icon: Icon.plans,       label: "Planes",       color: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-transparent border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/30" },
            ].map(({ href, icon, label, color }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${color}`}
              >
                {icon} {label}
              </Link>
            ))}
            <Link
              href="/admin/clientes/nuevo"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-600/20"
            >
              {Icon.plus} Nuevo Cliente
            </Link>
          </div>
        )}
      </div>

      {/* ── Error ──────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3.5 rounded-xl text-sm">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Contenido principal ────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <TenantCardSkeleton key={i} />)}
        </div>
      ) : tenants.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Sin clientes aún</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs">
            Crea tu primer cliente para comenzar a gestionar chatbots, inventario y órdenes.
          </p>
          {user?.role === "superadmin" && (
            <Link
              href="/admin/clientes/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
            >
              {Icon.plus} Crear primer cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.client_id}
              tenant={tenant}
              user={user}
              escalationCounts={escalationCounts}
              pendingOrdersCounts={pendingOrdersCounts}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={() => { if (confirmModal.onConfirm) confirmModal.onConfirm(); }}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </main>
  );
}
