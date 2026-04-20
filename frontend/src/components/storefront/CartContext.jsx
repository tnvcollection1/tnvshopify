import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

const STORAGE_KEY = "tnv_cart";

function loadCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => { saveCart(items); }, [items]);

  const addItem = useCallback((product, variant, quantity = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.variant_id === variant.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
        return updated;
      }
      return [...prev, {
        variant_id: variant.id,
        product_id: product.id,
        title: product.title,
        variant_title: variant.title,
        price: variant.price,
        quantity,
        image: product.image || product.images?.[0] || "",
        color: variant.option1 || "",
        size: variant.option2 || "",
      }];
    });
    setCartOpen(true);
  }, []);

  const updateQuantity = useCallback((variantId, quantity) => {
    if (quantity < 1) return removeItem(variantId);
    setItems(prev => prev.map(i => i.variant_id === variantId ? { ...i, quantity } : i));
  }, []);

  const removeItem = useCallback((variantId) => {
    setItems(prev => prev.filter(i => i.variant_id !== variantId));
  }, []);

  const clearCart = useCallback(() => { setItems([]); }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, totalItems, totalPrice, cartOpen, setCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}
