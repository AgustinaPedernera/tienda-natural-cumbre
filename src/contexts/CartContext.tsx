
import {
  createContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import type { CartItem } from "../types/cart";
import { useAuth } from "../hooks/useAuth";
import { cartReducer } from "../reducers/cartReducer";

interface CartContextType {
  items: CartItem[];
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const CartContext = createContext<
  CartContextType | undefined
>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const { user } = useAuth();

  const [items, dispatch] = useReducer(cartReducer, []);

  const previousUserId = useRef(user?.id ?? null);

  useEffect(() => {
    const currentUserId = user?.id ?? null;

    if (
      previousUserId.current !== null &&
      previousUserId.current !== currentUserId
    ) {
      dispatch({ type: "CLEAR_CART" });
    }

    previousUserId.current = currentUserId;
  }, [user?.id]);

  const addToCart = (productId: string) => {
    dispatch({ type: "ADD_ITEM", productId });
  };

  const removeFromCart = (productId: string) => {
    dispatch({ type: "REMOVE_ITEM", productId });
  };

  const updateQuantity = (
    productId: string,
    quantity: number
  ) => {
    dispatch({
      type: "UPDATE_QUANTITY",
      productId,
      quantity,
    });
  };

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" });
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
