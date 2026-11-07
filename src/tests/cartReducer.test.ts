import { describe, expect, it } from "vitest";
import { cartReducer } from "../reducers/cartReducer";

describe("cartReducer", () => {
  it("agrega productos y acumula unidades sin mutar el estado", () => {
    const original = [{ productId: "almendras", quantity: 1 }];
    expect(cartReducer([], { type: "ADD_ITEM", productId: "almendras" })).toEqual(original);
    expect(cartReducer(original, { type: "ADD_ITEM", productId: "almendras" })).toEqual([{ productId: "almendras", quantity: 2 }]);
    expect(original[0].quantity).toBe(1);
  });
  it("actualiza, elimina y vacía el carrito", () => {
    const original = [{ productId: "almendras", quantity: 1 }];
    expect(cartReducer(original, { type: "UPDATE_QUANTITY", productId: "almendras", quantity: 3 })).toEqual([{ productId: "almendras", quantity: 3 }]);
    expect(cartReducer(original, { type: "REMOVE_ITEM", productId: "almendras" })).toEqual([]);
    expect(cartReducer(original, { type: "CLEAR_CART" })).toEqual([]);
  });
  it("rechaza cantidades fraccionarias y elimina cantidades no positivas", () => {
    const original = [{ productId: "almendras", quantity: 1 }];
    for (const quantity of [NaN, Infinity, 1.5]) {
      expect(cartReducer(original, { type: "UPDATE_QUANTITY", productId: "almendras", quantity })).toBe(original);
    }
    for (const quantity of [0, -1]) {
      expect(cartReducer(original, { type: "UPDATE_QUANTITY", productId: "almendras", quantity })).toEqual([]);
    }
  });
});
