"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";

const TABS = {
  PRODUCTS: "productos",
  CATEGORIES: "categorias",
  RULES: "reglas",
  CONFIG: "configuracion",
};

const RULE_TYPES = {
  CROSS_SELL: "cross_sell",
  VOLUME_PRICING: "volume_pricing",
  KIT_COMBO: "kit_combo",
  INTRO_PRICE: "intro_price",
  GIFT_PURCHASE: "gift_purchase",
  LIMITED_EDITION: "limited_edition",
};

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [activeTab, setActiveTab] = useState(TABS.PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  // Productos
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    nombre: "",
    descripcion: "",
    imagen: "",
    precio: "",
    precioOriginal: "",
    category_id: "",
    stock: "",
    stockMinimo: "",
    stockMaximo: "",
    sku: "",
    esServicio: false,
    fechaExpiracion: "",
    destacado: false,
    activo: true,
  });
  const [variantes, setVariantes] = useState([]);
  const [newVariante, setNewVariante] = useState({
    nombre: "",
    valor: "",
    precioAdicional: "",
    stock: "",
  });

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === TABS.PRODUCTS) {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/inventory/products?clientId=${clientId}`),
          fetch(`/api/admin/inventory/categories?clientId=${clientId}`),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products || []);
        }
        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ Error al cargar datos", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.nombre || !productForm.precio) {
      setToast({ message: "✗ Completa los campos requeridos", type: "error" });
      return;
    }

    try {
      const url = editingProduct
        ? `/api/admin/inventory/products/${editingProduct.id}?clientId=${clientId}`
        : `/api/admin/inventory/products?clientId=${clientId}`;

      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          precio: parseFloat(productForm.precio),
          precioOriginal: productForm.precioOriginal
            ? parseFloat(productForm.precioOriginal)
            : null,
          stock: parseInt(productForm.stock),
          variantes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      setToast({
        message: `✓ Producto ${editingProduct ? "actualizado" : "creado"}`,
        type: "success",
      });

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        nombre: "",
        descripcion: "",
        imagen: "",
        precio: "",
        precioOriginal: "",
        category_id: "",
        stock: "",
        stockMinimo: "",
        stockMaximo: "",
        sku: "",
        esServicio: false,
        fechaExpiracion: "",
        destacado: false,
        activo: true,
      });
      setVariantes([]);
      await loadData();
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: `✗ ${err.message}`, type: "error" });
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const res = await fetch(
        `/api/admin/inventory/products/${productId}?clientId=${clientId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Error al eliminar");

      setToast({ message: "✓ Producto eliminado", type: "success" });
      await loadData();
      setConfirmModal({ isOpen: false });
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ Error al eliminar producto", type: "error" });
    }
  };

  const addVariante = () => {
    if (!newVariante.nombre || !newVariante.valor) {
      setToast({
        message: "✗ La variante necesita nombre y valor",
        type: "error",
      });
      return;
    }

    setVariantes([
      ...variantes,
      {
        ...newVariante,
        precioAdicional: parseFloat(newVariante.precioAdicional || 0),
        stock: parseInt(newVariante.stock || 0),
      },
    ]);

    setNewVariante({
      nombre: "",
      valor: "",
      precioAdicional: "",
      stock: "",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400"
            >
              ← Volver
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              📦 Inventario
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 mb-6">
          {Object.entries(TABS).map(([key, tab]) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setShowProductModal(false);
              }}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {key === "PRODUCTS"
                ? "📦 Productos"
                : key === "CATEGORIES"
                ? "📂 Categorías"
                : key === "RULES"
                ? "🎯 Reglas"
                : "⚙️ Configuración"}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Cargando...</p>
          </div>
        ) : activeTab === TABS.PRODUCTS ? (
          <ProductsTab
            products={products}
            categories={categories}
            clientId={clientId}
            onEdit={(product) => {
              setEditingProduct(product);
              setProductForm({
                nombre: product.nombre,
                descripcion: product.descripcion,
                imagen: product.imagen,
                precio: product.precio.toString(),
                precioOriginal: product.precio_original
                  ? product.precio_original.toString()
                  : "",
                category_id: product.category_id,
                stock: product.stock.toString(),
                stockMinimo: product.stock_minimo?.toString() || "",
                stockMaximo: product.stock_maximo?.toString() || "",
                sku: product.sku,
                esServicio: product.es_servicio || false,
                fechaExpiracion: product.fecha_expiracion || "",
                destacado: product.featured || false,
                activo: product.activo !== false,
              });
              setVariantes(product.variantes || []);
              setShowProductModal(true);
            }}
            onDelete={(product) => {
              setConfirmModal({
                isOpen: true,
                title: "Eliminar producto",
                message: `¿Eliminar "${product.nombre}"? Esta acción no se puede deshacer.`,
                onConfirm: () => handleDeleteProduct(product.id),
                type: "danger",
              });
            }}
          />
        ) : activeTab === TABS.CATEGORIES ? (
          <CategoriesTab clientId={clientId} categories={categories} />
        ) : activeTab === TABS.RULES ? (
          <RulesTab clientId={clientId} products={products} />
        ) : (
          <ConfigTab clientId={clientId} />
        )}

        {/* Modal Producto */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full p-6 my-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                {editingProduct ? "Editar" : "Nuevo"} Producto
              </h2>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <input
                  type="text"
                  placeholder="Nombre del producto"
                  value={productForm.nombre}
                  onChange={(e) =>
                    setProductForm({ ...productForm, nombre: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />

                <textarea
                  placeholder="Descripción"
                  value={productForm.descripcion}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      descripcion: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />

                <input
                  type="text"
                  placeholder="URL de imagen"
                  value={productForm.imagen}
                  onChange={(e) =>
                    setProductForm({ ...productForm, imagen: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />

                <select
                  value={productForm.category_id}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.nombre}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Precio"
                    step="0.01"
                    value={productForm.precio}
                    onChange={(e) =>
                      setProductForm({ ...productForm, precio: e.target.value })
                    }
                    className="px-4 py-2 border border-slate-300 rounded-lg"
                  />

                  <input
                    type="number"
                    placeholder="Precio original (descuento)"
                    step="0.01"
                    value={productForm.precioOriginal}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        precioOriginal: e.target.value,
                      })
                    }
                    className="px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <input
                  type="number"
                  placeholder="Stock"
                  value={productForm.stock}
                  onChange={(e) =>
                    setProductForm({ ...productForm, stock: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={productForm.destacado}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        destacado: e.target.checked,
                      })
                    }
                  />
                  <span className="text-slate-700">Destacado</span>
                </label>

                {/* Variantes */}
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-bold mb-2">Variantes</h3>
                  {variantes.map((v, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 text-sm">
                      <span className="flex-1 bg-slate-100 p-2 rounded">
                        {v.nombre}: {v.valor}
                      </span>
                      <button
                        onClick={() =>
                          setVariantes(variantes.filter((_, i) => i !== idx))
                        }
                        className="px-3 py-2 bg-red-100 text-red-700 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Nombre variante (Talla)"
                      value={newVariante.nombre}
                      onChange={(e) =>
                        setNewVariante({
                          ...newVariante,
                          nombre: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Valor (M)"
                      value={newVariante.valor}
                      onChange={(e) =>
                        setNewVariante({
                          ...newVariante,
                          valor: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={addVariante}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                    setProductForm({
                      nombre: "",
                      descripcion: "",
                      imagen: "",
                      precio: "",
                      precioOriginal: "",
                      category_id: "",
                      stock: "",
                      stockMinimo: "",
                      stockMaximo: "",
                      sku: "",
                      esServicio: false,
                      fechaExpiracion: "",
                      destacado: false,
                      activo: true,
                    });
                    setVariantes([]);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ isOpen: false })}
          type={confirmModal.type}
        />

        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      </div>
    </div>
  );
}

// Tab Components
function ProductsTab({ products, categories, clientId, onEdit, onDelete }) {
  const [showNewButton, setShowNewButton] = useState(false);

  return (
    <div>
      <button
        onClick={() => {
          // Reset form and open modal
          setShowNewButton(true);
        }}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        + Nuevo Producto
      </button>

      <div className="grid gap-4">
        {products.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No hay productos creados
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-slate-200 rounded-lg p-4 flex gap-4 items-start"
            >
              {product.imagen && (
                <img
                  src={product.imagen}
                  alt={product.nombre}
                  className="w-24 h-24 object-cover rounded"
                />
              )}

              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{product.nombre}</h3>
                <p className="text-sm text-slate-600">{product.descripcion}</p>
                <div className="mt-2 flex gap-4 text-sm">
                  <span>${product.precio.toFixed(2)}</span>
                  <span>Stock: {product.stock}</span>
                  {product.featured && (
                    <span className="bg-blue-100 text-blue-700 px-2 rounded">
                      Destacado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(product)}
                  className="px-3 py-2 bg-amber-500 text-white rounded text-sm"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(product)}
                  className="px-3 py-2 bg-red-600 text-white rounded text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CategoriesTab({ clientId, categories }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <p className="text-slate-600 text-center py-8">
        Gestión de categorías (Próximamente)
      </p>
    </div>
  );
}

function RulesTab({ clientId, products }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <p className="text-slate-600 text-center py-8">
        Gestión de reglas de negocio (Próximamente)
      </p>
    </div>
  );
}

function ConfigTab({ clientId }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <p className="text-slate-600 text-center py-8">
        Configuración de tienda (Próximamente)
      </p>
    </div>
  );
}
