"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "./Toast";

const INITIAL_PRODUCT_FORM = {
  nombre: "",
  descripcion: "",
  imagen: "",
  precio: "",
  precioOriginal: "",
  category_id: "",
  stock: "0",
  stockMinimo: "0",
  stockMaximo: "",
  sku: "",
  esServicio: false,
  fechaExpiracion: "",
  destacado: false,
  activo: true,
};

export default function ProductForm({
  clientId,
  productId = null,
}) {
  const router = useRouter();
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [variantes, setVariantes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newVariante, setNewVariante] = useState({
    nombre: "",
    valor: "",
    precioAdicional: "",
    stock: "",
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load categories
        const catRes = await fetch(`/api/admin/inventory/categories?clientId=${clientId}`);
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        // If editing, load product
        if (productId) {
          const prodRes = await fetch(`/api/admin/inventory/products?clientId=${clientId}`);
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            const foundProduct = prodData.products?.find(p => p.id.toString() === productId.toString());
            if (foundProduct) {
              setProductForm({
                nombre: foundProduct.nombre || "",
                descripcion: foundProduct.descripcion || "",
                imagen: foundProduct.imagenes?.[0] || "",
                precio: foundProduct.precio?.toString() || "",
                precioOriginal: foundProduct.precio_original?.toString() || "",
                category_id: foundProduct.category_id || "",
                stock: foundProduct.stock?.toString() || "0",
                stockMinimo: foundProduct.stock_minimo?.toString() || "0",
                stockMaximo: foundProduct.stock_maximo?.toString() || "",
                sku: foundProduct.sku || "",
                esServicio: foundProduct.es_servicio || false,
                fechaExpiracion: foundProduct.fecha_expiracion || "",
                destacado: foundProduct.destacado || false,
                activo: foundProduct.activo !== false,
              });
              setVariantes(foundProduct.variantes || []);
              
              if (descriptionRef.current && foundProduct.descripcion) {
                descriptionRef.current.innerHTML = foundProduct.descripcion;
              }
            } else {
              setToast({ message: "✗ Producto no encontrado", type: "error" });
            }
          }
        }
      } catch (err) {
        console.error("Error cargando datos:", err);
        setToast({ message: "✗ Error de conexión", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    
    if (clientId) {
      loadData();
    }
  }, [clientId, productId]);

  const applyFormat = (command, value = null) => {
    const editor = document.getElementById('description-editor');
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    setProductForm(prev => ({
      ...prev,
      descripcion: editor.innerHTML
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!productForm.nombre || !productForm.precio) {
      setToast({ message: "✗ Nombre y precio son requeridos", type: "error" });
      return;
    }

    try {
      setSubmitting(true);
      let imageUrl = productForm.imagen;

      if (selectedImageFile) {
        setToast({ message: "⏳ Subiendo imagen...", type: "success" });
        const formData = new FormData();
        formData.append("file", selectedImageFile);
        formData.append("tenantId", clientId || "temp");
        formData.append("productId", productId || "new");

        const uploadRes = await fetch("/api/admin/inventory/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadError = await uploadRes.json();
          setToast({
            message: `✗ Error al subir imagen: ${uploadError.error}`,
            type: "error"
          });
          setSubmitting(false);
          return;
        }

        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const method = productId ? "PUT" : "POST";
      const url = productId
        ? `/api/admin/inventory/products/${productId}?clientId=${clientId}`
        : `/api/admin/inventory/products?clientId=${clientId}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          precio: parseFloat(productForm.precio) || 0,
          precio_original: productForm.precioOriginal ? parseFloat(productForm.precioOriginal) : null,
          stock: parseInt(productForm.stock) || 0,
          stock_minimo: parseInt(productForm.stockMinimo) || 0,
          stock_maximo: productForm.stockMaximo ? parseInt(productForm.stockMaximo) : null,
          es_servicio: productForm.esServicio,
          fecha_expiracion: productForm.fechaExpiracion || null,
          variantes: variantes,
          imagen: imageUrl,
          imagenes: imageUrl ? [imageUrl] : [],
        }),
      });

      if (res.ok) {
        setToast({ message: "✓ Producto guardado correctamente", type: "success" });
        setTimeout(() => {
          router.push(`/admin/inventario?clientId=${clientId}`);
        }, 1500);
      } else {
        const error = await res.json();
        setToast({ message: "✗ Error: " + error.error, type: "error" });
        setSubmitting(false);
      }
    } catch (err) {
      console.error("Error saving product:", err);
      setToast({ message: "✗ Error de conexión", type: "error" });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
        </div>
        <p className="text-sm text-zinc-500">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
          Nombre *
        </label>
        <input
          type="text"
          placeholder="Nombre del producto"
          value={productForm.nombre}
          onChange={(e) =>
            setProductForm({ ...productForm, nombre: e.target.value })
          }
          className="w-full px-4 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
          Descripción
        </label>
        <div className="border border-slate-300 dark:border-zinc-700 rounded-lg overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 flex-wrap">
            <button type="button" onClick={() => applyFormat('bold')} className="px-2 py-1 text-sm font-bold rounded hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300">B</button>
            <button type="button" onClick={() => applyFormat('italic')} className="px-2 py-1 text-sm italic rounded hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300">I</button>
            <button type="button" onClick={() => applyFormat('underline')} className="px-2 py-1 text-sm underline rounded hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300">U</button>
            <div className="border-l border-slate-300 dark:border-zinc-700 mx-1" />
            <button type="button" onClick={() => applyFormat('insertUnorderedList')} className="px-2 py-1 text-sm rounded hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300">• Lista</button>
            <button type="button" onClick={() => applyFormat('insertOrderedList')} className="px-2 py-1 text-sm rounded hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300">1. Lista</button>
            <div className="border-l border-slate-300 dark:border-zinc-700 mx-1" />
            <button type="button" onClick={() => applyFormat('formatBlock', 'h3')} className="px-2 py-1 text-sm font-semibold rounded hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300">H3</button>
            <button type="button" onClick={() => applyFormat('formatBlock', 'p')} className="px-2 py-1 text-sm rounded hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300">P</button>
            <div className="border-l border-slate-300 dark:border-zinc-700 mx-1" />
            <button type="button" onClick={() => applyFormat('removeFormat')} className="px-2 py-1 text-sm rounded hover:bg-slate-200 dark:hover:bg-zinc-700 active:bg-slate-300">✕</button>
          </div>
          <div
            id="description-editor"
            contentEditable="true"
            suppressContentEditableWarning={true}
            ref={descriptionRef}
            onInput={(e) =>
              setProductForm({
                ...productForm,
                descripcion: e.currentTarget.innerHTML,
              })
            }
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, text);
            }}
            className="min-h-[120px] p-4 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:font-bold [&_h3]:text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2 block">
            Imagen del producto
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100"
          />
        </label>
        {imagePreview && (
          <div className="relative inline-block mt-2">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border border-slate-300 dark:border-zinc-700"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedImageFile(null);
                setImagePreview(null);
              }}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700"
            >
              ✕
            </button>
          </div>
        )}
        {productForm.imagen && !imagePreview && (
          <div className="mt-2 text-sm text-slate-500">
            <img src={productForm.imagen} alt="Actual" className="w-20 h-20 object-cover rounded-md mb-1"/>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Precio *</label>
          <input
            type="number"
            placeholder="0.00"
            value={productForm.precio}
            onChange={(e) =>
              setProductForm({ ...productForm, precio: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Precio original</label>
          <input
            type="number"
            placeholder="0.00"
            value={productForm.precioOriginal}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                precioOriginal: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Categoría</label>
          <select
            value={productForm.category_id}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                category_id: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Ninguna</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Stock</label>
          <input
            type="number"
            placeholder="0"
            value={productForm.stock}
            onChange={(e) =>
              setProductForm({ ...productForm, stock: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Stock mínimo</label>
          <input
            type="number"
            placeholder="0"
            value={productForm.stockMinimo}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                stockMinimo: e.target.value,
              })
            }
            className="w-full px-4 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">SKU</label>
          <input
            type="text"
            placeholder="Código"
            value={productForm.sku}
            onChange={(e) =>
              setProductForm({ ...productForm, sku: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={productForm.esServicio}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                esServicio: e.target.checked,
              })
            }
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-zinc-300">Es Servicio</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={productForm.destacado}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                destacado: e.target.checked,
              })
            }
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-zinc-300">Destacado</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={productForm.activo}
            onChange={(e) =>
              setProductForm({
                ...productForm,
                activo: e.target.checked,
              })
            }
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 dark:text-zinc-300">Activo</span>
        </label>
      </div>

      <div className="border-t border-slate-200 dark:border-zinc-800 pt-6 mt-6">
        <h3 className="font-bold mb-4 text-lg text-slate-800 dark:text-white">Variantes</h3>
        
        {variantes.length > 0 && (
          <div className="space-y-3 mb-4">
            {variantes.map((v, i) => (
              <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-slate-100 dark:border-zinc-700/50">
                <input
                  type="text"
                  value={v.nombre}
                  readOnly
                  className="flex-1 px-3 py-1.5 bg-transparent border-none text-sm text-slate-900 dark:text-zinc-100 outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setVariantes(variantes.filter((_, idx) => idx !== i))
                  }
                  className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md hover:bg-red-200 transition-colors"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Nombre variante (ej: Talla M)"
            value={newVariante.nombre}
            onChange={(e) =>
              setNewVariante({ ...newVariante, nombre: e.target.value })
            }
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-zinc-700 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (newVariante.nombre) {
                setVariantes([
                  ...variantes,
                  { ...newVariante, id: Date.now() },
                ]);
                setNewVariante({
                  nombre: "",
                  valor: "",
                  precioAdicional: "",
                  stock: "",
                });
              }
            }}
            className="px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            Agregar Variante
          </button>
        </div>
      </div>

      <div className="flex gap-3 justify-end border-t border-slate-200 dark:border-zinc-800 pt-6 mt-8">
        <button
          type="button"
          onClick={() => router.push(`/admin/inventario?clientId=${clientId}`)}
          className="px-6 py-2.5 font-medium text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          disabled={submitting}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={submitting}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? "Guardando..." : "Guardar Producto"}
        </button>
      </div>
    </div>
  );
}
