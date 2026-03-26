import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product._id);
      if (existing) {
        toast.success(`Updated quantity for ${product.name}`);
        return prev.map(i =>
          i.productId === product._id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      toast.success(`${product.name} added to inquiry`);
      return [
        ...prev,
        {
          productId:    product._id,
          name:         product.name,
          sku:          product.sku,
          unit:         product.unit,
          price:        product.price,
          quantity,
          notes:        '',
          maxStock:     product.totalStock || 9999,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
    toast.success('Item removed');
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    setItems(prev =>
      prev.map(i =>
        i.productId === productId ? { ...i, quantity } : i
      )
    );
  }, []);

  const updateNote = useCallback((productId, notes) => {
    setItems(prev =>
      prev.map(i =>
        i.productId === productId ? { ...i, notes } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, updateNote, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext must be used within CartProvider');
  return ctx;
}

export default CartContext;
