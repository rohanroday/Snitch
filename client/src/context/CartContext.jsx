import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null); // { cart: {...}, totalPrice }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.getCart();
      setCart(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async (productId, size, quantity = 1) => {
    await api.addToCart(productId, size, quantity);
    await refresh();
  };

  const removeItem = async (productId, size, quantity = 1) => {
    await api.removeFromCart(productId, size, quantity);
    await refresh();
  };

  const items = cart?.cart?.products || [];
  const count = items.reduce((n, p) => n + p.quantity, 0);
  const totalPrice = cart?.totalPrice || 0;

  return (
    <CartContext.Provider
      value={{ items, count, totalPrice, loading, error, addItem, removeItem, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
