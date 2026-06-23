"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Toast from "@/app/admin/components/Toast";

export default function CatalogPage() {
  const params = useParams();
  const clientId = params.clientId;

  const [storeData, setStoreData] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  useEffect(() => {
    loadStore();
  }, [clientId]);

  const loadStore = async () => {
    try {
      const res = await fetch(`/api/store/${clientId}`);
      if (!res.ok) throw new Error("Error loading store");

      const data = await res.json();
      setStoreData(data.tenant);
      setCategories(data.categories);
      setProducts(data.products);
      setSelectedCategory(data.categories[0]?.id);
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ Error al cargar la tienda", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    let filtered = products;

    // Filtrar solo productos con stock > 0
    filtered = filtered.filter((p) => p.stock > 0);

    if (selectedCategory && !searchQuery) {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query) ||
          p.descripcion?.toLowerCase().includes(query)
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
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
  };

  const handleOrderSubmit = async (clienteNombre, clienteTelefono, clienteDireccion, notas) => {
    if (!clienteNombre || !cart.length) {
      setToast({ message: "✗ Completa el formulario y agrega productos", type: "error" });
      return;
    }

    try {
      const cartRes = await fetch(`/api/store/${clientId}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });

      if (!cartRes.ok) {
        const errorData = await cartRes.json();
        throw new Error(errorData.error || "Error processing cart");
      }
      const cartData = await cartRes.json();

      const orderRes = await fetch(`/api/store/${clientId}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          clienteNombre,
          clienteTelefono,
          clienteDireccion,
          notas,
          subtotal: cartData.subtotal,
          descuentos: cartData.totalDiscount,
          total: cartData.total,
        }),
      });

      if (!orderRes.ok) throw new Error("Error creating order");
      const orderData = await orderRes.json();

      const message = formatWhatsAppMessage(
        orderData.order,
        cartData,
        clienteNombre
      );
      const whatsappUrl = `https://wa.me/${storeData.whatsappNumber}?text=${encodeURIComponent(
        message
      )}`;

      window.open(whatsappUrl, "_blank");
      setCart([]);
      setCartOpen(false);
    } catch (err) {
      console.error("Error:", err);
      setToast({ message: "✗ " + (err.message || "Error al procesar pedido"), type: "error" });
    }
  };

  const formatWhatsAppMessage = (order, cartData, clienteName) => {
    const moneda = storeData.currency || 'Q';
    const itemsList = cartData.cartItems
      .map(
        (item) =>
          `• ${item.quantity}x ${item.nombre}${
            item.variantInfo ? ` (${item.variantInfo.valor})` : ""
          } - ${moneda} ${(item.precio * item.quantity).toFixed(2)}`
      )
      .join("\n");

    const giftsText = cartData.giftItems.length
      ? cartData.giftItems.map((g) => `🎁 • ${g.nombre} (GRATIS)`).join("\n")
      : "";

    return `Hola! Quiero hacer el siguiente pedido:

📋 *Orden #${order.numero_orden}*

🛍️ *Productos:*
${itemsList}${giftsText ? "\n" + giftsText : ""}

💰 *Subtotal:* ${moneda} ${cartData.subtotal.toFixed(2)}
${cartData.totalDiscount > 0 ? `🏷️ *Descuentos:* -${moneda} ${cartData.totalDiscount.toFixed(2)}\n` : ""}✅ *Total:* ${moneda} ${cartData.total.toFixed(2)}

👤 *Cliente:* ${order.cliente_nombre}
${order.cliente_direccion ? `📍 *Dirección:* ${order.cliente_direccion}\n` : ""}${order.notas ? `📝 *Notas:* ${order.notas}` : ""}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-600">Cargando tienda...</div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-600">Tienda no encontrada</div>
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
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              ℹ️ Modo e-commerce: <span className="font-semibold">{storeData.ecommerceMode || 'No configurado'}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredProducts = getFilteredProducts();

  return (
    <div className="min-h-screen bg-white">
      {/* Topbar */}
      <div className="bg-slate-100 border-b border-slate-200 py-3 px-4 text-center text-sm text-slate-700">
        {storeData?.topbarMessage || '📦 Bienvenido a nuestra tienda'}
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-slate-900">
            {storeData.storeLogo ? (
              <img src={storeData.storeLogo} alt="Logo" className="h-8 w-auto" />
            ) : (
              storeData.nombre
            )}
          </div>

          <div className="flex-1 mx-8">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setSelectedCategory(null);
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`https://wa.me/${storeData.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700 font-bold text-lg"
            >
              💬
            </a>

            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="relative p-2 text-slate-600 hover:text-slate-900"
            >
              🛒
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      {storeData.storeBanner && (
        <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${storeData.storeBanner})` }} />
      )}

      {/* Categorías */}
      <div className="sticky top-16 z-30 bg-white border-b border-slate-200 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex gap-4 py-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSearchQuery("");
              }}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat.emoji} {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Productos Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {searchQuery
                ? `Sin resultados para "${searchQuery}"`
                : "No hay productos en esta categoría"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                moneda={storeData.moneda}
                onAddToCart={addToCart}
                inCart={cart.some((item) => item.productId === product.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Carrito Lateral */}
      {cartOpen && (
        <CartSidebar
          cart={cart}
          storeData={storeData}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={updateCartItemQuantity}
          onRemove={removeFromCart}
          onSubmitOrder={handleOrderSubmit}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
}

function ProductCard({ product, moneda, onAddToCart, inCart }) {
  // La imagen se guarda como array en la DB (campo `imagenes`)
  const imagenUrl = product.imagenes?.[0] || product.imagen || null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagen */}
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {imagenUrl ? (
          <img
            src={imagenUrl}
            alt={product.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
            📦
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.stock < 5 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              Stock Bajo
            </span>
          )}
          {product.destacado && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
              Destacado
            </span>
          )}
          {product.precio_original && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
              Oferta
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <h3 className="font-bold text-slate-900 line-clamp-2 text-sm">
          {product.nombre}
        </h3>

        {/* Descripción: renderizar como HTML porque viene del editor de texto rico */}
        <div
          className="text-slate-600 text-xs line-clamp-3 mt-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_b]:font-bold [&_i]:italic [&_u]:underline"
          dangerouslySetInnerHTML={{ __html: product.descripcion || '' }}
        />

        {/* Precio */}
        <div className="mt-3 flex items-center gap-2">
          {product.precio_original ? (
            <>
              <span className="text-slate-400 line-through text-xs">
                {moneda} {product.precio_original.toFixed(2)}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {moneda} {product.precio.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-slate-900">
              {moneda} {product.precio.toFixed(2)}
            </span>
          )}
        </div>

        {/* Botón Agregar al Carrito */}
        <button
          onClick={() => onAddToCart(product)}
          className={`w-full mt-3 py-2 rounded-lg font-bold text-sm transition-all ${
            inCart
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {inCart ? "✓ En carrito" : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}

function CartSidebar({
  cart,
  storeData,
  onClose,
  onUpdateQuantity,
  onRemove,
  onSubmitOrder,
}) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      alert("Por favor ingresa tu nombre");
      return;
    }

    setSubmitting(true);
    await onSubmitOrder(clientName, clientPhone, clientAddress, notes);
    setSubmitting(false);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-full md:w-96 bg-white shadow-lg z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Carrito</h2>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Tu carrito está vacío</p>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3">
                {item.imagen && (
                  <img
                    src={item.imagen}
                    alt={item.nombre}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <h4 className="font-bold text-sm text-slate-900">{item.nombre}</h4>
                {item.variantInfo && (
                  <p className="text-xs text-slate-600">
                    {item.variantInfo.nombre}: {item.variantInfo.valor}
                  </p>
                )}
                <p className="text-sm font-bold mt-1">
                  {storeData.moneda} {(item.precio * item.quantity).toFixed(2)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                    className="px-2 py-1 bg-slate-200 rounded text-sm"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                    className="px-2 py-1 bg-slate-200 rounded text-sm"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onRemove(idx)}
                    className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <>
            {/* Totales */}
            <div className="border-t border-slate-200 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-bold">
                  {storeData.moneda} {subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Formulario */}
            <div className="p-4 space-y-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tu nombre *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Ciudad de Guatemala"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas (ej: Sin picante)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 transition-all"
              >
                {submitting ? "Procesando..." : "💬 Enviar por WhatsApp"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
