import {
  createContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";

import type { CartItem } from "../types/cart";
import { useAuth } from "../hooks/useAuth";
import {
  cartReducer,
  type CartAction,
} from "../reducers/cartReducer";

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

interface PersistentCartState {
  ownerId: string | null;
  items: CartItem[];
  ready: boolean;
}

type PersistentCartAction =
  | CartAction
  | {
      type: "RESTORE_CART";
      ownerId: string | null;
      items: CartItem[];
    };

const initialState: PersistentCartState = {
  ownerId: null,
  items: [],
  ready: false,
};

function storageKey(ownerId: string | null) {
  return ownerId === null
    ? "cumbre-cart:v1:guest"
    : `cumbre-cart:v1:user:${ownerId}`;
}

function readStoredCart(ownerId: string | null): CartItem[] {
  try {
    const stored = localStorage.getItem(storageKey(ownerId));

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    const ids = new Set<string>();
    const validated: CartItem[] = [];

    for (const entry of parsed) {
      if (
        typeof entry !== "object" ||
        entry === null ||
        !("productId" in entry) ||
        typeof entry.productId !== "string" ||
        entry.productId.trim() === "" ||
        entry.productId.includes("/") ||
        !("quantity" in entry) ||
        typeof entry.quantity !== "number" ||
        !Number.isSafeInteger(entry.quantity) ||
        entry.quantity <= 0 ||
        ids.has(entry.productId)
      ) {
        return [];
      }

      ids.add(entry.productId);

      validated.push({
        productId: entry.productId,
        quantity: entry.quantity,
      });
    }

    return validated;
  } catch {
    // Un almacenamiento bloqueado o inválido no impide comprar.
    return [];
  }
}

function removeStoredCart(ownerId: string | null) {
  try {
    localStorage.removeItem(storageKey(ownerId));
  } catch {
    // El carrito continúa funcionando en memoria.
  }
}

function persistentCartReducer(
  state: PersistentCartState,
  action: PersistentCartAction
): PersistentCartState {
  if (action.type === "RESTORE_CART") {
    return {
      ownerId: action.ownerId,
      items: action.items,
      ready: true,
    };
  }

  return {
    ...state,
    items: cartReducer(state.items, action),
  };
}

export function CartProvider({ children }: CartProviderProps) {
  const { user, loading } = useAuth();
  const currentUserId = user?.id ?? null;

  const [state, dispatch] = useReducer(
    persistentCartReducer,
    initialState
  );

  useEffect(() => {
    // Firebase debe resolver la sesión antes de elegir el carrito.
    if (loading) return;

    if (state.ready && state.ownerId === currentUserId) {
      return;
    }

    const signingInFromGuest =
      state.ready &&
      state.ownerId === null &&
      currentUserId !== null;

    // Al salir o cambiar de cuenta, quitamos la copia anterior.
    if (
      state.ready &&
      state.ownerId !== null &&
      state.ownerId !== currentUserId
    ) {
      removeStoredCart(state.ownerId);
    }

    const restoredItems =
      signingInFromGuest && state.items.length > 0
        ? state.items
        : readStoredCart(currentUserId);

    if (signingInFromGuest) {
      removeStoredCart(null);
    }

    dispatch({
      type: "RESTORE_CART",
      ownerId: currentUserId,
      items: restoredItems,
    });
  }, [
    loading,
    currentUserId,
    state.ready,
    state.ownerId,
    state.items,
  ]);

  useEffect(() => {
    if (
      loading ||
      !state.ready ||
      state.ownerId !== currentUserId
    ) {
      return;
    }

    try {
      const key = storageKey(state.ownerId);

      if (state.items.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(
          key,
          JSON.stringify(state.items)
        );
      }
    } catch {
      // Si no puede persistirse, el estado en memoria sigue disponible.
    }
  }, [
    loading,
    currentUserId,
    state.ready,
    state.ownerId,
    state.items,
  ]);

  // Durante un cambio de identidad no mostramos el carrito anterior.
  const belongsToCurrentSession =
    state.ready && state.ownerId === currentUserId;

  const items = belongsToCurrentSession ? state.items : [];

  const dispatchCartAction = (action: CartAction) => {
    if (loading || !belongsToCurrentSession) return;

    dispatch(action);
  };

  const addToCart = (productId: string) => {
    dispatchCartAction({ type: "ADD_ITEM", productId });
  };

  const removeFromCart = (productId: string) => {
    dispatchCartAction({ type: "REMOVE_ITEM", productId });
  };

  const updateQuantity = (
    productId: string,
    quantity: number
  ) => {
    dispatchCartAction({
      type: "UPDATE_QUANTITY",
      productId,
      quantity,
    });
  };

  const clearCart = () => {
    dispatchCartAction({ type: "CLEAR_CART" });
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