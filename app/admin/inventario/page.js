"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import POSConfigTab from "../components/POSConfigTab";
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



function InventoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("clientId");

  const [activeTab, setActiveTab] = useState(TABS.PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [clientName, setClientName] = useState("");

  // Productos
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

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
    ecommerce_modes: [],
    whatsapp_number: "",
    currency: "USD",
    store_name: "",
    store_logo: "",
    store_banner: "",
    topbar_message: "",
    min_order_amount: "",
    payment_methods: [],
  });

  const openNewProduct = () => {
    router.push(`/admin/inventario/productos/nuevo?clientId=${clientId}`);
  };

  const openEditProduct = (productId) => {
    router.push(`/admin/inventario/productos/${productId}?clientId=${clientId}`);
  };

  // Plan limits
  const [planLimits, setPlanLimits] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);

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
      console.error("[inventario] Error cargando nombre del cliente:", err);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/admin/inventory/products?clientId=${clientId}`),
        fetch(`/api/admin/inventory/categories?clientId=${clientId}`),
      ]);

      if (pRes.ok) {
        const data = await pRes.json();
        setProducts(data.products || []);
      }
      if (cRes.ok) {
        const data = await cRes.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("[inventario] Error cargando productos:", err);
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
      console.error("[inventario] Error cargando categorías:", err);
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
      console.error("[inventario] Error cargando reglas:", err);
      setToast({ message: "✗ Error al cargar reglas", type: "error" });
    } finally {
      setLoading(false);
    }
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

  const loadPlanLimits = async () => {
    try {
      const res = await fetch(`/api/admin/plan-limits?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setPlanLimits(data);
      }
    } catch (err) {
      console.error("[inventario] Error cargando límites del plan:", err);
    }
  };

  const loadPlanInfo = async () => {
    try {
      const url = `/api/admin/inventory/plan-info?clientId=${clientId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPlanInfo(data);
      } else {
        const error = await res.json();
        console.error("[inventario] Error al cargar información del plan:", error);
      }
    } catch (err) {
      console.error("[inventario] Error cargando plan info:", err);
    }
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/inventory/config?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setConfigForm({
          ecommerce_modes: data.config.ecommerce_modes || (data.config.ecommerce_mode && data.config.ecommerce_mode !== 'none' ? [data.config.ecommerce_mode] : []),
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
      // Cargar límites del plan
      await loadPlanLimits();
    } catch (err) {
      console.error("[inventario] Error cargando configuración:", err);
      setToast({ message: "✗ Error al cargar configuración", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Se ejecuta solo cuando cambia clientId
  useEffect(() => {
    if (!clientId) return;
    loadClientName();
    loadPlanInfo();
  }, [clientId]);

  // Se ejecuta cuando cambia el tab
  useEffect(() => {
    if (!clientId) return;
    if (activeTab === TABS.PRODUCTS) loadProducts();
    if (activeTab === TABS.CATEGORIES) loadCategories();
    if (activeTab === TABS.RULES) loadRules();
    if (activeTab === TABS.CONFIG) loadConfig();
  }, [activeTab, clientId]);

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
          console.error("[inventario] Error eliminando producto:", err);
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
      console.error("[inventario] Error guardando categoría:", err);
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
          console.error("[inventario] Error eliminando categoría:", err);
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
      console.error("[inventario] Error guardando regla:", err);
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
          console.error("[inventario] Error eliminando regla:", err);
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
      console.error("[inventario] Error guardando configuración:", err);
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
      console.error("[inventario] Error importando productos en lote:", err);
      setToast({ message: "✗ Error en la importación", type: "error" });
    } finally {
      setBulkLoading(false);
    }
  };

  /* UX/UI: Header con SVG, tab bar con dark mode e íconos, spinner premium */
  const TAB_CONFIG = [
    { key: TABS.PRODUCTS, label: "Productos", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
    { key: TABS.CATEGORIES, label: "Categorías", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c0 .621.504 1.125 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" /></svg> },
    { key: TABS.RULES, label: "Reglas", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { key: TABS.CONFIG, label: "Configuración", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />

      {/* Header con ícono SVG de retorno */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Volver al panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            Inventario — {clientName || clientId}
          </h1>
          {planInfo && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 capitalize">
              Plan {planInfo.plan} · {planInfo.productsCount ?? 0} productos
            </p>
          )}
        </div>
      </div>

      {/* Tabs con íconos SVG y dark mode */}
      <div className="flex gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 overflow-x-auto">
        {TAB_CONFIG.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
              ${
                activeTab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }
            `}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
        </div>
      )}

      {!loading && activeTab === TABS.PRODUCTS && (
        <ProductsTab
          clientId={clientId}
          products={products.filter((p) => {
            const matchName = p.nombre
              .toLowerCase()
              .includes(searchProduct.toLowerCase());
            const matchCat = filterCategory ? p.category_id === filterCategory : true;
            return matchName && matchCat;
          })}
          categories={categories}
          searchProduct={searchProduct}
          setSearchProduct={setSearchProduct}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          openNewProduct={openNewProduct}
          openEditProduct={openEditProduct}
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
          planInfo={planInfo}
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
          planInfo={planInfo}
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
          planInfo={planInfo}
        />
      )}

      {!loading && activeTab === TABS.CONFIG && (
        <ConfigTab
          clientId={clientId}
          configForm={configForm}
          setConfigForm={setConfigForm}
          handleSaveConfig={handleSaveConfig}
          planLimits={planLimits}
          planInfo={planInfo}
        />
      )}
    </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando inventario…</p>
          </div>
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
  openNewProduct,
  openEditProduct,
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
  planInfo,
}) {


  if (planInfo?.maxProductos === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">🔒</p>
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Tu plan no incluye módulo de inventario
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Actualiza a Pro o Enterprise para gestionar productos, categorías y reglas de negocio.
          </p>
          <a
            href="/precios"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Ver planes disponibles
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={openNewProduct}
          disabled={planInfo?.atLimit?.productos}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            planInfo?.atLimit?.productos
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          ➕ Nuevo producto
        </button>
        <button
          onClick={() => {
            setBulkStep(1);
            setShowBulkModal(true);
          }}
          disabled={planInfo?.atLimit?.productos}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            planInfo?.atLimit?.productos
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          📥 Carga masiva
        </button>

        {planInfo && (
          <span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${
            planInfo.atLimit?.productos
              ? 'bg-red-100 text-red-700'
              : planInfo.nearLimit?.productos
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {planInfo.atLimit?.productos ? '🔒' : planInfo.nearLimit?.productos ? '⚠️' : '📦'}
            {' '}{planInfo.currentProductos}/{planInfo.maxProductos} productos
          </span>
        )}
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
                        onClick={() => openEditProduct(product.id)}
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
  planInfo,
}) {
  if (planInfo?.maxCategorias === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">🔒</p>
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Tu plan no incluye módulo de inventario
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Actualiza a Pro o Enterprise para gestionar productos, categorías y reglas de negocio.
          </p>
          <a
            href="/precios"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Ver planes disponibles
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center mb-4">
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
          disabled={planInfo?.atLimit?.categorias}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            planInfo?.atLimit?.categorias
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          ➕ Nueva categoría
        </button>

        {planInfo && (
          <span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${
            planInfo.atLimit?.categorias
              ? 'bg-red-100 text-red-700'
              : planInfo.nearLimit?.categorias
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {planInfo.atLimit?.categorias ? '🔒' : planInfo.nearLimit?.categorias ? '⚠️' : '🏷️'}
            {' '}{planInfo.currentCategorias}/{planInfo.maxCategorias} categorías
          </span>
        )}
      </div>

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
  planInfo,
}) {
  function mapRuleFromDB(rule) {
    const base = {
      id: rule.id,
      tipo: rule.tipo,
      nombre: rule.nombre,
      activo: rule.activo,
      fecha_inicio: rule.fecha_inicio ? rule.fecha_inicio.substring(0, 16) : '',
      fecha_fin: rule.fecha_fin ? rule.fecha_fin.substring(0, 16) : '',
      condiciones: {},
      acciones: {}
    }

    switch (rule.tipo) {
      case 'gift_purchase':
        return {
          ...base,
          condiciones: {
            monto_minimo: rule.condiciones?.min_subtotal || ''
          },
          acciones: {
            producto_regalo_id: rule.acciones?.gift_product_id || ''
          }
        }
      case 'cross_sell':
        return {
          ...base,
          condiciones: {
            producto_disparador: rule.condiciones?.trigger_product_id || '',
            producto_recomendado: rule.condiciones?.discount_product_id || '',
            descuento_porcentaje: rule.condiciones?.discount_percent || ''
          }
        }
      case 'volume_pricing':
        return {
          ...base,
          condiciones: {
            product_id: rule.condiciones?.product_id || '',
            tiers: rule.condiciones?.tiers || []
          }
        }
      case 'kit_combo':
        return {
          ...base,
          condiciones: {
            product_ids: rule.condiciones?.product_ids || []
          },
          acciones: {
            discount_percent: rule.acciones?.discount_percent || '',
            fixed_price: rule.acciones?.fixed_price || ''
          }
        }
      case 'intro_price':
        return {
          ...base,
          condiciones: {
            product_id: rule.condiciones?.product_id || '',
            expires_at: rule.condiciones?.expires_at || ''
          },
          acciones: {
            precio_especial: rule.acciones?.special_price || ''
          }
        }
      case 'limited_edition':
        return {
          ...base,
          condiciones: {
            product_id: rule.condiciones?.product_id || '',
            max_stock: rule.condiciones?.max_stock || '',
            expires_at: rule.condiciones?.expires_at || ''
          }
        }
      default:
        return base
    }
  }

  if (planInfo?.maxReglas === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">🔒</p>
          <p className="text-xl font-semibold text-gray-700 mb-2">
            Tu plan no incluye módulo de inventario
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Actualiza a Pro o Enterprise para gestionar productos, categorías y reglas de negocio.
          </p>
          <a
            href="/precios"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Ver planes disponibles
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center mb-4">
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
          disabled={planInfo?.atLimit?.reglas}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            planInfo?.atLimit?.reglas
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          ➕ Nueva regla
        </button>

        {planInfo && (
          <span className={`text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap ${
            planInfo.atLimit?.reglas
              ? 'bg-red-100 text-red-700'
              : planInfo.nearLimit?.reglas
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {planInfo.atLimit?.reglas ? '🔒' : planInfo.nearLimit?.reglas ? '⚠️' : '⚙️'}
            {' '}{planInfo.currentReglas}/{planInfo.maxReglas} reglas
          </span>
        )}
      </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Válido desde
              </label>
              <input
                type="datetime-local"
                value={ruleForm.fecha_inicio || ""}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, fecha_inicio: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Válido hasta
              </label>
              <input
                type="datetime-local"
                value={ruleForm.fecha_fin || ""}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, fecha_fin: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
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

const MODALIDADES = [
  { value: 'catalogo_whatsapp', label: '🛍️ Catálogo + WhatsApp', plan: 'pro' },
  { value: 'chatbot', label: '🤖 Chatbot con pedidos', plan: 'pro' },
  { value: 'tienda', label: '🏪 Tienda completa', plan: 'enterprise' },
  { value: 'pos', label: '🖥️ Punto de Venta (POS)', plan: 'enterprise' }
];

function ConfigTab({
  clientId,
  configForm,
  setConfigForm,
  handleSaveConfig,
  planLimits,
  planInfo,
}) {
  const getProgressPercentage = (current, limit) => {
    if (limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (current, limit) => {
    if (limit === 0) return 'bg-gray-200';
    const percentage = (current / limit) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressTextColor = (current, limit) => {
    if (limit === 0) return 'text-gray-600';
    const percentage = (current / limit) * 100;
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold">Configuración de la tienda</h2>

      {/* Plan limits section */}
      {planLimits && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span>📊</span>
            <span>Límites de tu plan: <span className="font-bold text-blue-600">{planLimits.plan.nombre}</span></span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Productos */}
            {planLimits.plan.max_productos > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">📦 Productos</span>
                  <span className={`text-sm font-bold ${getProgressTextColor(planLimits.limits.productos.current, planLimits.limits.productos.limit)}`}>
                    {planLimits.limits.productos.current}/{planLimits.limits.productos.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(planLimits.limits.productos.current, planLimits.limits.productos.limit)}`}
                    style={{ width: `${getProgressPercentage(planLimits.limits.productos.current, planLimits.limits.productos.limit)}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="opacity-50">
                <span className="font-medium text-slate-500">📦 Productos</span>
                <p className="text-xs text-slate-500 mt-2">No disponible en tu plan</p>
              </div>
            )}

            {/* Categorías */}
            {planLimits.plan.max_categorias > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">🏷️ Categorías</span>
                  <span className={`text-sm font-bold ${getProgressTextColor(planLimits.limits.categorias.current, planLimits.limits.categorias.limit)}`}>
                    {planLimits.limits.categorias.current}/{planLimits.limits.categorias.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(planLimits.limits.categorias.current, planLimits.limits.categorias.limit)}`}
                    style={{ width: `${getProgressPercentage(planLimits.limits.categorias.current, planLimits.limits.categorias.limit)}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="opacity-50">
                <span className="font-medium text-slate-500">🏷️ Categorías</span>
                <p className="text-xs text-slate-500 mt-2">No disponible en tu plan</p>
              </div>
            )}

            {/* Reglas */}
            {planLimits.plan.max_reglas > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">⚙️ Reglas</span>
                  <span className={`text-sm font-bold ${getProgressTextColor(planLimits.limits.reglas.current, planLimits.limits.reglas.limit)}`}>
                    {planLimits.limits.reglas.current}/{planLimits.limits.reglas.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(planLimits.limits.reglas.current, planLimits.limits.reglas.limit)}`}
                    style={{ width: `${getProgressPercentage(planLimits.limits.reglas.current, planLimits.limits.reglas.limit)}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="opacity-50">
                <span className="font-medium text-slate-500">⚙️ Reglas</span>
                <p className="text-xs text-slate-500 mt-2">No disponible en tu plan</p>
              </div>
            )}
          </div>

          {/* Modalidades disponibles */}
          <div className="mt-6 pt-4 border-t border-slate-300">
            <p className="font-medium mb-3">Modalidades de e-commerce disponibles:</p>
            <div className="flex flex-wrap gap-2">
              {planLimits.plan.ecommerce_modes.length === 0 ? (
                <span className="text-sm text-slate-600 italic">No disponible en tu plan</span>
              ) : (
                planLimits.plan.ecommerce_modes.map((mode) => (
                  <span
                    key={mode}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full"
                  >
                    {mode === 'catalogo_whatsapp' ? '🛍️ Catálogo + WhatsApp' :
                     mode === 'chatbot' ? '🤖 Chatbot con pedidos' :
                     mode === 'tienda' ? '🏪 Tienda completa' :
                     mode}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Warning/Error messages */}
          {(
            (planLimits.limits.productos.current >= planLimits.limits.productos.limit && planLimits.plan.max_productos > 0) ||
            (planLimits.limits.categorias.current >= planLimits.limits.categorias.limit && planLimits.plan.max_categorias > 0) ||
            (planLimits.limits.reglas.current >= planLimits.limits.reglas.limit && planLimits.plan.max_reglas > 0)
          ) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">⚠️ Has alcanzado el límite de tu plan. Actualiza para agregar más recursos.</p>
            </div>
          )}

          {(
            (planLimits.limits.productos.current >= planLimits.limits.productos.limit * 0.8 && planLimits.plan.max_productos > 0) ||
            (planLimits.limits.categorias.current >= planLimits.limits.categorias.limit * 0.8 && planLimits.plan.max_categorias > 0) ||
            (planLimits.limits.reglas.current >= planLimits.limits.reglas.limit * 0.8 && planLimits.plan.max_reglas > 0)
          ) && !(
            (planLimits.limits.productos.current >= planLimits.limits.productos.limit && planLimits.plan.max_productos > 0) ||
            (planLimits.limits.categorias.current >= planLimits.limits.categorias.limit && planLimits.plan.max_categorias > 0) ||
            (planLimits.limits.reglas.current >= planLimits.limits.reglas.limit && planLimits.plan.max_reglas > 0)
          ) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700 font-medium">⚠️ Estás cerca del límite de tu plan. Considera actualizar.</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t pt-4 space-y-4">
        {!planInfo?.ecommerceModes?.length ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm text-yellow-800 dark:text-yellow-300 space-y-3">
            <div className="flex gap-2">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="font-medium">Tu plan {planInfo?.planNombre || 'Basic'} no incluye módulo de e-commerce</p>
                <p className="text-xs mt-1 opacity-90">El e-commerce está disponible a partir del plan Pro. Actualiza tu plan para acceder a catálogos, tiendas y pedidos automáticos.</p>
              </div>
            </div>
            <a
              href="/precios"
              className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium px-3 py-1 rounded transition"
            >
              Ver planes →
            </a>
          </div>
        ) : (
          <>
            <div>
              <label className="font-medium block mb-3">Modalidades de e-commerce</label>
              <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                {MODALIDADES.map((modalidad) => {
                  const isEnabled = planInfo?.ecommerceModes?.includes(modalidad.value);
                  const isChecked = (configForm.ecommerce_modes || []).includes(modalidad.value);

                  return (
                    <label key={modalidad.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isEnabled}
                        onChange={(e) => {
                          const modes = configForm.ecommerce_modes || [];
                          if (e.target.checked) {
                            setConfigForm({
                              ...configForm,
                              ecommerce_modes: [...modes, modalidad.value],
                            });
                          } else {
                            setConfigForm({
                              ...configForm,
                              ecommerce_modes: modes.filter(m => m !== modalidad.value),
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className={`flex-1 ${!isEnabled ? 'text-slate-400' : 'text-slate-900'}`}>
                        {modalidad.label}
                      </span>
                      {!isEnabled && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                          requiere {modalidad.plan.toUpperCase()}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {(configForm.ecommerce_modes || []).includes("chatbot") && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="text-2xl flex-shrink-0">🤖</div>
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">Modo Chatbot IA activado</h4>
                    <p className="text-sm text-purple-700 mb-3">
                      El chatbot responderá preguntas sobre tu catálogo de productos en tiempo real y podrá tomar pedidos automáticamente. Los clientes pueden comprar directamente en la conversación.
                    </p>
                    <div className="space-y-2 text-xs text-purple-600">
                      <p>✅ El bot tendrá acceso al catálogo actualizado</p>
                      <p>✅ Tomará pedidos automáticamente y los guardará en el sistema</p>
                      <p>✅ Los descuentos y promociones se aplicarán automáticamente</p>
                      <p className="font-semibold text-purple-800 mt-2">💡 Recomendación: Configura el System Prompt del cliente para que el bot sepa cómo presentarse y ayudar a los clientes con el catálogo.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
          </>
        )}
      </div>

      {/* POS Configuration */}
      {planInfo?.ecommerceModes?.includes('pos') && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">🖥️ Configuración del Punto de Venta (POS)</h3>
          <POSConfigTab clientId={clientId} planInfo={planInfo} />
        </div>
      )}

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
