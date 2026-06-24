import ProductForm from "../../../components/ProductForm";
import Link from "next/link";
import { use } from "react";

export default function NuevoProductoPage(props) {
  const searchParams = use(props.searchParams);
  const clientId = searchParams?.clientId;

  if (!clientId) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">⚠️ No se especificó un cliente.</p>
          <Link
            href="/admin"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            ← Volver a admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/inventario?clientId=${clientId}`}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Volver al inventario"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              Nuevo Producto
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Crea un nuevo producto para el cliente
            </p>
          </div>
        </div>

        <ProductForm clientId={clientId} />
      </div>
    </div>
  );
}
