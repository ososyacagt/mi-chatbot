"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import Papa from "papaparse";

const TABS = {
  PRODUCTS: "productos",
  CATEGORIES: "categorias",
  RULES: "reglas",
  CONFIG: "configuracion",
};

const RULE_TYPES = {
  CROSS_SELL: { id: "cross_sell", label: "Cross-Sell" },
  VOLUME_PRICING: { id: "volume_pricing", label: "Precio por volumen" },
  KIT_COMBO: { id: "kit_combo", label: "Kit/Combo" },
  INTRO_PRICE: { id: "intro_price", label: "Precio introductorio" },
  GIFT_PURCHASE: { id: "gift_purchase", label: "Compra con regalo" },
  LIMITED_EDITION: { id: "limited_edition", label: "Edición limitada" },
};

const INITIAL_PRODUCT_FORM = {
  nombre: "",
  descripcion: "",
  imagen: "",
  precio: "",
  precioOriginal: "",
  category_id: "",
  stock: "",
  stockMinimo: "0",
  stockMaximo: "",
  sku: "",
  esServicio: false,
  fechaExpiracion: "",
  destacado: false,
  activo: true,
};

function mapProductToForm(product) {
  if (!product) return { ...INITIAL_PRODUCT_FORM };
  return {
    id: product.id,
    nombre: product.nombre || "",
    descripcion: product.descripcion || "",
    imagen: product.imagenes?.[0] || "",
    precio: product.precio?.toString() || "",
    precioOriginal: product.precio_original?.toString() || "",
    category_id: product.category_id || "",
    stock: product.stock?.toString() || "0",
    stockMinimo: product.stock_minimo?.toString() || "0",
    stockMaximo: product.stock_maximo?.toString() || "",
    sku: product.sku || "",
    esServicio: product.es_servicio || false,
    fechaExpiracion: product.fecha_expiracion || "",
    destacado: product.destacado || false,
    activo: product.activo !== false,
  };
}

function InventoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("clientId");

  console.log("[inventario] clientId from searchParams:", clientId);

  const [activeTab, setActiveTab] = useState(TABS.PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [clientName, setClientName] = useState("");

  // Productos
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [variantes, setVariantes] = useState([]);
  const [newVariante, setNewVariante] = useState({
    nombre: "",
    valor: "",
    precioAdicional: "",
    stock: "",
  });
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const descriptionRef = useRef(null);

  // Carga masiva
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStep, setBulkStep] = useState(1);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Categorías
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    nombre: "",
    descripcion: "",
    emoji: "",
    orden: "0",
    activo: true,
  });

  // Reglas
  const [rules, setRules] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({
    tipo: "cross_sell",
    nombre: "",
    fecha_inicio: "",
    fecha_fin: "",
    activo: true,
    condiciones: {},
    acciones: {},
  });

  // Configuración
  const [config, setConfig] = useState(null);
  const [configForm, setConfigForm] = useState({
    ecommerce_mode: "none",
    whatsapp_number: "",
    currency: "USD",
    store_name: "",
    store_logo: "",
    store_banner: "",
    topbar_message: "",
    min_order_amount: "",
    payment_methods: [],
  });

  if (!clientId) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-slate-600 mb-4">⚠️ No se especificó un cliente</p>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          ← Volver a admin
        </button>
      </div>
    );
  }

  const loadClientName = async () => {
    try {
      const res = await fetch(`/api/tenants/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClientName(data.store_name || data.nombre || clientId);
      }
    } catch (err) {
      console.error("[inventario] Error loading client name:", err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/admin/inventory/products?clientId=${clientId}`),
        fetch(`/api/admin/inventory/categories?clientId=${clientId}`),
      ]);

      console.log("[inventario] clientId:", clientId);
      console.log("[inventario] Products response:", pRes.status);
      console.log("[inventario] Categories response:", cRes.status);

      if (pRes.ok) {
        const data = await pRes.json();
        console.log("[inventario] fetchProducts result:", data);
        setProducts(data.products || []);
        setFilteredProducts(data.products || []);
      }
      if (cRes.ok) {
        const data = await cRes.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("[inventario] Error loading products:", err);
      setToast({ message: "✗ Error al cargar productos", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/inventory/categories?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("[inventario] Error loading categories:", err);
      setToast({ message: "✗ Error al cargar categorías", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/inventory/rules?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error("[inventario] Error loading rules:", err);
      setToast({ message: "✗ Error al cargar reglas", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Mapea nombres de BD a nombres del modal para EDITAR
  const mapRuleFromDB = (rule) => {
    const mapped = {
      id: rule.id,
      tipo: rule.tipo,
      nombre: rule.nombre,
      activo: rule.activo,
      fecha_inicio: rule.fecha_inicio || "",
      fecha_fin: rule.fecha_fin || "",
      condiciones: { ...rule.condiciones },
      acciones: { ...rule.acciones },
    };

    if (rule.tipo === "gift_purchase") {
      mapped.condiciones.monto_minimo = rule.condiciones?.min_subtotal || "";
      mapped.acciones.producto_regalo_id = rule.acciones?.gift_product_id || "";
    } else if (rule.tipo === "cross_sell") {
      mapped.condiciones.producto_disparador = rule.condiciones?.trigger_product_id || "";
      mapped.condiciones.producto_recomendado = rule.condiciones?.discount_product_id || "";
      mapped.condiciones.descuento_porcentaje = rule.condiciones?.discount_percent || "";
    } else if (rule.tipo === "volume_pricing") {
      mapped.condiciones.producto_id = rule.condiciones?.product_id || "";
      mapped.condiciones.tiers = rule.condiciones?.tiers || [];
    } else if (rule.tipo === "kit_combo") {
      mapped.condiciones.product_ids = rule.condiciones?.product_ids || [];
      mapped.acciones.descuento_porcentaje = rule.acciones?.discount_percent || "";
      mapped.acciones.precio_fijo = rule.acciones?.fixed_price || "";
    } else if (rule.tipo === "intro_price") {
      mapped.condiciones.producto_id = rule.condiciones?.product_id || "";
      mapped.condiciones.expires_at = rule.condiciones?.expires_at || "";
      mapped.acciones.precio_especial = rule.acciones?.special_price || "";
    } else if (rule.tipo === "limited_edition") {
      mapped.condiciones.producto_id = rule.condiciones?.product_id || "";
      mapped.condiciones.max_stock = rule.condiciones?.max_stock || "";
      mapped.condiciones.expires_at = rule.condiciones?.expires_at || "";
    }

    return mapped;
  };

  // Mapea nombres del modal a nombres de BD para GUARDAR
  const mapRuleToDB = (form) => {
    const mapped = {
      tipo: form.tipo,
      nombre: form.nombre,
      activo: form.activo,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      condiciones: {},
      acciones: {},
    };

    if (form.tipo === "gift_purchase") {
      mapped.condiciones.min_subtotal = form.condiciones?.monto_minimo || "";
      mapped.acciones.gift_product_id = form.acciones?.producto_regalo_id || "";
    } else if (form.tipo === "cross_sell") {
      mapped.condiciones.trigger_product_id = form.condiciones?.producto_disparador || "";
      mapped.condiciones.discount_product_id = form.condiciones?.producto_recomendado || "";
      mapped.condiciones.discount_percent = form.condiciones?.descuento_porcentaje || "";
    } else if (form.tipo === "volume_pricing") {
      mapped.condiciones.product_id = form.condiciones?.product_id || "";
      mapped.condiciones.tiers = form.condiciones?.tiers || [];
    } else if (form.tipo === "kit_combo") {
      mapped.condiciones.product_ids = form.condiciones?.product_ids || [];
      mapped.acciones.discount_percent = form.acciones?.descuento_porcentaje || "";
      mapped.acciones.fixed_price = form.acciones?.precio_fijo || "";
    } else if (form.tipo === "intro_price") {
      mapped.condiciones.product_id = form.condiciones?.product_id || "";
      mapped.condiciones.expires_at = form.condiciones?.expires_at || "";
      mapped.acciones.special_price = form.acciones?.precio_especial || "";
    } else if (form.tipo === "limited_edition") {
      mapped.condiciones.product_id = form.condiciones?.product_id || "";
      mapped.condiciones.max_stock = form.condiciones?.max_stock || "";
      mapped.condiciones.expires_at = form.condiciones?.expires_at || "";
    } else {
      mapped.condiciones = form.condiciones;
      mapped.acciones = form.acciones;
    }

    return mapped;
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/inventory/config?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setConfigForm({
          ecommerce_mode: data.config.ecommerce_mode || "none",
          whatsapp_number: data.config.whatsapp_number || "",
          currency: data.config.currency || "USD",
          store_name: data.config.store_name || "",
          store_logo: data.config.store_logo || "",
          store_banner: data.config.store_banner || "",
          topbar_message: data.config.topbar_message || "",
          min_order_amount: data.config.min_order_amount || "",
          payment_methods: data.config.payment_methods || [],
        });
      }
    } catch (err) {
      console.error("[inventario] Error loading config:", err);
      setToast({ message: "✗ Error al cargar configuración", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) {
      console.log("[inventario] Esperando clientId...");
      return;
    }

    console.log("[inventario] clientId está disponible, cargando tab:", activeTab);

    // Cargar nombre del cliente
    loadClientName();

    if (activeTab === TABS.PRODUCTS) {
      console.log("[inventario] → Cargando productos");
      loadProducts();
    }
    if (activeTab === TABS.CATEGORIES) {
      console.log("[inventario] → Cargando categorías");
      loadCategories();
    }
    if (activeTab === TABS.RULES) {
      console.log("[inventario] → Cargando reglas");
      loadRules();
    }
    if (activeTab === TABS.CONFIG) {
      console.log("[inventario] → Cargando configuración");
      loadConfig();
    }
  }, [activeTab, clientId]);

  useEffect(() => {
    let filtered = products;
    if (searchProduct) {
      filtered = filtered.filter((p) =>
        p.nombre.toLowerCase().includes(searchProduct.toLowerCase())
      );
    }
    if (filterCategory) {
      filtered = filtered.filter((p) => p.category_id === filterCategory);
    }
    setFilteredProducts(filtered);
  }, [searchProduct, filterCategory, products]);

  useEffect(() => {
    if (descriptionRef.current && productForm.descripcion) {
      descriptionRef.current.innerHTML = productForm.descripcion;
    }
  }, [showProductModal]);

  const handleSaveProduct = async () => {
    if (!productForm.nombre || !productForm.precio) {
      setToast({ message: "✗ Nombre y precio son requeridos", type: "error" });
      return;
    }

    try {
      let imageUrl = productForm.imagen;

      // Si hay un archivo de imagen seleccionado, subirlo primero
      if (selectedImageFile) {
        setToast({ message: "⏳ Subiendo imagen...", type: "success" });

        const formData = new FormData();
        formData.append("file", selectedImageFile);
        formData.append("tenantId", config?.id || "temp");
        formData.append("productId", editingProduct?.id || "new");

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
          return;
        }

        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
        console.log("[handleSaveProduct] Imagen subida:", imageUrl);
      }

      const method = editingProduct ? "PUT" : "POST";
      const url = editingProduct
        ? `/api/admin/inventory/products/${editingProduct.id}?clientId=${clientId}`
        : `/api/admin/inventory/products?clientId=${clientId}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...productForm,
          imagen: imageUrl,
          variantes,
        }),
      });

      if (res.ok) {
        setToast({
          message: `✓ Producto ${editingProduct ? "actualizado" : "creado"}`,
          type: "success",
        });
        setShowProductModal(false);
        setProductForm(INITIAL_PRODUCT_FORM);
        setVariantes([]);
        setSelectedImageFile(null);
        setImagePreview(null);
        setEditingProduct(null);
        await loadProducts();
      } else {
        setToast({ message: "✗ Error al guardar producto", type: "error" });
      }
    } catch (err) {
      console.error("Error saving product:", err);
      setToast({ message: "✗ Error al guardar producto", type: "error" });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProduct = (productId) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar producto",
      message: "¿Estás seguro de que deseas eliminar este producto?",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/admin/inventory/products/${productId}?clientId=${clientId}`,
            { method: "DELETE" }
          );

          if (res.ok) {
            setToast({ message: "✓ Producto eliminado", type: "success" });
            await loadProducts();
          }
        } catch (err) {
          setToast({ message: "✗ Error al eliminar", type: "error" });
        }
        setConfirmModal({ isOpen: false });
      },
    });
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.nombre) {
      setToast({ message: "✗ El nombre es requerido", type: "error" });
      return;
    }

    try {
      const method = editingCategory ? "PUT" : "POST";
      const url = editingCategory
        ? `/api/admin/inventory/categories/${editingCategory.id}?clientId=${clientId}`
        : `/api/admin/inventory/categories?clientId=${clientId}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        setToast({
          message: `✓ Categoría ${editingCategory ? "actualizada" : "creada"}`,
          type: "success",
        });
        setShowCategoryModal(false);
        setCategoryForm({
          nombre: "",
          descripcion: "",
          emoji: "",
          orden: "0",
          activo: true,
        });
        await loadCategories();
      } else {
        setToast({ message: "✗ Error al guardar categoría", type: "error" });
      }
    } catch (err) {
      console.error("Error saving category:", err);
      setToast({ message: "✗ Error al guardar categoría", type: "error" });
    }
  };

  const handleDeleteCategory = (categoryId) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar categoría",
      message: "¿Estás seguro de que deseas eliminar esta categoría?",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/admin/inventory/categories/${categoryId}?clientId=${clientId}`,
            { method: "DELETE" }
          );

          if (res.ok) {
            setToast({ message: "✓ Categoría eliminada", type: "success" });
            await loadCategories();
          }
        } catch (err) {
          setToast({ message: "✗ Error al eliminar", type: "error" });
        }
        setConfirmModal({ isOpen: false });
      },
    });
  };

  const handleSaveRule = async () => {
    if (!ruleForm.nombre) {
      setToast({ message: "✗ El nombre es requerido", type: "error" });
      return;
    }

    try {
      const method = editingRule ? "PUT" : "POST";
      const url = editingRule
        ? `/api/admin/inventory/rules/${editingRule.id}?clientId=${clientId}`
        : `/api/admin/inventory/rules?clientId=${clientId}`;

      // Mapear nombres del modal a nombres de BD
      const dataToSave = mapRuleToDB(ruleForm);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });

      if (res.ok) {
        setToast({
          message: `✓ Regla ${editingRule ? "actualizada" : "creada"}`,
          type: "success",
        });
        setShowRuleModal(false);
        setRuleForm({
          tipo: "cross_sell",
          nombre: "",
          fecha_inicio: "",
          fecha_fin: "",
          activo: true,
          condiciones: {},
          acciones: {},
        });
        await loadRules();
      } else {
        setToast({ message: "✗ Error al guardar regla", type: "error" });
      }
    } catch (err) {
      console.error("Error saving rule:", err);
      setToast({ message: "✗ Error al guardar regla", type: "error" });
    }
  };

  const handleDeleteRule = (ruleId) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar regla",
      message: "¿Estás seguro de que deseas eliminar esta regla?",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/admin/inventory/rules/${ruleId}?clientId=${clientId}`,
            { method: "DELETE" }
          );

          if (res.ok) {
            setToast({ message: "✓ Regla eliminada", type: "success" });
            await loadRules();
          }
        } catch (err) {
          setToast({ message: "✗ Error al eliminar", type: "error" });
        }
        setConfirmModal({ isOpen: false });
      },
    });
  };

  const handleSaveConfig = async () => {
    try {
      const res = await fetch(
        `/api/admin/inventory/config?clientId=${clientId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(configForm),
        }
      );

      if (res.ok) {
        setToast({ message: "✓ Configuración guardada", type: "success" });
        await loadConfig();
      } else {
        setToast({
          message: "✗ Error al guardar configuración",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Error saving config:", err);
      setToast({ message: "✗ Error al guardar configuración", type: "error" });
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      "nombre",
      "descripcion",
      "precio",
      "precio_original",
      "moneda",
      "stock",
      "sku",
      "categoria",
      "destacado",
      "es_servicio",
    ];
    const csv = [headers.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "productos_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        console.log("CSV parsed:", results.data);
        setBulkPreview(results.data.filter((row) => row.nombre));
        setBulkStep(3);
      },
      error: (error) => {
        setToast({
          message: `✗ Error al leer CSV: ${error.message}`,
          type: "error",
        });
      },
    });
  };

  const handleBulkImport = async () => {
    try {
      setBulkLoading(true);
      const res = await fetch(
        `/api/admin/inventory/products/bulk?clientId=${clientId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productos: bulkPreview }),
        }
      );

      if (res.ok) {
        const result = await res.json();
        setToast({
          message: `✓ ${result.imported} productos importados${result.errors.length > 0 ? `, ${result.errors.length} errores` : ""}`,
          type: result.errors.length === 0 ? "success" : "warning",
        });
        setShowBulkModal(false);
        setBulkStep(1);
        setBulkPreview([]);
        await loadProducts();
      } else {
        setToast({ message: "✗ Error en la importación", type: "error" });
      }
    } catch (err) {
      console.error("Error importing:", err);
      setToast({ message: "✗ Error en la importación", type: "error" });
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Toast message={toast.message} type={toast.type} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1">
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-bold">
          📦 Inventario — {clientName || clientId}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white border border-slate-200 rounded-lg p-4">
        {Object.entries(TABS).map(([key, value]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {key === "PRODUCTS"
              ? "📦 Productos"
              : key === "CATEGORIES"
                ? "📂 Categorías"
                : key === "RULES"
                  ? "⚙️ Reglas"
                  : "⚙️ Configuración"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      )}

      {!loading && activeTab === TABS.PRODUCTS && (
        <ProductsTab
          clientId={clientId}
          products={filteredProducts}
          categories={categories}
          searchProduct={searchProduct}
          setSearchProduct={setSearchProduct}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          showProductModal={showProductModal}
          setShowProductModal={setShowProductModal}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          productForm={productForm}
          setProductForm={setProductForm}
          variantes={variantes}
          setVariantes={setVariantes}
          newVariante={newVariante}
          setNewVariante={setNewVariante}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          selectedImageFile={selectedImageFile}
          setSelectedImageFile={setSelectedImageFile}
          handleImageChange={handleImageChange}
          handleSaveProduct={handleSaveProduct}
          handleDeleteProduct={handleDeleteProduct}
          showBulkModal={showBulkModal}
          setShowBulkModal={setShowBulkModal}
          bulkStep={bulkStep}
          setBulkStep={setBulkStep}
          bulkPreview={bulkPreview}
          bulkLoading={bulkLoading}
          downloadCSVTemplate={downloadCSVTemplate}
          handleCSVUpload={handleCSVUpload}
          handleBulkImport={handleBulkImport}
          descriptionRef={descriptionRef}
        />
      )}

      {!loading && activeTab === TABS.CATEGORIES && (
        <CategoriesTab
          categories={categories}
          showCategoryModal={showCategoryModal}
          setShowCategoryModal={setShowCategoryModal}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          categoryForm={categoryForm}
          setCategoryForm={setCategoryForm}
          handleSaveCategory={handleSaveCategory}
          handleDeleteCategory={handleDeleteCategory}
        />
      )}

      {!loading && activeTab === TABS.RULES && (
        <RulesTab
          products={products}
          rules={rules}
          showRuleModal={showRuleModal}
          setShowRuleModal={setShowRuleModal}
          editingRule={editingRule}
          setEditingRule={setEditingRule}
          ruleForm={ruleForm}
          setRuleForm={setRuleForm}
          handleSaveRule={handleSaveRule}
          handleDeleteRule={handleDeleteRule}
        />
      )}

      {!loading && activeTab === TABS.CONFIG && (
        <ConfigTab
          configForm={configForm}
          setConfigForm={setConfigForm}
          handleSaveConfig={handleSaveConfig}
        />
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando inventario...</p>
        </div>
      }
    >
      <InventoryPageContent />
    </Suspense>
  );
}

function ProductsTab({
  clientId,
  products,
  categories,
  searchProduct,
  setSearchProduct,
  filterCategory,
  setFilterCategory,
  showProductModal,
  setShowProductModal,
  editingProduct,
  setEditingProduct,
  productForm,
  setProductForm,
  variantes,
  setVariantes,
  newVariante,
  setNewVariante,
  imagePreview,
  setImagePreview,
  selectedImageFile,
  setSelectedImageFile,
  handleImageChange,
  handleSaveProduct,
  handleDeleteProduct,
  showBulkModal,
  setShowBulkModal,
  bulkStep,
  setBulkStep,
  bulkPreview,
  bulkLoading,
  downloadCSVTemplate,
  handleCSVUpload,
  handleBulkImport,
  descriptionRef,
}) {
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

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setEditingProduct(null);
            setProductForm(INITIAL_PRODUCT_FORM);
            setVariantes([]);
            setImagePreview(null);
            setSelectedImageFile(null);
            setShowProductModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          ➕ Nuevo producto
        </button>
        <button
          onClick={() => {
            setBulkStep(1);
            setShowBulkModal(true);
          }}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
        >
          📥 Carga masiva
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Imagen</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Categoría</th>
                <th className="px-4 py-2 text-left">Precio</th>
                <th className="px-4 py-2 text-left">Stock</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const cat = categories.find((c) => c.id === product.category_id);
                return (
                  <tr key={product.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-2">
                      {(product.imagenes?.[0] || product.imagen) ? (
                        <img
                          src={product.imagenes?.[0] || product.imagen}
                          alt={product.nombre}
                          className="w-8 h-8 object-cover rounded"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                        />
                      ) : null}
                      <div className="w-8 h-8 bg-slate-200 rounded" style={{ display: (product.imagenes?.[0] || product.imagen) ? 'none' : 'block' }} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{product.nombre}</div>
                      <div className="flex gap-1 mt-1">
                        {product.es_servicio && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Servicio
                          </span>
                        )}
                        {product.featured && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            ⭐ Destacado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {cat ? `${cat.emoji} ${cat.nombre}` : "-"}
                    </td>
                    <td className="px-4 py-2">
                      ${product.precio.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          product.stock <=
                          (product.stock_minimo || 0)
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-2 flex gap-1">
                      <button
                        onClick={() => {
                          setProductForm(mapProductToForm(product));
                          setVariantes(product.variantes || []);
                          setEditingProduct(product);
                          setShowProductModal(true);
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No hay productos
            </div>
          )}
        </div>
      </div>

      {/* Modal Producto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold">
                {editingProduct ? "Editar" : "Nuevo"} Producto
              </h2>

              <input
                type="text"
                placeholder="Nombre"
                value={productForm.nombre}
                onChange={(e) =>
                  setProductForm({ ...productForm, nombre: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />

              {/* Editor de texto rico mejorado */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                {/* Toolbar */}
                <div className="flex gap-1 p-2 border-b border-slate-300 bg-slate-50 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyFormat('bold')}
                    className="px-2 py-1 text-sm font-bold rounded hover:bg-slate-200 active:bg-slate-300"
                    title="Negrita (Cmd+B)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('italic')}
                    className="px-2 py-1 text-sm italic rounded hover:bg-slate-200 active:bg-slate-300"
                    title="Cursiva (Cmd+I)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('underline')}
                    className="px-2 py-1 text-sm underline rounded hover:bg-slate-200 active:bg-slate-300"
                    title="Subrayado (Cmd+U)"
                  >
                    U
                  </button>
                  <div className="border-l border-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormat('insertUnorderedList')}
                    className="px-2 py-1 text-sm rounded hover:bg-slate-200 active:bg-slate-300"
                    title="Lista con viñetas"
                  >
                    • Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('insertOrderedList')}
                    className="px-2 py-1 text-sm rounded hover:bg-slate-200 active:bg-slate-300"
                    title="Lista numerada"
                  >
                    1. Lista
                  </button>
                  <div className="border-l border-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormat('formatBlock', 'h3')}
                    className="px-2 py-1 text-sm font-semibold rounded hover:bg-slate-200 active:bg-slate-300"
                    title="Título H3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('formatBlock', 'p')}
                    className="px-2 py-1 text-sm rounded hover:bg-slate-200 active:bg-slate-300"
                    title="Párrafo"
                  >
                    P
                  </button>
                  <div className="border-l border-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormat('removeFormat')}
                    className="px-2 py-1 text-sm rounded hover:bg-slate-200 active:bg-slate-300"
                    title="Limpiar formato"
                  >
                    ✕
                  </button>
                </div>
                {/* Editor */}
                <div
                  id="description-editor"
                  contentEditable="true"
                  suppressContentEditableWarning={true}
                  ref={descriptionRef}
                  tabIndex={0}
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
                  className="min-h-32 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:font-bold [&_h3]:text-base"
                />
              </div>

              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 mb-2 block">
                    Imagen del producto
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </label>
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-slate-300"
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
                  <div className="text-sm text-slate-500">
                    Imagen actual: {productForm.imagen}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Precio"
                  value={productForm.precio}
                  onChange={(e) =>
                    setProductForm({ ...productForm, precio: e.target.value })
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Precio original"
                  value={productForm.precioOriginal}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      precioOriginal: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <select
                  value={productForm.category_id}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      category_id: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Stock"
                  value={productForm.stock}
                  onChange={(e) =>
                    setProductForm({ ...productForm, stock: e.target.value })
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Stock mínimo"
                  value={productForm.stockMinimo}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      stockMinimo: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="SKU"
                  value={productForm.sku}
                  onChange={(e) =>
                    setProductForm({ ...productForm, sku: e.target.value })
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={productForm.esServicio}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        esServicio: e.target.checked,
                      })
                    }
                  />
                  Servicio
                </label>
                <label className="flex items-center gap-2">
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
                  Destacado
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={productForm.activo}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        activo: e.target.checked,
                      })
                    }
                  />
                  Activo
                </label>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-2">Variantes</h3>
                {variantes.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={v.nombre}
                      readOnly
                      className="flex-1 px-2 py-1 bg-slate-100 rounded text-sm"
                    />
                    <button
                      onClick={() =>
                        setVariantes(variantes.filter((_, idx) => idx !== i))
                      }
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Nombre variante"
                    value={newVariante.nombre}
                    onChange={(e) =>
                      setNewVariante({ ...newVariante, nombre: e.target.value })
                    }
                    className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                  />
                  <button
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
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setImagePreview(null);
                    setSelectedImageFile(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Carga masiva de productos</h2>

              {bulkStep === 1 && (
                <>
                  <p className="text-slate-600">
                    Descarga la plantilla CSV y complétala con tus productos
                  </p>
                  <button
                    onClick={downloadCSVTemplate}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    📥 Descargar template
                  </button>
                  <div className="border-t pt-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 mb-2 block">
                        Cargar archivo CSV
                      </span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </label>
                  </div>
                </>
              )}

              {bulkStep === 3 && (
                <>
                  <p className="text-slate-600 font-medium">
                    Preview: {bulkPreview.length} productos a importar
                  </p>
                  <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left">Nombre</th>
                          <th className="px-2 py-1 text-left">Precio</th>
                          <th className="px-2 py-1 text-left">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.map((p, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-2 py-1">{p.nombre}</td>
                            <td className="px-2 py-1">${p.precio}</td>
                            <td className="px-2 py-1">{p.stock || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end border-t pt-4">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                {bulkStep === 3 && (
                  <button
                    onClick={handleBulkImport}
                    disabled={bulkLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 font-medium"
                  >
                    {bulkLoading ? "Importando..." : "Confirmar importación"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CategoriesTab({
  categories,
  showCategoryModal,
  setShowCategoryModal,
  editingCategory,
  setEditingCategory,
  categoryForm,
  setCategoryForm,
  handleSaveCategory,
  handleDeleteCategory,
}) {
  return (
    <>
      <button
        onClick={() => {
          setEditingCategory(null);
          setCategoryForm({
            nombre: "",
            descripcion: "",
            emoji: "",
            orden: "0",
            activo: true,
          });
          setShowCategoryModal(true);
        }}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        ➕ Nueva categoría
      </button>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <div className="flex-1">
                <div className="font-medium text-lg">
                  {cat.emoji} {cat.nombre}
                </div>
                {cat.descripcion && (
                  <div className="text-sm text-slate-500">{cat.descripcion}</div>
                )}
                <div className="text-xs text-slate-400 mt-1">
                  Orden: {cat.orden}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCategoryForm(cat);
                    setEditingCategory(cat);
                    setShowCategoryModal(true);
                  }}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No hay categorías
            </div>
          )}
        </div>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold">
                {editingCategory ? "Editar" : "Nueva"} Categoría
              </h2>

              <input
                type="text"
                placeholder="Emoji"
                value={categoryForm.emoji}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, emoji: e.target.value })
                }
                maxLength="2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-2xl text-center"
              />

              <input
                type="text"
                placeholder="Nombre"
                value={categoryForm.nombre}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, nombre: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />

              <textarea
                placeholder="Descripción"
                value={categoryForm.descripcion}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    descripcion: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows="3"
              />

              <input
                type="number"
                placeholder="Orden"
                value={categoryForm.orden}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, orden: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={categoryForm.activo}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      activo: e.target.checked,
                    })
                  }
                />
                Activo
              </label>

              <div className="flex gap-2 justify-end border-t pt-4">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RulesTab({
  products,
  rules,
  showRuleModal,
  setShowRuleModal,
  editingRule,
  setEditingRule,
  ruleForm,
  setRuleForm,
  handleSaveRule,
  handleDeleteRule,
}) {
  return (
    <>
      <button
        onClick={() => {
          setEditingRule(null);
          setRuleForm({
            tipo: "cross_sell",
            nombre: "",
            fecha_inicio: "",
            fecha_fin: "",
            activo: true,
            condiciones: {},
            acciones: {},
          });
          setShowRuleModal(true);
        }}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        ➕ Nueva regla
      </button>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="space-y-2">
          {rules.map((rule) => {
            const typeLabel = Object.values(RULE_TYPES).find(
              (t) => t.id === rule.tipo
            )?.label;
            return (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {typeLabel}: {rule.nombre}
                  </div>
                  <div className="text-sm text-slate-500">
                    {rule.fecha_inicio && `Desde: ${rule.fecha_inicio}`}
                    {rule.fecha_fin && ` - Hasta: ${rule.fecha_fin}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      rule.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {rule.activo ? "Activa" : "Inactiva"}
                  </span>
                  <button
                    onClick={() => {
                      setRuleForm(mapRuleFromDB(rule));
                      setEditingRule(rule);
                      setShowRuleModal(true);
                    }}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
          {rules.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No hay reglas
            </div>
          )}
        </div>
      </div>

      {showRuleModal && (
        <RuleModal
          setShowRuleModal={setShowRuleModal}
          editingRule={editingRule}
          ruleForm={ruleForm}
          setRuleForm={setRuleForm}
          handleSaveRule={handleSaveRule}
          products={products}
        />
      )}
    </>
  );
}

