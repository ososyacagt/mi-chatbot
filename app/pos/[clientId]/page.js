"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function POSPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId;

  const [posUser, setPosUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tipoOrden, setTipoOrden] = useState("mostrador"); // mostrador, mesa, para_llevar, autoservicio
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [ordenConfirmada, setOrdenConfirmada] = useState(null);

  const [activeOrders, setActiveOrders] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingOrderNumero, setEditingOrderNumero] = useState("");
  const [showActiveOrdersModal, setShowActiveOrdersModal] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Nuevos estados para modificadores y cuentas múltiples/divididas
  const [selectedOrderIdForMesa, setSelectedOrderIdForMesa] = useState(null);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [customSelections, setCustomSelections] = useState({});
  const [excludedGroups, setExcludedGroups] = useState({});
  const [observation, setObservation] = useState("");
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitOrder, setSplitOrder] = useState(null);
  const [splitAccounts, setSplitAccounts] = useState([]);
  const [splitQuantities, setSplitQuantities] = useState({});

  useEffect(() => {
    if (toast.message) {
      const timer = setTimeout(() => {
        setToast({ message: "", type: "success" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.message]);

  // Authenticate user check
  useEffect(() => {
    const userStr = sessionStorage.getItem("posUser");
    if (!userStr) {
      router.push(`/pos/${clientId}/login`);
      return;
    }
    const userObj = JSON.parse(userStr);
    setPosUser(userObj);

    // Default order types based on role
    if (userObj.rol === "mesero") {
      setTipoOrden("mesa");
    } else if (userObj.rol === "operador" || userObj.isPublic) {
      setTipoOrden("autoservicio");
    } else if (userObj.rol === "cocina") {
      // Cocina users should go straight to KDS
      if (userObj.areaId) {
        router.push(`/pos/${clientId}/area/${userObj.areaId}`);
      } else {
        router.push(`/pos/${clientId}/login`);
      }
    }

    loadPOSConfig();
  }, [clientId]);

  const loadPOSConfig = async () => {
    try {
      const res = await fetch(`/api/pos/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setAreas(data.areas || []);
        setMesas(data.mesas || []);
        setCategories(data.categories || []);
        setProducts(data.products || []);
      }

      // Fetch active orders for waitperson list / ocupada checks
      const activeRes = await fetch(`/api/pos/${clientId}/orders/active?posStatus=enviada&posStatus=recibida&posStatus=en_preparacion&posStatus=lista&posStatus=pendiente_cobro`);
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveOrders(activeData.orders || []);
      }
    } catch (err) {
      console.error("[POS] Error cargando configuración:", err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("posUser");
    router.push(`/pos/${clientId}/login`);
  };

  const agregarAlCarrito = (producto, customizedNotas = "") => {
    const existente = carrito.find(item => item.productId === producto.id && item.notas === customizedNotas);
    if (existente) {
      setCarrito(carrito.map(item =>
        (item.productId === producto.id && item.notas === customizedNotas)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        productId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        quantity: 1,
        notas: customizedNotas
      }]);
    }
  };

  const actualizarCantidad = (productId, notas, cantidad) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(item => !(item.productId === productId && item.notas === notas)));
    } else {
      setCarrito(carrito.map(item =>
        (item.productId === productId && item.notas === notas)
          ? { ...item, quantity: cantidad }
          : item
      ));
    }
  };

  const handleProductClick = (producto) => {
    if (producto.customization_options && Array.isArray(producto.customization_options) && producto.customization_options.length > 0) {
      setCustomizingProduct(producto);
      setObservation("");
      
      const initialSelections = {};
      const initialExcluded = {};
      
      producto.customization_options.forEach(group => {
        initialExcluded[group.nombre] = false;
        
        if (!group.opciones || group.opciones.length === 0) {
          initialSelections[group.nombre] = true;
        } else if (group.tipo === "seleccion_unica") {
          initialSelections[group.nombre] = group.opciones?.[0] || "";
        } else if (group.tipo === "seleccion_multiple") {
          const groupSelections = {};
          (group.opciones || []).forEach(opt => {
            groupSelections[opt] = true;
          });
          initialSelections[group.nombre] = groupSelections;
        }
      });
      setCustomSelections(initialSelections);
      setExcludedGroups(initialExcluded);
    } else {
      agregarAlCarrito(producto, "");
    }
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    const notesParts = [];
    
    (customizingProduct.customization_options || []).forEach(group => {
      const isExcluded = !!excludedGroups[group.nombre];
      
      if (isExcluded) {
        notesParts.push(`[Sin: ${group.nombre}]`);
      } else {
        if (!group.opciones || group.opciones.length === 0) {
          // Si está incluido y no tiene opciones, no requiere nota especial
        } else if (group.tipo === "seleccion_unica") {
          const selected = customSelections[group.nombre];
          if (selected) {
            notesParts.push(`[${group.nombre}: ${selected}]`);
          }
        } else if (group.tipo === "seleccion_multiple") {
          const selectionsForGroup = customSelections[group.nombre] || {};
          const removed = [];
          (group.opciones || []).forEach(opt => {
            if (selectionsForGroup[opt] === false) {
              removed.push(opt);
            }
          });
          if (removed.length > 0) {
            notesParts.push(`[Sin: ${removed.join(", ")}]`);
          }
        }
      }
    });

    if (observation.trim()) {
      notesParts.push(`[Obs: ${observation.trim()}]`);
    }

    const finalNotes = notesParts.join(" | ");
    agregarAlCarrito(customizingProduct, finalNotes);
    setCustomizingProduct(null);
    setCustomSelections({});
    setExcludedGroups({});
    setObservation("");
  };

  const startSplit = (order) => {
    setSplitOrder(order);
    const initialAccId = Date.now();
    setSplitAccounts([{ id: initialAccId, clienteNombre: `Mesa ${order.mesa_numero} - Cuenta 2` }]);
    
    const initialQuantities = {};
    (order.items || []).forEach((item, idx) => {
      initialQuantities[`${idx}-0`] = item.cantidad || 1;
      initialQuantities[`${idx}-${initialAccId}`] = 0;
    });
    setSplitQuantities(initialQuantities);
    setShowSplitModal(true);
  };

  const addSplitAccount = () => {
    const newId = Date.now();
    const newAccNum = splitAccounts.length + 2;
    setSplitAccounts([...splitAccounts, { id: newId, clienteNombre: `Mesa ${splitOrder.mesa_numero} - Cuenta ${newAccNum}` }]);
    const updated = { ...splitQuantities };
    (splitOrder.items || []).forEach((item, idx) => {
      updated[`${idx}-${newId}`] = 0;
    });
    setSplitQuantities(updated);
  };

  const removeSplitAccount = (accId) => {
    const updated = { ...splitQuantities };
    (splitOrder.items || []).forEach((item, idx) => {
      const qty = updated[`${idx}-${accId}`] || 0;
      updated[`${idx}-0`] = (updated[`${idx}-0`] || 0) + qty;
      delete updated[`${idx}-${accId}`];
    });
    setSplitQuantities(updated);
    setSplitAccounts(splitAccounts.filter(a => a.id !== accId));
  };

  const moveQuantity = (itemIdx, targetAccId, increment) => {
    const updated = { ...splitQuantities };
    const originalKey = `${itemIdx}-0`;
    const targetKey = `${itemIdx}-${targetAccId}`;
    
    const qtyOriginal = updated[originalKey] || 0;
    const qtyTarget = updated[targetKey] || 0;
    
    if (increment) {
      if (qtyOriginal > 0) {
        updated[originalKey] = qtyOriginal - 1;
        updated[targetKey] = qtyTarget + 1;
      }
    } else {
      if (qtyTarget > 0) {
        updated[originalKey] = qtyOriginal + 1;
        updated[targetKey] = qtyTarget - 1;
      }
    }
    setSplitQuantities(updated);
  };

  const handleConfirmSplit = async () => {
    const remainingItems = (splitOrder.items || []).map((item, idx) => ({
      ...item,
      cantidad: splitQuantities[`${idx}-0`] || 0,
      quantity: splitQuantities[`${idx}-0`] || 0
    })).filter(item => item.cantidad > 0);

    const newOrders = [];
    for (const acc of splitAccounts) {
      const accItems = (splitOrder.items || []).map((item, idx) => ({
        ...item,
        cantidad: splitQuantities[`${idx}-${acc.id}`] || 0,
        quantity: splitQuantities[`${idx}-${acc.id}`] || 0
      })).filter(item => item.cantidad > 0);

      if (accItems.length > 0) {
        newOrders.push({
          clienteNombre: acc.clienteNombre,
          items: accItems
        });
      }
    }

    if (newOrders.length === 0) {
      setToast({ message: "✗ Debes mover al menos un producto a una nueva cuenta", type: "error" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/pos/${clientId}/orders/${splitOrder.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newOrders,
          remainingItems
        })
      });

      if (res.ok) {
        setToast({ message: "✓ Cuenta dividida correctamente", type: "success" });
        setShowSplitModal(false);
        setSplitOrder(null);
        setSplitAccounts([]);
        setSplitQuantities({});
        await loadPOSConfig();
      } else {
        const err = await res.json();
        setToast({ message: "✗ Error: " + err.error, type: "error" });
      }
    } catch (err) {
      console.error("Error splitting order:", err);
      setToast({ message: "✗ Error de conexión", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
  const total = subtotal;
  const cambio = montoRecibido ? Math.max(0, parseFloat(montoRecibido) - total) : 0;

  const crearOrden = async () => {
    if (carrito.length === 0) return;
    if (tipoOrden === "mesa" && !mesaSeleccionada) return;
    if (tipoOrden === "para_llevar" && !clienteNombre.trim()) return;

    try {
      const res = await fetch(`/api/pos/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoOrden,
          mesaId: tipoOrden === "mesa" ? mesaSeleccionada : null,
          mesaNumero: tipoOrden === "mesa" ? mesas.find(m => m.id === mesaSeleccionada)?.numero : null,
          clienteNombre: tipoOrden === "para_llevar" ? clienteNombre : (tipoOrden === "mesa" ? (clienteNombre || null) : (posUser?.isPublic ? "Auto-servicio" : null)),
          items: carrito.map(item => ({
            id: item.productId,
            nombre: item.nombre,
            precio: item.precio,
            cantidad: item.quantity,
            notas: item.notas,
            area_preparacion_id: products.find(p => p.id === item.productId)?.area_preparacion_id || null
          })),
          subtotal,
          total,
          metodoPago,
          posUserId: posUser?.id || null,
          montoRecibido: parseFloat(montoRecibido) || 0
        })
      });

      if (res.ok) {
        const orderData = await res.json();

        // Calcular cambio
        const finalCambio = metodoPago === "efectivo" && parseFloat(montoRecibido) > total
          ? parseFloat(montoRecibido) - total
          : 0;

        // Mostrar pantalla de confirmación
        setOrdenConfirmada({
          ...orderData.order,
          cambio: finalCambio
        });

        // Limpiar carrito
        setCarrito([]);
        setClienteNombre("");
        setMesaSeleccionada(null);
        setMontoRecibido("");
        if (posUser?.rol !== "mesero" && !posUser?.isPublic) {
          setTipoOrden("mostrador");
        }
        await loadPOSConfig();
      }
    } catch (err) {
      console.error("[POS] Error creando orden:", err);
    }
  };

  const agregarItemsAOrden = async () => {
    if (carrito.length === 0 || !editingOrderId) return;

    try {
      // Map items for addition
      const itemsPayload = carrito.map((item) => ({
        id: item.productId,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.quantity,
        notas: item.notas || "",
        area_preparacion_id: products.find(p => p.id === item.productId)?.area_preparacion_id || null
      }));

      const res = await fetch(`/api/pos/${clientId}/orders/${editingOrderId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsPayload,
          posUserId: posUser?.id
        })
      });

      if (res.ok) {
        setToast({ message: `✓ Productos agregados a Orden ${editingOrderNumero}`, type: "success" });
        setCarrito([]);
        setEditingOrderId(null);
        setEditingOrderNumero("");
        await loadPOSConfig(); // reload tables and active orders
      } else {
        const error = await res.json();
        setToast({ message: "✗ " + error.error, type: "error" });
      }
    } catch (err) {
      console.error("[POS] Error agregando productos:", err);
      setToast({ message: "✗ Error al conectar con el servidor", type: "error" });
    }
  };

  if (loading || !config || !posUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  const filteredProducts = products.filter(p => {
    const matchCategory = !categoryFilter || p.category_id === categoryFilter;
    const matchSearch = !searchTerm || p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const showNavbar = !posUser.isPublic; // Kiosk/Auto-servicio has no navbar for public client

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Navbar */}
      {showNavbar && (
        <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap gap-4 items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <span className="text-2xl">🏪</span>
            <div>
              <h1 className="text-lg font-black tracking-tight">{config.storeName}</h1>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Punto de Venta</p>
            </div>
          </div>

          {/* Quick Panels Switcher based on Roles */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/pos/${clientId}`)}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/10"
            >
              🛒 POS
            </button>
            
            {(posUser.rol === "supervisor" || posUser.rol === "cajero") && (
              <button
                onClick={() => router.push(`/pos/${clientId}/caja`)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                💵 Caja
              </button>
            )}

            {(posUser.rol === "supervisor" || posUser.rol === "entrega") && (
              <button
                onClick={() => router.push(`/pos/${clientId}/entrega`)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                🥡 Entrega
              </button>
            )}

            {posUser.rol === "supervisor" && areas.length > 0 && (
              <button
                onClick={() => router.push(`/pos/${clientId}/area/${areas[0].id}`)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                🍳 KDS / Preparación
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-200">{posUser.nombre}</p>
              <p className="text-xs text-slate-400 capitalize">
                {posUser.rol === "cocina" ? "Personal de Preparación (Cocina, Bar, etc.)" : posUser.rol}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition"
            >
              Salir
            </button>
          </div>
        </header>
      )}

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Catalog (60%) */}
        <div className="w-3/5 border-r border-slate-800 flex flex-col bg-slate-900/40">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <input
              type="text"
              placeholder="🔍 Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-white placeholder-slate-500 focus:outline-none transition"
            />
          </div>

          {/* Categories */}
          <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950/20">
            <button
              onClick={() => setCategoryFilter("")}
              className={`px-4 py-2 rounded-2xl whitespace-nowrap text-sm font-bold transition ${
                categoryFilter === ""
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-4 py-2 rounded-2xl whitespace-nowrap text-sm font-bold transition ${
                  categoryFilter === cat.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {cat.emoji} {cat.nombre}
              </button>
            ))}
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-slate-900 hover:bg-slate-850 p-4 rounded-2xl border border-slate-800/80 hover:border-blue-500/50 shadow-md hover:shadow-lg transition-all duration-300 text-left flex flex-col justify-between h-48 relative overflow-hidden group"
              >
                {product.imagenes?.[0] && (
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                    <img
                      src={product.imagenes[0]}
                      alt={product.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="relative z-10">
                  <div className="font-bold text-slate-200 line-clamp-2">{product.nombre}</div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">{product.descripcion}</div>
                </div>
                <div className="relative z-10 text-xl font-black mt-4" style={{ color: config.colorPrimary }}>
                  {config.currency} {product.precio.toFixed(2)}
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500">
                <span className="text-4xl block mb-2">🔍</span>
                No se encontraron productos
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Cart & Order Checkout (40%) */}
        <div className="w-2/5 bg-slate-900 flex flex-col shadow-2xl">
          {editingOrderId && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex justify-between items-center text-amber-300">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>➕</span> Agregando a {editingOrderNumero}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingOrderId(null);
                  setEditingOrderNumero("");
                  setCarrito([]);
                }}
                className="text-[10px] font-black uppercase bg-amber-500/25 hover:bg-amber-500/35 px-2 py-0.5 rounded transition"
              >
                Cancelar
              </button>
            </div>
          )}
          {/* Order Mode Selector */}
          <div className="p-4 border-b border-slate-800 space-y-4 overflow-y-auto max-h-[45vh] shrink-0">
            <div className="flex gap-2">
              {/* If user is public, force autoservicio. Otherwise allow options based on config/role */}
              {posUser?.isPublic ? (
                <div className="w-full text-center py-2 px-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold flex items-center justify-center gap-2">
                  <span>🤖</span> Modo Auto-servicio Activo
                </div>
              ) : (
                <>
                  {config?.posModalidad?.includes("mostrador") && posUser?.rol !== "mesero" && (
                    <button
                      onClick={() => {
                        setTipoOrden("mostrador");
                        setMesaSeleccionada(null);
                        setClienteNombre("");
                      }}
                      className={`flex-1 py-3 rounded-2xl font-bold text-sm transition ${
                        tipoOrden === "mostrador"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                          : "bg-slate-800 hover:bg-slate-750 text-slate-400"
                      }`}
                    >
                      🏪 Mostrador
                    </button>
                  )}

                  {config?.posModalidad?.includes("restaurante") && (
                    <button
                      onClick={() => {
                        setTipoOrden("mesa");
                        setClienteNombre("");
                      }}
                      className={`flex-1 py-3 rounded-2xl font-bold text-sm transition ${
                        tipoOrden === "mesa"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                          : "bg-slate-800 hover:bg-slate-750 text-slate-400"
                      }`}
                    >
                      📋 Mesa
                    </button>
                  )}

                  {(config?.posModalidad?.includes("restaurante") || config?.posModalidad?.includes("mostrador")) && (
                    <button
                      onClick={() => {
                        setTipoOrden("para_llevar");
                        setMesaSeleccionada(null);
                      }}
                      className={`flex-1 py-3 rounded-2xl font-bold text-sm transition ${
                        tipoOrden === "para_llevar"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                          : "bg-slate-800 hover:bg-slate-750 text-slate-400"
                      }`}
                    >
                      🥡 Llevar
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Mesa details */}
            {tipoOrden === "mesa" && (
              <div className="animate-fadeIn space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Selecciona Mesa:</label>
                    <button
                      type="button"
                      onClick={() => setShowActiveOrdersModal(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                    >
                      📋 Ver todas las órdenes
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                    {mesas.map(mesa => {
                      const isSelected = mesaSeleccionada === mesa.id;
                      const tableOrders = activeOrders.filter(o => o.mesa_id === mesa.id && o.pos_status !== "facturado_finalizado");
                      const hasActiveOrder = tableOrders.length > 0;
                      return (
                        <button
                          key={mesa.id}
                          onClick={() => {
                            setMesaSeleccionada(mesa.id);
                            setClienteNombre("");
                            setEditingOrderId(null);
                            setEditingOrderNumero("");
                            setCarrito([]);
                            if (tableOrders.length > 0) {
                              setSelectedOrderIdForMesa(tableOrders[0].id);
                            } else {
                              setSelectedOrderIdForMesa(null);
                            }
                          }}
                          className={`py-3 rounded-xl font-bold text-xs transition border ${
                            isSelected
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-slate-850 border-slate-800 text-slate-300 hover:border-slate-700"
                          } ${hasActiveOrder ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : ""}`}
                        >
                          Mesa {mesa.numero}
                          {hasActiveOrder && (
                            <span className="block text-[9px] font-medium text-amber-400">
                              Ocupada ({tableOrders.length})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {mesaSeleccionada && (() => {
                  const selectedMesaObj = mesas.find(m => m.id === mesaSeleccionada);
                  const tableOrders = activeOrders.filter(o => o.mesa_id === mesaSeleccionada && o.pos_status !== "facturado_finalizado");
                  
                  return (
                    <div className="bg-slate-950/65 border border-slate-800 rounded-2xl p-4 space-y-4 animate-fadeIn">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <span className="text-sm font-bold text-slate-200">Mesa {selectedMesaObj?.numero}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewAccountName("");
                            setShowNewAccountModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-400 text-xs font-black rounded-lg transition"
                        >
                          ➕ Nueva Cuenta
                        </button>
                      </div>

                      {tableOrders.length > 0 ? (
                        <>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                            {tableOrders.map(o => {
                              const isSelected = selectedOrderIdForMesa === o.id;
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => setSelectedOrderIdForMesa(o.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                    isSelected
                                      ? "bg-blue-600 text-white shadow"
                                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                                  }`}
                                >
                                  👤 {o.cliente_nombre || "General"}
                                </button>
                              );
                            })}
                          </div>

                          {(() => {
                            const activeOrder = tableOrders.find(o => o.id === selectedOrderIdForMesa) || tableOrders[0];
                            if (!activeOrder) return null;

                            return (
                              <div className="space-y-3 pt-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-xs font-bold text-slate-400">Cliente: {activeOrder.cliente_nombre || "General"}</p>
                                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{activeOrder.numero_orden}</p>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                    activeOrder.pos_status === "enviada" ? "bg-blue-500/10 text-blue-400" :
                                    activeOrder.pos_status === "lista" ? "bg-green-500/10 text-green-400" :
                                    "bg-amber-500/10 text-amber-400"
                                  }`}>
                                    {activeOrder.pos_status}
                                  </span>
                                </div>

                                <div className="text-xs space-y-1.5 border-y border-slate-900/60 py-2 max-h-32 overflow-y-auto text-slate-400">
                                  {activeOrder.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{item.cantidad || 1}x {item.nombre}</span>
                                      <span className="font-mono text-slate-500">{config.currency} {((item.precio || 0) * (item.cantidad || 1)).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-400">Total Actual:</span>
                                  <span className="font-black text-sm text-blue-400">{config.currency} {activeOrder.total?.toFixed(2)}</span>
                                </div>

                                <div className="flex gap-2">
                                  {editingOrderId === activeOrder.id ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingOrderId(null);
                                        setEditingOrderNumero("");
                                        setCarrito([]);
                                      }}
                                      className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition-all text-center"
                                    >
                                      ✕ Cancelar
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingOrderId(activeOrder.id);
                                          setEditingOrderNumero(activeOrder.numero_orden);
                                          setCarrito([]);
                                          setToast({ message: "✓ Modo adición activado. Agrega productos al carrito y envíalos.", type: "success" });
                                        }}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all text-center"
                                      >
                                        ➕ Agregar items
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => startSplit(activeOrder)}
                                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all text-center"
                                      >
                                        🥞 Dividir
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="py-6 text-center text-slate-500 text-xs">
                          Mesa vacía. Agrega productos al carrito para crear la primera cuenta.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Para llevar inputs */}
            {tipoOrden === "para_llevar" && (
              <div className="animate-fadeIn">
                <input
                  type="text"
                  placeholder="Nombre del cliente..."
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none placeholder-slate-600"
                />
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20">
            {carrito.map((item, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-200 text-sm truncate">{item.nombre}</p>
                    {item.notas && <p className="text-xs text-amber-500 truncate mb-0.5">📝 {item.notas}</p>}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {config.currency} {item.precio.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-blue-400 whitespace-nowrap">
                    {config.currency} {(item.precio * item.quantity).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => actualizarCantidad(item.productId, item.notas, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 flex items-center justify-center font-bold text-slate-300 border border-slate-700/60"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => actualizarCantidad(item.productId, item.notas, parseInt(e.target.value) || 1)}
                    className="w-12 bg-slate-950 text-center rounded-lg py-1 border border-slate-850 text-sm"
                  />
                  <button
                    onClick={() => actualizarCantidad(item.productId, item.notas, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 flex items-center justify-center font-bold text-slate-300 border border-slate-700/60"
                  >
                    +
                  </button>

                  <input
                    type="text"
                    placeholder="Nota (sin cebolla...)"
                    value={item.notas}
                    onChange={(e) => {
                      setCarrito(carrito.map((c, i) => i === idx ? { ...c, notas: e.target.value } : c));
                    }}
                    className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 text-xs border border-slate-850 placeholder-slate-600 focus:outline-none"
                  />

                  <button
                    onClick={() => actualizarCantidad(item.productId, item.notas, 0)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center text-xs ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {carrito.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 py-16">
                <span className="text-5xl block mb-2">🛒</span>
                <p className="font-bold text-sm">Carrito vacío</p>
                <p className="text-xs">Agrega productos del catálogo</p>
              </div>
            )}
          </div>

          {/* Checkout Checkout Checkout */}
          <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-200">{config.currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black border-t border-slate-850 pt-2">
                <span>Total:</span>
                <span style={{ color: config.colorPrimary }}>{config.currency} {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method - Hide or show depending on mode */}
            {/* Auto-servicio or mostrador or delivery immediate needs payment options */}
            {(tipoOrden !== "mesa") && (
              <div className="space-y-3 animate-fadeIn">
                <div>
                  <label className="text-xs text-slate-500 font-bold block mb-1 uppercase tracking-wider">Método de pago:</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-850 text-sm font-semibold focus:outline-none text-slate-200"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="tarjeta">💳 Tarjeta</option>
                    <option value="transferencia">🏦 Transferencia</option>
                  </select>
                </div>

                {metodoPago === "efectivo" && (
                  <div className="animate-fadeIn">
                    <label className="text-xs text-slate-500 font-bold block mb-1 uppercase tracking-wider">Monto Recibido:</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-slate-200 placeholder-slate-600 focus:outline-none"
                    />
                    {cambio > 0 && (
                      <div className="mt-2 py-1 px-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 font-bold text-center text-xs">
                        Cambio a entregar: {config.currency} {cambio.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={editingOrderId ? agregarItemsAOrden : crearOrden}
              disabled={
                carrito.length === 0 ||
                (!editingOrderId && tipoOrden === "mesa" && !mesaSeleccionada) ||
                (!editingOrderId && tipoOrden === "para_llevar" && !clienteNombre.trim())
              }
              className="w-full py-4 rounded-2xl font-bold text-md shadow-lg transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
              style={{
                backgroundColor: config.colorPrimary,
                color: "white"
              }}
            >
              {editingOrderId 
                ? "🔥 ENVIAR NUEVOS PRODUCTOS" 
                : (tipoOrden === "mesa" ? "🔥 ENVIAR A COCINA" : "✓ CONFIRMAR Y PAGAR")}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {ordenConfirmada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-scaleUp">
            <span className="text-5xl block mb-4 filter drop-shadow-[0_8px_16px_rgba(34,197,94,0.2)]">✅</span>
            <h2 className="text-xl font-black mb-1">¡Orden registrada con éxito!</h2>
            <p className="text-xs text-slate-500 tracking-widest font-semibold uppercase mb-6">
              Orden #{ordenConfirmada.numeroOrden}
            </p>

            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-850 mb-6 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total a pagar:</span>
                <span className="font-bold text-slate-200" style={{ color: config.colorPrimary }}>
                  {config.currency} {ordenConfirmada.total?.toFixed(2)}
                </span>
              </div>
              {ordenConfirmada.cambio > 0 && (
                <div className="flex justify-between text-sm border-t border-slate-850 pt-2 text-green-400">
                  <span>Cambio entregado:</span>
                  <span className="font-extrabold">{config.currency} {ordenConfirmada.cambio?.toFixed(2)}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setOrdenConfirmada(null)}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-colors hover:opacity-90 active:scale-95"
              style={{ backgroundColor: config.colorPrimary }}
            >
              Nueva Orden
            </button>
          </div>
        </div>
      )}

      {/* View all Active Orders Modal */}
      {showActiveOrdersModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full flex flex-col max-h-[85vh] shadow-2xl animate-scaleUp">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-100">📋 Órdenes Activas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Todas las órdenes pendientes de finalizar en el POS</p>
              </div>
              <button
                onClick={() => setShowActiveOrdersModal(false)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <span className="text-4xl block mb-2">📋</span>
                  No hay órdenes activas registradas
                </div>
              ) : (
                activeOrders.map(order => (
                  <div
                    key={order.id}
                    className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:border-slate-700/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-200 text-sm">{order.numero_orden}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded capitalize">
                          {order.tipo_orden === "mesa" ? `Mesa ${order.mesa_numero || 'S/N'}` : order.tipo_orden}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          order.pos_status === "enviada" ? "bg-blue-500/10 text-blue-400" :
                          order.pos_status === "lista" ? "bg-green-500/10 text-green-400" :
                          "bg-amber-500/10 text-amber-400"
                        }`}>
                          {order.pos_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Cliente: {order.cliente_nombre || "Mostrador"} • Creada: {new Date(order.created_at?.endsWith('Z') ? order.created_at : (order.created_at + 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-1.5 max-h-16 overflow-y-auto pr-1 line-clamp-2">
                        {order.items?.map((it, idx) => `${it.cantidad}x ${it.nombre}`).join(", ")}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-900">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
                        <p className="text-sm font-black text-blue-400">{config.currency} {order.total?.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingOrderId(order.id);
                          setEditingOrderNumero(order.numero_orden);
                          setCarrito([]);
                          setTipoOrden(order.tipo_orden);
                          if (order.mesa_id) {
                            setMesaSeleccionada(order.mesa_id);
                          } else {
                            setMesaSeleccionada(null);
                          }
                          setShowActiveOrdersModal(false);
                          setToast({ message: "✓ Modo adición activado. Agrega productos al carrito y envíalos.", type: "success" });
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 whitespace-nowrap"
                      >
                        ➕ Agregar productos
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Cuenta en Mesa */}
      {showNewAccountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-100 mb-2">🆕 Nueva Cuenta</h3>
            <p className="text-xs text-slate-400 mb-4">Ingresa el nombre del cliente para identificar su cuenta en esta mesa.</p>
            
            <input
              type="text"
              placeholder="Nombre del cliente..."
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none placeholder-slate-600 text-slate-200 mb-4 text-sm font-semibold"
              autoFocus
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowNewAccountModal(false);
                  setNewAccountName("");
                }}
                className="px-4 py-2 border border-slate-850 rounded-xl text-slate-400 hover:bg-slate-800 transition text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalName = newAccountName.trim();
                  const defaultName = `Cuenta ${activeOrders.filter(o => o.mesa_id === mesaSeleccionada && o.pos_status !== "facturado_finalizado").length + 1}`;
                  setClienteNombre(finalName || defaultName);
                  setCarrito([]);
                  setEditingOrderId(null);
                  setEditingOrderNumero("");
                  setShowNewAccountModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-xs font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Personalizar Producto */}
      {customizingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scaleUp max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{customizingProduct.nombre}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Personaliza los ingredientes y opciones del platillo</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomizingProduct(null);
                  setCustomSelections({});
                  setExcludedGroups({});
                  setObservation("");
                }}
                className="text-slate-400 hover:text-white font-bold text-xl px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-2">
              {(customizingProduct.customization_options || []).map((group, idx) => {
                const isExcluded = !!excludedGroups[group.nombre];
                const hasOptions = group.opciones && group.opciones.length > 0;

                return (
                  <div key={idx} className="space-y-2 border-b border-slate-850 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-bold text-slate-300">{group.nombre}</h4>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs bg-slate-950/40 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 transition select-none">
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={(e) => {
                            setExcludedGroups({
                              ...excludedGroups,
                              [group.nombre]: !e.target.checked
                            });
                          }}
                          className="w-3.5 h-3.5 text-blue-600 rounded bg-slate-900 border-slate-800"
                        />
                        <span className={`font-bold ${!isExcluded ? "text-green-400" : "text-red-400"}`}>
                          {!isExcluded ? "Incluido" : "Eliminado"}
                        </span>
                      </label>
                    </div>

                    {isExcluded ? (
                      <div className="p-3 bg-red-950/10 border border-red-900/20 rounded-xl text-center animate-fadeIn">
                        <p className="text-xs font-bold text-red-400 line-through">
                          ❌ {group.nombre} (Excluido de la orden)
                        </p>
                      </div>
                    ) : hasOptions ? (
                      <div className="animate-fadeIn">
                        {group.tipo === "seleccion_unica" ? (
                          <div className="flex flex-col gap-2">
                            {(group.opciones || []).map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl bg-slate-950/45 border border-slate-850 hover:border-slate-800 transition">
                                <input
                                  type="radio"
                                  name={`group-${idx}`}
                                  checked={customSelections[group.nombre] === opt}
                                  onChange={() => {
                                    setCustomSelections({
                                      ...customSelections,
                                      [group.nombre]: opt
                                    });
                                  }}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-800"
                                />
                                <span className="text-xs text-slate-200">{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {(group.opciones || []).map((opt, oIdx) => {
                              const isChecked = !!(customSelections[group.nombre] && customSelections[group.nombre][opt]);
                              return (
                                <label 
                                  key={oIdx} 
                                  className={`flex items-center justify-between cursor-pointer p-2.5 rounded-xl border transition ${
                                    isChecked 
                                      ? "bg-slate-950/45 border-slate-850 hover:border-slate-800" 
                                      : "bg-red-950/15 border-red-900/30 text-slate-500 hover:border-red-900/40 shadow-inner"
                                  }`}
                                >
                                  <span className={`text-xs font-semibold ${isChecked ? "text-slate-200" : "line-through text-slate-500"}`}>
                                    {opt}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const currentGroup = customSelections[group.nombre] || {};
                                      setCustomSelections({
                                        ...customSelections,
                                        [group.nombre]: {
                                          ...currentGroup,
                                          [opt]: e.target.checked
                                        }
                                      });
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-slate-900 border-slate-800"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Observaciones Section */}
              <div className="space-y-2 border-t border-slate-850 pt-4 mt-2">
                <h4 className="text-sm font-bold text-slate-350 flex items-center gap-1.5">
                  <span>📝</span> Observaciones del Producto
                </h4>
                <textarea
                  placeholder="Ej: Bien tostado, huevos término medio, salsa aparte..."
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none placeholder-slate-650 text-xs text-slate-200 font-semibold"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-850 pt-4 mt-4">
              <button
                type="button"
                onClick={() => {
                  setCustomizingProduct(null);
                  setCustomSelections({});
                  setExcludedGroups({});
                  setObservation("");
                }}
                className="px-5 py-2.5 border border-slate-850 rounded-xl text-slate-400 hover:bg-slate-800 transition text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomization}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-xs font-bold"
              >
                Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dividir Cuenta / Mesa */}
      {showSplitModal && splitOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full shadow-2xl animate-scaleUp max-h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">🥞 Dividir Cuenta</h3>
                <p className="text-xs text-slate-400 mt-0.5">Divide los productos de la mesa en múltiples cuentas separadas</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSplitModal(false);
                  setSplitOrder(null);
                  setSplitAccounts([]);
                  setSplitQuantities({});
                }}
                className="text-slate-400 hover:text-white font-bold text-xl px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Split Distribution Main Columns */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pr-1 py-2">
              
              {/* Left Column: Original Items and Allocation (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Productos a distribuir</h4>
                  
                  <div className="space-y-3">
                    {splitOrder.items?.map((item, idx) => {
                      const qtyOriginal = splitQuantities[`${idx}-0`] || 0;
                      return (
                        <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-slate-205">{item.nombre}</p>
                              {item.notas && <p className="text-[10px] text-amber-405 font-medium">📝 {item.notas}</p>}
                            </div>
                            <span className="text-xs font-black text-slate-405">Total: {item.cantidad || 1}</span>
                          </div>

                          <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t border-slate-850/60 mt-1">
                            <span className="text-[10px] font-bold text-slate-450">Restante en Cuenta Principal:</span>
                            <span className="text-xs font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{qtyOriginal}</span>
                          </div>

                          {/* Distribution controls per secondary account */}
                          {splitAccounts.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-850/30 mt-1">
                              {splitAccounts.map((acc, aIdx) => {
                                const key = `${idx}-${acc.id}`;
                                const qtyAssigned = splitQuantities[key] || 0;
                                return (
                                  <div key={acc.id} className="flex justify-between items-center text-xs pl-2 border-l border-slate-800">
                                    <span className="text-slate-400 truncate max-w-[150px]">{acc.clienteNombre}:</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => moveQuantity(idx, acc.id, false)}
                                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-750 flex items-center justify-center font-bold text-slate-350"
                                      >
                                        −
                                      </button>
                                      <span className="font-extrabold w-6 text-center text-slate-200">{qtyAssigned}</span>
                                      <button
                                        type="button"
                                        onClick={() => moveQuantity(idx, acc.id, true)}
                                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-750 flex items-center justify-center font-bold text-slate-350"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Accounts list and configuration (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 flex flex-col h-full justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Nuevas Cuentas</h4>
                      <button
                        type="button"
                        onClick={addSplitAccount}
                        className="text-xs text-blue-400 hover:text-blue-300 font-bold"
                      >
                        ➕ Agregar Cuenta
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {splitAccounts.map((acc, aIdx) => (
                        <div key={acc.id} className="p-3 bg-slate-905 border border-slate-800 rounded-xl space-y-2 flex flex-col">
                          <div className="flex justify-between items-center gap-2">
                            <input
                              type="text"
                              value={acc.clienteNombre}
                              onChange={(e) => {
                                const updated = [...splitAccounts];
                                updated[aIdx].clienteNombre = e.target.value;
                                setSplitAccounts(updated);
                              }}
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-semibold focus:outline-none flex-1"
                              placeholder="Nombre del cliente..."
                            />
                            <button
                              type="button"
                              onClick={() => removeSplitAccount(acc.id)}
                              className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded"
                            >
                              Quitar
                            </button>
                          </div>
                          
                          {/* List of items assigned to this account */}
                          <div className="text-[11px] text-slate-500 pl-1 space-y-0.5 max-h-20 overflow-y-auto">
                            {splitOrder.items?.map((item, idx) => {
                              const qty = splitQuantities[`${idx}-${acc.id}`] || 0;
                              if (qty > 0) {
                                return (
                                  <div key={idx} className="flex justify-between">
                                    <span className="truncate max-w-[140px]">{item.nombre}</span>
                                    <span>x{qty}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      ))}
                      {splitAccounts.length === 0 && (
                        <div className="py-6 text-center text-slate-600 text-xs">
                          Haz clic en "+ Agregar Cuenta" para crear una cuenta secundaria.
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmSplit}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-[0.98]"
                  >
                    🥞 Confirmar División de Cuenta
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Container */}
      {toast.message && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all duration-300 z-50 ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
