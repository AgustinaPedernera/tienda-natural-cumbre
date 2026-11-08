import { describe, expect, it } from "vitest";
import { cartReducer } from "../reducers/cartReducer";

const initial = [
  { productId: "almendras", quantity: 2 },
  { productId: "nueces", quantity: 1 },
];

describe("cartReducer", () => {
  it("agrega un producto nuevo con una unidad", () => {
    expect(
      cartReducer([], {
        type: "ADD_ITEM",
        productId: "almendras",
      })
    ).toEqual([
      { productId: "almendras", quantity: 1 },
    ]);
  });

  it("acumula unidades sin duplicar la fila", () => {
    expect(
      cartReducer(initial, {
        type: "ADD_ITEM",
        productId: "almendras",
      })
    ).toEqual([
      { productId: "almendras", quantity: 3 },
      initial[1],
    ]);
  });

  it("elimina solo el producto indicado", () => {
    expect(
      cartReducer(initial, {
        type: "REMOVE_ITEM",
        productId: "almendras",
      })
    ).toEqual([initial[1]]);
  });

  it("actualiza la cantidad sin modificar otros productos", () => {
    expect(
      cartReducer(initial, {
        type: "UPDATE_QUANTITY",
        productId: "almendras",
        quantity: 5,
      })
    ).toEqual([
      { productId: "almendras", quantity: 5 },
      initial[1],
    ]);
  });

  it.each([0, -1])(
    "elimina cuando la cantidad es %s",
    (quantity) => {
      expect(
        cartReducer(initial, {
          type: "UPDATE_QUANTITY",
          productId: "almendras",
          quantity,
        })
      ).toEqual([initial[1]]);
    }
  );

  it.each([1.5, NaN, Infinity, -Infinity])(
    "rechaza la cantidad inválida %s",
    (quantity) => {
      expect(
        cartReducer(initial, {
          type: "UPDATE_QUANTITY",
          productId: "almendras",
          quantity,
        })
      ).toBe(initial);
    }
  );

  it("no agrega productos al actualizar un identificador inexistente", () => {
    expect(
      cartReducer(initial, {
        type: "UPDATE_QUANTITY",
        productId: "otro",
        quantity: 2,
      })
    ).toEqual(initial);
  });

  it("vacía el carrito", () => {
    expect(
      cartReducer(initial, {
        type: "CLEAR_CART",
      })
    ).toEqual([]);
  });

  it("no modifica el estado original", () => {
    const frozen = Object.freeze(
      initial.map((item) =>
        Object.freeze({ ...item })
      )
    );

    const result = cartReducer([...frozen], {
      type: "ADD_ITEM",
      productId: "almendras",
    });

    expect(frozen[0].quantity).toBe(2);
    expect(result[0].quantity).toBe(3);
    expect(result[0]).not.toBe(frozen[0]);
  });
});