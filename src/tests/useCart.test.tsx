/** @vitest-environment jsdom */

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  act,
  cleanup,
  renderHook,
} from "@testing-library/react";

import { CartProvider } from "../contexts/CartContext";
import { useCart } from "../hooks/useCart";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useCart aislado", () => {
  it("avisa si se usa fuera de CartProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCart());
    }).toThrow(
      "useCart debe utilizarse dentro de CartProvider"
    );
  });

  it("empieza vacío", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    expect(result.current.items).toEqual([]);
  });

  it("permite agregar, cambiar cantidades y eliminar", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart("almendras");
    });

    act(() => {
      result.current.addToCart("almendras");
    });

    expect(result.current.items).toEqual([
      { productId: "almendras", quantity: 2 },
    ]);

    act(() => {
      result.current.updateQuantity("almendras", 4);
    });

    expect(result.current.items[0].quantity).toBe(4);

    act(() => {
      result.current.removeFromCart("almendras");
    });

    expect(result.current.items).toEqual([]);
  });

  it("vacía todos los productos", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart("almendras");
      result.current.addToCart("nueces");
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
  });
});