function RuleModal({
  setShowRuleModal,
  editingRule,
  ruleForm,
  setRuleForm,
  handleSaveRule,
  products,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">
            {editingRule ? "Editar" : "Nueva"} Regla
          </h2>

          <select
            value={ruleForm.tipo}
            onChange={(e) => setRuleForm({ ...ruleForm, tipo: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            {Object.values(RULE_TYPES).map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Nombre de la regla"
            value={ruleForm.nombre}
            onChange={(e) =>
              setRuleForm({ ...ruleForm, nombre: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={ruleForm.fecha_inicio || ""}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, fecha_inicio: e.target.value })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              type="date"
              value={ruleForm.fecha_fin || ""}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, fecha_fin: e.target.value })
              }
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {ruleForm.tipo === "cross_sell" && (
            <div className="space-y-2">
              <select
                value={ruleForm.condiciones?.producto_disparador || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    condiciones: {
                      ...ruleForm.condiciones,
                      producto_disparador: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Producto disparador</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <select
                value={ruleForm.condiciones?.producto_recomendado || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    condiciones: {
                      ...ruleForm.condiciones,
                      producto_recomendado: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Producto con descuento</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="% de descuento"
                value={ruleForm.acciones?.descuento_porcentaje || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    acciones: {
                      ...ruleForm.acciones,
                      descuento_porcentaje: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {ruleForm.tipo === "intro_price" && (
            <div className="space-y-2">
              <select
                value={ruleForm.condiciones?.producto_id || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    condiciones: {
                      ...ruleForm.condiciones,
                      producto_id: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Precio especial"
                value={ruleForm.acciones?.precio_especial || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    acciones: {
                      ...ruleForm.acciones,
                      precio_especial: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          )}

          {ruleForm.tipo === "gift_purchase" && (
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Monto mínimo del carrito"
                value={ruleForm.condiciones?.monto_minimo || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    condiciones: {
                      ...ruleForm.condiciones,
                      monto_minimo: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <select
                value={ruleForm.acciones?.producto_regalo_id || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    acciones: {
                      ...ruleForm.acciones,
                      producto_regalo_id: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Producto regalo</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {ruleForm.tipo === "limited_edition" && (
            <div className="space-y-2">
              <select
                value={ruleForm.condiciones?.producto_id || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    condiciones: {
                      ...ruleForm.condiciones,
                      producto_id: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Selecciona un producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Stock máximo"
                value={ruleForm.acciones?.stock_maximo || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    acciones: {
                      ...ruleForm.acciones,
                      stock_maximo: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <input
                type="date"
                value={ruleForm.acciones?.fecha_limite || ""}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    acciones: {
                      ...ruleForm.acciones,
                      fecha_limite: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={ruleForm.activo}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, activo: e.target.checked })
              }
            />
            Activa
          </label>

          <div className="flex gap-2 justify-end border-t pt-4">
            <button
              onClick={() => setShowRuleModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveRule}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigTab({
  configForm,
  setConfigForm,
  handleSaveConfig,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold">Configuración de la tienda</h2>

      <div className="border-t pt-4 space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={configForm.ecommerce_mode !== "none"}
            onChange={(e) =>
              setConfigForm({
                ...configForm,
                ecommerce_mode: e.target.checked ? "tienda" : "none",
              })
            }
            className="w-4 h-4"
          />
          <span className="font-medium">Activar e-commerce</span>
        </label>

        {configForm.ecommerce_mode !== "none" && (
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <select
              value={configForm.ecommerce_mode}
              onChange={(e) =>
                setConfigForm({
                  ...configForm,
                  ecommerce_mode: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="none">Ninguno (desactivado)</option>
              <option value="catalogo_whatsapp">Catálogo + WhatsApp</option>
              <option value="chatbot">Chatbot con pedidos</option>
              <option value="tienda">Tienda completa</option>
            </select>

            <input
              type="tel"
              placeholder="Número WhatsApp (ej: +1234567890)"
              value={configForm.whatsapp_number}
              onChange={(e) =>
                setConfigForm({
                  ...configForm,
                  whatsapp_number: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />

            <select
              value={configForm.currency}
              onChange={(e) =>
                setConfigForm({ ...configForm, currency: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="USD">USD ($)</option>
              <option value="GTQ">GTQ (Q)</option>
              <option value="EUR">EUR (€)</option>
              <option value="MXN">MXN ($)</option>
            </select>

            <input
              type="text"
              placeholder="Nombre de la tienda"
              value={configForm.store_name}
              onChange={(e) =>
                setConfigForm({ ...configForm, store_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />

            <input
              type="url"
              placeholder="URL del logo"
              value={configForm.store_logo}
              onChange={(e) =>
                setConfigForm({ ...configForm, store_logo: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />

            <input
              type="url"
              placeholder="URL del banner"
              value={configForm.store_banner}
              onChange={(e) =>
                setConfigForm({
                  ...configForm,
                  store_banner: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />

            <textarea
              placeholder="Mensaje del topbar"
              value={configForm.topbar_message}
              onChange={(e) =>
                setConfigForm({
                  ...configForm,
                  topbar_message: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows="2"
            />

            <input
              type="number"
              placeholder="Monto mínimo de pedido"
              value={configForm.min_order_amount}
              onChange={(e) =>
                setConfigForm({
                  ...configForm,
                  min_order_amount: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />

            <div className="space-y-2">
              <label className="font-medium block">Métodos de pago</label>
              {[
                { id: "whatsapp", label: "WhatsApp" },
                { id: "efectivo", label: "Efectivo contra entrega" },
                { id: "transferencia", label: "Transferencia bancaria" },
                { id: "stripe", label: "Stripe" },
              ].map((method) => (
                <label key={method.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(configForm.payment_methods || []).includes(
                      method.id
                    )}
                    onChange={(e) => {
                      const methods = configForm.payment_methods || [];
                      if (e.target.checked) {
                        setConfigForm({
                          ...configForm,
                          payment_methods: [...methods, method.id],
                        });
                      } else {
                        setConfigForm({
                          ...configForm,
                          payment_methods: methods.filter(
                            (m) => m !== method.id
                          ),
                        });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  {method.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end border-t pt-4">
        <button
          onClick={handleSaveConfig}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          💾 Guardar configuración
        </button>
      </div>
    </div>
  );
}
