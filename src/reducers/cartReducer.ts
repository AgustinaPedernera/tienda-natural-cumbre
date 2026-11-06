
import type { CartItem } from "../types/cart";

export type CartAction =
  | { type: "ADD_ITEM"; productId: string }
  | { type: "REMOVE_ITEM"; productId: string }
  | {
      type: "UPDATE_QUANTITY";
      productId: string;
      quantity: number;
    }
  | { type: "CLEAR_CART" };

export function cartReducer(
  state: CartItem[],
  action: CartAction
): CartItem[] {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.find(
        (item) => item.productId === action.productId
      );

      if (existingItem) {
        return state.map((item) =>
          item.productId === action.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...state,
        { productId: action.productId, quantity: 1 },
      ];
    }

    case "REMOVE_ITEM":
      return state.filter(
        (item) => item.productId !== action.productId
      );

    case "UPDATE_QUANTITY":
      if (!Number.isInteger(action.quantity)) {
        return state;
      }

      if (action.quantity <= 0) {
        return state.filter(
          (item) => item.productId !== action.productId
        );
      }

      return state.map((item) =>
        item.productId === action.productId
          ? { ...item, quantity: action.quantity }
          : item
      );

    case "CLEAR_CART":
      return [];

    default:
      return state;
  }
}
