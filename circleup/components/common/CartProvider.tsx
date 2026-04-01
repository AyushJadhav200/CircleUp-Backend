import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

const CART_KEY = 'circleup_cart_v1';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category: string;
  quantity: number;
  type: 'product' | 'tool';
  rental_days?: number;
  latitude?: number;
  longitude?: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: any, type: 'product' | 'tool', rental_days?: number) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from storage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await SecureStore.getItemAsync(CART_KEY);
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (e) {
        console.error('Failed to load cart', e);
      }
    };
    loadCart();
  }, []);

  // Save cart whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        await SecureStore.setItemAsync(CART_KEY, JSON.stringify(cart));
      } catch (e) {
        console.error('Failed to save cart', e);
      }
    };
    saveCart();
  }, [cart]);

  const addToCart = (item: any, type: 'product' | 'tool', rental_days?: number) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(i => i.id === item.id && i.type === type);
      
      if (existingItemIndex > -1) {
        // Increment quantity for existing products
        if (type === 'product') {
          const newCart = [...prevCart];
          newCart[existingItemIndex].quantity += 1;
          return newCart;
        }
        // Tools/Rentals are typically 1-per-booking in this context
        return prevCart;
      }

      const newItem: CartItem = {
        id: item.id,
        name: item.name,
        price: item.price || item.price_per_day,
        image_url: item.image_url,
        category: item.category,
        quantity: 1,
        type,
        rental_days
      };
      return [...prevCart, newItem];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === itemId && item.type === 'product') {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => {
    const itemTotal = item.type === 'tool' && item.rental_days 
      ? item.price * item.rental_days 
      : item.price * item.quantity;
    return sum + itemTotal;
  }, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
