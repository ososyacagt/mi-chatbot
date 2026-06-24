"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Toast from "@/app/admin/components/Toast";

const stripHTML = (html) => html?.replace(/<[^>]*>/g, '') || '';

const CheckoutStep = {
  CART: 'cart',
  CUSTOMER: 'customer',
  PAYMENT: 'payment',
  CONFIRMATION: 'confirmation',
};

export default function StorePage() {
  const params = useParams();
  const clientId = params.clientId;

  const [storeData, setStoreData] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [cartResult, setCartResult] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [checkoutStep, setCheckoutStep] = useState(CheckoutStep.CART);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const [customerForm, setCustomerForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    pais: "",
    notas: "",
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  useEffect(() => {
    loadStore();
  }, [clientId]);

  // Procesar carrito contra las reglas de negocio
  useEffect(() => {
    if (cart.length === 0) {
      setCartResult(null);
      return;
    }

    const processCart = async () => {
      try {
        const res = await fetch(`/api/store/${clientId}/cart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: item.quantity,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCartResult(data);
        } else {
          console.error("[cart] error procesando:", res.status);
        }
      } catch (err) {
        console.error("[cart] error:", err);
      }
    };

    processCart();
  }, [cart, clientId]);

  const loadStore = async () => {
    try {
      const res = await fetch(`/api/store/${clientId}`);
      if (!res.ok) throw new Error("Error loading store");
      const data = await res.json();
      setStoreData(data.tenant);
      setCategories(data.categories);
      setProducts(data.products);
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ Error al cargar la tienda", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    let filtered = products.filter((p) => p.stock > 0);

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query) ||
          stripHTML(p.descripcion || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const addToCart = (product) => {
    const cartItem = {
      productId: product.id,
      nombre: product.nombre,
      descripcion: product.descripcion,
      imagen: product.imagenes?.[0] || product.imagen || null,
      precio: product.precio,
      precioOriginal: product.precio_original,
      quantity: 1,
    };

    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      setCart([...cart, cartItem]);
    }

    setToast({
      message: `✓ ${product.nombre} agregado al carrito`,
      type: "success",
    });
  };

  const updateCartItemQuantity = (index, quantity) => {
    const newCart = [...cart];
    const item = newCart[index];
    const product = products.find((p) => p.id === item.productId);
    const maxQuantity = product?.stock || 0;

    if (quantity <= 0) {
      newCart.splice(index, 1);
    } else if (quantity > maxQuantity) {
      setToast({
        message: `✗ Stock disponible: ${maxQuantity}`,
        type: "error",
      });
      newCart[index].quantity = maxQuantity;
    } else {
      newCart[index].quantity = quantity;
    }
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleContinueCheckout = () => {
    if (!cartResult || cartResult.total <= 0) {
      setToast({ message: "✗ Carrito vacío", type: "error" });
      return;
    }
    setCheckoutStep(CheckoutStep.CUSTOMER);
  };

  const handleContinuePayment = (e) => {
    e.preventDefault();
    if (!customerForm.nombre || !customerForm.email || !customerForm.direccion) {
      setToast({ message: "✗ Completa los datos requeridos", type: "error" });
      return;
    }
    setCheckoutStep(CheckoutStep.PAYMENT);
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleConfirmOrder = async () => {
    if (!selectedPaymentMethod) {
      setToast({ message: "✗ Selecciona un método de pago", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      console.log('[tienda] Enviando orden:', JSON.stringify({
        items: cartResult?.cartItems || cart,
        clienteNombre: customerForm.nombre,
        clienteEmail: customerForm.email,
        clienteTelefono: customerForm.telefono,
        clienteDireccion: customerForm.direccion,
        clienteCiudad: customerForm.ciudad,
        clientePais: customerForm.pais,
        notas: customerForm.notas,
        metodoPago: selectedPaymentMethod
      }, null, 2));

      const orderRes = await fetch(`/api/store/${clientId}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartResult?.cartItems || cart,
          giftItems: cartResult?.giftItems || [],
          appliedRules: cartResult?.appliedRules || [],
          clienteNombre: customerForm.nombre,
          clienteEmail: customerForm.email,
          clienteTelefono: customerForm.telefono,
          clienteDireccion: customerForm.direccion,
          clienteCiudad: customerForm.ciudad,
          clientePais: customerForm.pais,
          notas: customerForm.notas,
          metodoPago: selectedPaymentMethod,
          subtotal: cartResult?.subtotal,
          descuentos: cartResult?.totalDiscount,
          total: cartResult?.total,
        }),
      });

      console.log('[tienda] Order response status:', orderRes.status);
      const errorData = await orderRes.json();
      console.log('[tienda] Order response data:', JSON.stringify(errorData));

      if (!orderRes.ok) {
        throw new Error(errorData.error || "Error creating order");
      }
      const orderData = errorData;

      setCreatedOrder(orderData.order);
      setCheckoutStep(CheckoutStep.CONFIRMATION);

      // Si es WhatsApp, también abrir wa.me
      if (selectedPaymentMethod === 'whatsapp') {
        const message = formatWhatsAppMessage(orderData.order, cartResult);
        const numero = storeData.whatsappNumber?.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
        setTimeout(() => window.open(whatsappUrl, "_blank"), 500);
      }
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ " + (err.message || "Error al procesar pedido"), type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueShopping = () => {
    setCart([]);
    setCartOpen(false);
    setCheckoutStep(CheckoutStep.CART);
    setCustomerForm({
      nombre: "",
      email: "",
      telefono: "",
      direccion: "",
      ciudad: "",
      pais: "",
      notas: "",
    });
    setSelectedPaymentMethod(null);
    setCreatedOrder(null);
  };

  const formatWhatsAppMessage = (order, cartData) => {
    const moneda = storeData.currency || 'Q';
    const itemsList = cartData.cartItems
      .map((item) => `• ${item.quantity}x ${item.nombre} - ${moneda} ${(item.precio * item.quantity).toFixed(2)}`)
      .join("\n");

    const giftsText = cartData.giftItems?.length
      ? cartData.giftItems.map((g) => `🎁 • ${g.nombre} (GRATIS)`).join("\n")
      : "";

    return `Hola! Quiero hacer el siguiente pedido:

📋 *Orden #${order.numero_orden}*

🛍️ *Productos:*
${itemsList}${giftsText ? "\n🎁 *Regalos:*\n" + giftsText : ""}

💰 *Subtotal:* ${moneda} ${cartData.subtotal.toFixed(2)}
${cartData.totalDiscount > 0 ? `🏷️ *Descuentos:* -${moneda} ${cartData.totalDiscount.toFixed(2)}\n` : ""}✅ *Total:* ${moneda} ${order.total.toFixed(2)}

👤 *Cliente:* ${order.cliente_nombre}
${order.cliente_direccion ? `📍 *Dirección:* ${order.cliente_direccion}\n` : ""}${order.notas ? `📝 *Notas:* ${order.notas}` : ""}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <div className="text-slate-600">Cargando tienda...</div>
        </div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-slate-600">Tienda no encontrada</div>
        </div>
      </div>
    );
  }

  if (storeData?.notConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6">🚧</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            {storeData.nombre || 'Tienda'}
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Esta tienda está en construcción
          </p>
          <p className="text-slate-500 mb-8">
            El administrador aún está configurando la tienda. Por favor, vuelve más tarde.
          </p>
        </div>
      </div>
    );
  }

  const filteredProducts = getFilteredProducts();
  const subtotal = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
  const primaryColor = storeData.colorPrimary || "#3b82f6";
  const moneda = storeData.currency || 'Q';

  return (
    <div className="min-h-screen bg-white">
      {/* TOPBAR */}
      <div className="bg-slate-900 text-white py-3 px-4 text-center text-sm flex items-center justify-center gap-2">
        <div className="relative w-2 h-2">
          <div className="absolute inset-0 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>
        {storeData?.topbarMessage || '📦 Bienvenido a nuestra tienda'}
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {storeData?.storeLogo ? (
              <img
                src={storeData.storeLogo}
                alt="Logo"
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {storeData?.nombre?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="font-bold text-slate-900">{storeData?.nombre}</h1>
            </div>
          </div>

          {/* Search - hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setSelectedCategory("all");
              }}
              className="w-full px-4 py-2 rounded-full border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3">
            {storeData?.whatsappNumber && (
              <a
                href={`https://wa.me/${storeData.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-slate-100 rounded-lg transition"
                title="WhatsApp"
              >
                💬
              </a>
            )}
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="relative p-2 hover:bg-slate-100 rounded-lg transition"
            >
              🛒
              {cart.length > 0 && (
                <span
                  className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden px-4 pb-3">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) setSelectedCategory("all");
            }}
            className="w-full px-4 py-2 rounded-full border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </nav>

      {/* HERO SECTION */}
      <div
        className="relative h-64 sm:h-80 flex items-center justify-center text-white overflow-hidden"
        style={{
          backgroundColor: primaryColor,
          backgroundImage: storeData?.storeBanner ? `url(${storeData.storeBanner})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {storeData?.storeBanner && (
          <div className="absolute inset-0 bg-black opacity-40"></div>
        )}
        <div className="relative text-center px-4">
          <div className="inline-block mb-3 px-3 py-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            EN LÍNEA
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">{storeData?.nombre}</h1>
          <p className="text-lg opacity-90">Compra en línea, entrega rápida</p>
        </div>
      </div>

      {/* TRUST STRIP */}
      <div className="bg-slate-50 border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">📦</div>
            <div className="text-xs text-slate-600">Productos</div>
            <div className="font-bold text-slate-900">{products.length}</div>
          </div>
          <div>
            <div className="text-2xl mb-1">✅</div>
            <div className="text-xs text-slate-600">Garantía</div>
            <div className="font-bold text-slate-900">100%</div>
          </div>
          <div>
            <div className="text-2xl mb-1">🚚</div>
            <div className="text-xs text-slate-600">Entrega</div>
            <div className="font-bold text-slate-900">Rápida</div>
          </div>
          <div>
            <div className="text-2xl mb-1">💬</div>
            <div className="text-xs text-slate-600">Soporte</div>
            <div className="font-bold text-slate-900">24/7</div>
          </div>
        </div>
      </div>

      {/* CATEGORIES TABS */}
      <div className="sticky top-[140px] z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto overflow-x-auto flex gap-2 px-4 py-3">
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition ${
              selectedCategory === "all"
                ? "text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            style={{
              backgroundColor: selectedCategory === "all" ? primaryColor : undefined,
            }}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSearchQuery("");
              }}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              style={{
                backgroundColor: selectedCategory === cat.id ? primaryColor : undefined,
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {searchQuery && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-slate-600">
              Resultados para "<strong>{searchQuery}</strong>" ({filteredProducts.length})
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-slate-600 mb-4">
              {searchQuery
                ? `No encontramos productos para "${searchQuery}"`
                : "No hay productos disponibles"}
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Ver todos los productos
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
            {filteredProducts.map((product) => {
              const discount = product.precio_original
                ? Math.round(
                    ((product.precio_original - product.precio) /
                      product.precio_original) *
                      100
                  )
                : 0;

              return (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex flex-col h-full"
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square bg-slate-100 overflow-hidden">
                    {product.imagenes?.[0] ? (
                      <img
                        src={product.imagenes[0]}
                        alt={product.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        📦
                      </div>
                    )}

                    {/* Badges */}
                    {product.destacado && (
                      <div className="absolute top-2 left-2 bg-yellow-400 text-slate-900 px-2 py-1 rounded-full text-xs font-bold">
                        ⭐ DESTACADO
                      </div>
                    )}
                    {product.stock <= 3 && product.stock > 0 && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        ⚡ ÚLTIMAS UNIDADES
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black opacity-40 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">AGOTADO</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="absolute bottom-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        {discount}% OFF
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {/* Main Content */}
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 line-clamp-2 mb-2">
                        {product.nombre}
                      </h3>

                      <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                        {stripHTML(product.descripcion || "").substring(0, 60)}
                        {stripHTML(product.descripcion || "").length > 60 ? "..." : ""}
                      </p>

                      {/* Price */}
                      <div className="mb-4">
                        {product.precio_original && product.precio < product.precio_original ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 line-through">
                              {moneda} {product.precio_original.toFixed(2)}
                            </span>
                            <span className="text-lg font-bold text-slate-900">
                              {moneda} {product.precio.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-slate-900">
                            {moneda} {product.precio.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Button - Always at bottom */}
                    <div className="mt-auto">
                      {product.stock > 0 ? (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-full py-2 rounded-lg font-semibold text-white transition hover:opacity-90 active:scale-95"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Agregar al carrito
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 rounded-lg font-semibold text-slate-500 bg-slate-100 cursor-not-allowed"
                        >
                          Sin stock
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CART SIDEBAR */}
      {cartOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setCartOpen(false)}
          ></div>

          <div className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-white z-50 shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold">
                {checkoutStep === CheckoutStep.CART ? '🛒 Tu pedido' :
                 checkoutStep === CheckoutStep.CUSTOMER ? '👤 Datos' :
                 checkoutStep === CheckoutStep.PAYMENT ? '💳 Pago' :
                 '✅ Confirmación'}
              </h2>
              <button
                onClick={() => {
                  if (checkoutStep === CheckoutStep.CONFIRMATION) {
                    handleContinueShopping();
                  } else {
                    setCartOpen(false);
                  }
                }}
                className="text-slate-500 hover:text-slate-900 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Progress indicator */}
            {checkoutStep !== CheckoutStep.CONFIRMATION && (
              <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-2">
                  {[CheckoutStep.CART, CheckoutStep.CUSTOMER, CheckoutStep.PAYMENT].map((step, idx) => (
                    <div key={step} className="flex-1 flex items-center">
                      <div className={`h-2 flex-1 rounded-full ${
                        checkoutStep === step ? 'bg-blue-500' :
                        [CheckoutStep.CART, CheckoutStep.CUSTOMER, CheckoutStep.PAYMENT].indexOf(checkoutStep) > idx ? 'bg-green-500' :
                        'bg-slate-200'
                      }`}></div>
                      {idx < 2 && <div className="w-2"></div>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-2">
                  <span className={checkoutStep === CheckoutStep.CART || [CheckoutStep.CUSTOMER, CheckoutStep.PAYMENT].indexOf(checkoutStep) > 0 ? 'font-bold text-slate-900' : ''}>Carrito</span>
                  <span className={checkoutStep === CheckoutStep.CUSTOMER || CheckoutStep.PAYMENT === checkoutStep ? 'font-bold text-slate-900' : ''}>Datos</span>
                  <span className={checkoutStep === CheckoutStep.PAYMENT ? 'font-bold text-slate-900' : ''}>Pago</span>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* CART STEP */}
              {checkoutStep === CheckoutStep.CART && (
                <>
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-4xl mb-2">🛒</div>
                      <p>Tu carrito está vacío</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item, idx) => (
                        <div key={idx} className="flex gap-3 pb-4 border-b border-slate-200">
                          <img
                            src={item.imagen || "https://via.placeholder.com/60"}
                            alt={item.nombre}
                            className="w-16 h-16 rounded object-cover bg-slate-100"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-slate-900">
                              {item.nombre}
                            </h4>
                            <p className="text-sm text-slate-600">
                              {moneda} {item.precio.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => updateCartItemQuantity(idx, item.quantity - 1)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartItemQuantity(idx, item.quantity + 1)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeFromCart(idx)}
                                className="ml-auto text-red-500 hover:text-red-700 text-sm font-semibold"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* CUSTOMER STEP */}
              {checkoutStep === CheckoutStep.CUSTOMER && (
                <form onSubmit={handleContinuePayment} className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerForm.nombre}
                      onChange={(e) => setCustomerForm({ ...customerForm, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={customerForm.telefono}
                      onChange={(e) => setCustomerForm({ ...customerForm, telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+502 7000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Dirección de entrega *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerForm.direccion}
                      onChange={(e) => setCustomerForm({ ...customerForm, direccion: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tu dirección"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-1">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={customerForm.ciudad}
                        onChange={(e) => setCustomerForm({ ...customerForm, ciudad: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ciudad"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-1">
                        País
                      </label>
                      <input
                        type="text"
                        value={customerForm.pais}
                        onChange={(e) => setCustomerForm({ ...customerForm, pais: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="País"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Notas del pedido
                    </label>
                    <textarea
                      value={customerForm.notas}
                      onChange={(e) => setCustomerForm({ ...customerForm, notas: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Instrucciones especiales..."
                      rows="2"
                    ></textarea>
                  </div>

                  <div className="pt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep(CheckoutStep.CART)}
                      className="w-full py-2 border border-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition"
                    >
                      ← Volver
                    </button>
                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                      Continuar al pago →
                    </button>
                  </div>
                </form>
              )}

              {/* PAYMENT STEP */}
              {checkoutStep === CheckoutStep.PAYMENT && storeData && (
                <div className="space-y-3">
                  {storeData.paymentMethods?.includes('whatsapp') && (
                    <button
                      onClick={() => handlePaymentMethodSelect('whatsapp')}
                      className={`w-full p-4 rounded-lg border-2 transition text-left ${
                        selectedPaymentMethod === 'whatsapp'
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-green-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">📱 Confirmar por WhatsApp</div>
                      <div className="text-sm text-slate-600">Coordina el pago con nuestro equipo</div>
                    </button>
                  )}

                  {storeData.paymentMethods?.includes('efectivo') && (
                    <button
                      onClick={() => handlePaymentMethodSelect('efectivo')}
                      className={`w-full p-4 rounded-lg border-2 transition text-left ${
                        selectedPaymentMethod === 'efectivo'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">💵 Efectivo contra entrega</div>
                      <div className="text-sm text-slate-600">Paga al recibir tu pedido</div>
                    </button>
                  )}

                  {storeData.paymentMethods?.includes('transferencia') && (
                    <button
                      onClick={() => handlePaymentMethodSelect('transferencia')}
                      className={`w-full p-4 rounded-lg border-2 transition text-left ${
                        selectedPaymentMethod === 'transferencia'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">🏦 Transferencia bancaria</div>
                      <div className="text-sm text-slate-600">Te enviaremos los datos bancarios</div>
                    </button>
                  )}

                  {storeData.paymentMethods?.includes('stripe') && (
                    <button
                      onClick={() => handlePaymentMethodSelect('stripe')}
                      className={`w-full p-4 rounded-lg border-2 transition text-left ${
                        selectedPaymentMethod === 'stripe'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">💳 Tarjeta de crédito/débito</div>
                      <div className="text-sm text-slate-600">Pago seguro con Stripe</div>
                    </button>
                  )}

                  <div className="pt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep(CheckoutStep.CUSTOMER)}
                      className="w-full py-2 border border-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={handleConfirmOrder}
                      disabled={!selectedPaymentMethod || submitting}
                      className="w-full py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {submitting ? "Procesando..." : "Confirmar pedido"}
                    </button>
                  </div>
                </div>
              )}

              {/* CONFIRMATION STEP */}
              {checkoutStep === CheckoutStep.CONFIRMATION && createdOrder && (
                <div className="text-center space-y-4 py-4">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    ¡Pedido #{createdOrder.numero_orden} confirmado!
                  </h3>

                  {/* Resumen del pedido */}
                  <div className="text-left bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Cliente:</span>
                      <span className="font-semibold">{createdOrder.cliente_nombre}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Email:</span>
                      <span className="font-semibold text-sm">{createdOrder.cliente_email}</span>
                    </div>
                    {createdOrder.cliente_telefono && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Teléfono:</span>
                        <span className="font-semibold">{createdOrder.cliente_telefono}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-semibold">{moneda} {cartResult?.subtotal?.toFixed(2)}</span>
                    </div>
                    {cartResult?.totalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descuentos:</span>
                        <span className="font-semibold">-{moneda} {cartResult.totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg pt-2 border-t border-slate-200">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold" style={{ color: primaryColor }}>{moneda} {cartResult?.total?.toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm">
                    Hemos registrado tu pedido. Te contactaremos pronto.
                  </p>

                  <div className="pt-4 space-y-2">
                    {storeData?.whatsappNumber && (
                      <a
                        href={`https://wa.me/${storeData.whatsappNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition block text-center"
                      >
                        💬 Chatear con nosotros
                      </a>
                    )}
                    <button
                      onClick={handleContinueShopping}
                      className="w-full py-2 border border-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-100 transition"
                    >
                      Seguir comprando
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer summary - only on cart step */}
            {checkoutStep === CheckoutStep.CART && cart.length > 0 && cartResult && (
              <>
                <div className="border-t border-slate-200 p-6 space-y-4">
                  {/* Regalos incluidos */}
                  {cartResult?.giftItems?.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="font-semibold text-green-700 text-sm mb-2">
                        🎁 Regalos incluidos:
                      </p>
                      {cartResult.giftItems.map((gift, i) => (
                        <div key={i} className="flex justify-between text-sm text-green-600 mb-1">
                          <span>{gift.nombre}</span>
                          <span className="font-bold">¡GRATIS!</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Descuentos aplicados */}
                  {cartResult?.appliedRules?.filter((r) => r.ahorro > 0).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-semibold text-blue-700 text-sm mb-2">
                        🏷️ Descuentos aplicados:
                      </p>
                      {cartResult.appliedRules
                        .filter((r) => r.ahorro > 0)
                        .map((rule, i) => (
                          <div key={i} className="flex justify-between text-sm text-blue-600 mb-1">
                            <span>{rule.descripcion}</span>
                            <span>-{moneda}{rule.ahorro.toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Resumen de totales */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-semibold">
                        {moneda} {cartResult?.subtotal?.toFixed(2) || subtotal.toFixed(2)}
                      </span>
                    </div>
                    {cartResult?.totalDiscount > 0 && (
                      <div className="flex justify-between mb-2 text-green-600">
                        <span className="text-slate-600">Descuentos:</span>
                        <span className="font-semibold">
                          -{moneda}{cartResult.totalDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg border-t border-blue-200 pt-2">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold" style={{ color: primaryColor }}>
                        {moneda} {(cartResult?.total || subtotal).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleContinueCheckout}
                    className="w-full py-3 font-bold rounded-lg text-white transition hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Continuar al checkout →
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="font-bold text-lg mb-2">{storeData?.nombre}</h3>
          {storeData?.whatsappNumber && (
            <a
              href={`https://wa.me/${storeData.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 text-sm block mb-4"
            >
              💬 {storeData.whatsappNumber}
            </a>
          )}
          <p className="text-slate-400 text-sm">
            © 2026 {storeData?.nombre}. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Toast */}
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
      )}
    </div>
  );
}
