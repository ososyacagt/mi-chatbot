"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

export default function POSPage() {
  const params = useParams();
  const clientId = params.clientId;

  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tipoOrden, setTipoOrden] = useState("mostrador"); // mostrador, mesa, para_llevar
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [ordenConfirmada, setOrdenConfirmada] = useState(null);

  useEffect(() => {
    loadPOSConfig();
  }, [clientId]);

  const loadPOSConfig = async () => {
    try {
      const res = await fetch(`/api/pos/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setAreas(data.areas);
        setMesas(data.mesas);
        setProducts(data.products);
      }
    } catch (err) {
      console.error("[POS] Error cargando configuración:", err);
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = (producto) => {
    const existente = carrito.find(item => item.productId === producto.id);
    if (existente) {
      setCarrito(carrito.map(item =>
        item.productId === producto.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        productId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        quantity: 1,
        notas: ""
      }]);
    }
  };

  const actualizarCantidad = (productId, cantidad) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(item => item.productId !== productId));
    } else {
      setCarrito(carrito.map(item =>
        item.productId === productId
          ? { ...item, quantity: cantidad }
          : item
      ));
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
          mesaNum: tipoOrden === "mesa" ? mesas.find(m => m.id === mesaSeleccionada)?.numero : null,
          clienteNombre: tipoOrden === "para_llevar" ? clienteNombre : null,
          items: carrito,
          subtotal,
          total,
          metodoPago
        })
      });

      if (res.ok) {
        const orderData = await res.json();

        // Calcular cambio
        const cambio = metodoPago === "efectivo" && montoRecibido > total
          ? montoRecibido - total
          : 0;

        // Mostrar pantalla de confirmación
        setOrdenConfirmada({
          ...orderData.order,
          cambio
        });

        // Limpiar carrito
        setCarrito([]);
        setClienteNombre("");
        setMesaSeleccionada(null);
        setMontoRecibido("");
        setTipoOrden("mostrador");
      }
    } catch (err) {
      console.error("[POS] Error creando orden:", err);
      // Mostrar error en UI (implementar después)
    }
  };

  if (loading || !config) {
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

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Panel izquierdo - Catálogo (60%) */}
      <div className="w-3/5 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 p-4 border-b border-slate-700">
          <h1 className="text-2xl font-bold mb-3">{config.storeName} - POS</h1>
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-700 text-white placeholder-slate-400 border border-slate-600"
          />
        </div>

        {/* Categorías */}
        <div className="bg-slate-800 px-4 py-2 flex gap-2 overflow-x-auto border-b border-slate-700">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-3 py-1 rounded whitespace-nowrap ${
              categoryFilter === ""
                ? "bg-blue-600"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded whitespace-nowrap ${
                categoryFilter === cat.id
                  ? "bg-blue-600"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              {cat.emoji} {cat.nombre}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => agregarAlCarrito(product)}
              className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg border border-slate-600 hover:border-blue-500 transition text-left"
            >
              {product.imagenes?.[0] && (
                <img
                  src={product.imagenes[0]}
                  alt={product.nombre}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              <div className="font-bold text-sm">{product.nombre}</div>
              <div className="text-lg font-bold" style={{ color: config.colorPrimary }}>
                {config.currency} {product.precio.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel derecho - Orden (40%) */}
      <div className="w-2/5 bg-slate-800 flex flex-col">
        {/* Tipo de orden */}
        <div className="p-4 border-b border-slate-700 space-y-3">
          <div className="flex gap-2">
            {/* Mostrador - siempre visible si pos_modalidad incluye 'mostrador' */}
            {config?.posModalidad?.includes('mostrador') && (
              <button
                onClick={() => {
                  setTipoOrden("mostrador");
                  setMesaSeleccionada(null);
                  setClienteNombre("");
                }}
                className={`flex-1 py-2 rounded font-bold ${
                  tipoOrden === "mostrador"
                    ? "bg-blue-600"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                🏪 Mostrador
              </button>
            )}

            {/* Mesa - visible si pos_modalidad incluye 'restaurante' */}
            {config?.posModalidad?.includes('restaurante') && (
              <button
                onClick={() => {
                  setTipoOrden("mesa");
                  setClienteNombre("");
                }}
                className={`flex-1 py-2 rounded font-bold ${
                  tipoOrden === "mesa"
                    ? "bg-blue-600"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                📋 Mesa
              </button>
            )}

            {/* Para llevar - visible si pos_modalidad incluye 'restaurante' o 'mostrador' */}
            {(config?.posModalidad?.includes('restaurante') || config?.posModalidad?.includes('mostrador')) && (
              <button
                onClick={() => {
                  setTipoOrden("para_llevar");
                  setMesaSeleccionada(null);
                }}
                className={`flex-1 py-2 rounded font-bold ${
                  tipoOrden === "para_llevar"
                    ? "bg-blue-600"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                🥡 Llevar
              </button>
            )}

            {/* Auto-servicio - visible si pos_modalidad incluye 'autoservicio' */}
            {config?.posModalidad?.includes('autoservicio') && (
              <button
                onClick={() => {
                  setTipoOrden("autoservicio");
                  setMesaSeleccionada(null);
                  setClienteNombre("");
                }}
                className={`flex-1 py-2 rounded font-bold ${
                  tipoOrden === "autoservicio"
                    ? "bg-blue-600"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                🤖 Auto-servicio
              </button>
            )}
          </div>

          {/* Selector de mesa */}
          {tipoOrden === "mesa" && (
            <div>
              <label className="text-sm text-slate-300 block mb-2">Selecciona mesa:</label>
              <div className="grid grid-cols-4 gap-2">
                {mesas.map(mesa => (
                  <button
                    key={mesa.id}
                    onClick={() => setMesaSeleccionada(mesa.id)}
                    className={`py-2 rounded font-bold text-sm ${
                      mesaSeleccionada === mesa.id
                        ? "bg-blue-600"
                        : "bg-slate-700 hover:bg-slate-600"
                    } ${mesa.estado === "ocupada" ? "opacity-50" : ""}`}
                  >
                    Mesa {mesa.numero}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input nombre cliente */}
          {tipoOrden === "para_llevar" && (
            <input
              type="text"
              placeholder="Nombre del cliente..."
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 text-white placeholder-slate-400 border border-slate-600"
            />
          )}
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {carrito.map((item, idx) => (
            <div key={idx} className="bg-slate-700 p-3 rounded">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="font-bold">{item.nombre}</div>
                  <div className="text-sm text-slate-300">
                    {config.currency} {item.precio.toFixed(2)} x {item.quantity}
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-400">
                  {config.currency} {(item.precio * item.quantity).toFixed(2)}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => actualizarCantidad(item.productId, item.quantity - 1)}
                  className="bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded"
                >
                  −
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => actualizarCantidad(item.productId, parseInt(e.target.value) || 1)}
                  className="w-12 bg-slate-600 text-center rounded py-1"
                />
                <button
                  onClick={() => actualizarCantidad(item.productId, item.quantity + 1)}
                  className="bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded"
                >
                  +
                </button>
                <button
                  onClick={() => actualizarCantidad(item.productId, 0)}
                  className="ml-auto bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="bg-slate-700 p-4 border-t border-slate-600 space-y-3">
          <div className="flex justify-between text-lg">
            <span>Subtotal:</span>
            <span className="font-bold">{config.currency} {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold border-t border-slate-600 pt-3">
            <span>Total:</span>
            <span style={{ color: config.colorPrimary }}>{config.currency} {total.toFixed(2)}</span>
          </div>

          {/* Método de pago */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Método de pago:</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-600 text-white border border-slate-500"
            >
              <option value="efectivo">💵 Efectivo</option>
              <option value="tarjeta">💳 Tarjeta</option>
              <option value="transferencia">🏦 Transferencia</option>
            </select>
          </div>

          {/* Efectivo - cambio */}
          {metodoPago === "efectivo" && (
            <div>
              <label className="text-sm text-slate-300 block mb-2">Monto recibido:</label>
              <input
                type="number"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded bg-slate-600 text-white placeholder-slate-400 border border-slate-500"
              />
              {cambio > 0 && (
                <div className="mt-2 text-green-400 text-center font-bold">
                  Cambio: {config.currency} {cambio.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Botón crear orden */}
          <button
            onClick={crearOrden}
            disabled={carrito.length === 0 || (tipoOrden === "mesa" && !mesaSeleccionada) || (tipoOrden === "para_llevar" && !clienteNombre.trim())}
            className="w-full py-4 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            style={{
              backgroundColor: config.colorPrimary,
              color: "white"
            }}
          >
            ✓ ENVIAR ORDEN
          </button>
        </div>
      </div>

      {/* Pantalla de confirmación de orden */}
      {ordenConfirmada && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2 text-black dark:text-white">
              ¡Orden creada!
            </h2>
            <p className="text-zinc-500 mb-1">
              #{ordenConfirmada.numeroOrden}
            </p>
            <p className="text-3xl font-bold mb-6 text-black dark:text-white"
              style={{ color: config?.colorPrimary }}>
              {config?.currency} {ordenConfirmada.total?.toFixed(2)}
            </p>
            {ordenConfirmada.cambio > 0 && (
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 mb-4">
                <p className="text-green-700 dark:text-green-300 font-semibold">
                  Cambio: {config?.currency} {ordenConfirmada.cambio?.toFixed(2)}
                </p>
              </div>
            )}
            <button
              onClick={() => setOrdenConfirmada(null)}
              className="w-full py-3 rounded-xl text-white font-bold text-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: config?.colorPrimary }}
            >
              Nueva orden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
