/** @vitest-environment jsdom */

import {
  afterEach,
  beforeEach,
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

const authMock = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: authMock.user,
    loading: authMock.loading,
  }),
}));

const GUEST_KEY = "cumbre-cart:v1:guest";
const USER_A_KEY = "cumbre-cart:v1:user:usuario-a";
const USER_B_KEY = "cumbre-cart:v1:user:usuario-b";

beforeEach(() => {
  localStorage.clear();
  authMock.user = null;
  authMock.loading = false;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
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

  it("vacía todos los productos y elimina su copia guardada", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart("almendras");
      result.current.addToCart("nueces");
    });

    expect(localStorage.getItem(GUEST_KEY)).not.toBeNull();

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem(GUEST_KEY)).toBeNull();
  });
});

describe("persistencia del carrito", () => {
  it("guarda el carrito de visitante y lo recupera al volver a montar", () => {
    const first = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      first.result.current.addToCart("almendras");
      first.result.current.updateQuantity("almendras", 3);
    });

    expect(JSON.parse(localStorage.getItem(GUEST_KEY)!)).toEqual([
      { productId: "almendras", quantity: 3 },
    ]);

    first.unmount();

    const second = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    expect(second.result.current.items).toEqual([
      { productId: "almendras", quantity: 3 },
    ]);
  });

  it("espera la sesión antes de recuperar el carrito de una cuenta", () => {
    const savedCart = JSON.stringify([
      { productId: "nueces", quantity: 2 },
    ]);

    localStorage.setItem(USER_A_KEY, savedCart);
    authMock.loading = true;

    const { result, rerender } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem(USER_A_KEY)).toBe(savedCart);
    expect(localStorage.getItem(GUEST_KEY)).toBeNull();

    authMock.user = { id: "usuario-a" };
    authMock.loading = false;

    rerender();

    expect(result.current.items).toEqual([
      { productId: "nueces", quantity: 2 },
    ]);
  });

  it("conserva los artículos del visitante al iniciar sesión", () => {
    const { result, rerender } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart("almendras");
    });

    authMock.user = { id: "usuario-a" };
    rerender();

    expect(result.current.items).toEqual([
      { productId: "almendras", quantity: 1 },
    ]);

    expect(localStorage.getItem(GUEST_KEY)).toBeNull();

    expect(JSON.parse(localStorage.getItem(USER_A_KEY)!)).toEqual([
      { productId: "almendras", quantity: 1 },
    ]);
  });

  it("vacía el carrito y borra su copia al cerrar sesión", () => {
    authMock.user = { id: "usuario-a" };

    const { result, rerender } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart("almendras");
    });

    expect(localStorage.getItem(USER_A_KEY)).not.toBeNull();

    authMock.user = null;
    rerender();

    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem(USER_A_KEY)).toBeNull();
    expect(localStorage.getItem(GUEST_KEY)).toBeNull();
  });

  it("no transfiere artículos al cambiar de cuenta", () => {
    localStorage.setItem(
      USER_B_KEY,
      JSON.stringify([
        { productId: "nueces", quantity: 2 },
      ])
    );

    authMock.user = { id: "usuario-a" };

    const { result, rerender } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart("almendras");
    });

    authMock.loading = true;
    authMock.user = null;
    rerender();

    expect(result.current.items).toEqual([]);

    authMock.user = { id: "usuario-b" };
    authMock.loading = false;
    rerender();

    expect(result.current.items).toEqual([
      { productId: "nueces", quantity: 2 },
    ]);

    expect(localStorage.getItem(USER_A_KEY)).toBeNull();

    expect(JSON.parse(localStorage.getItem(USER_B_KEY)!)).toEqual([
      { productId: "nueces", quantity: 2 },
    ]);
  });

  it("conserva el carrito durante la renovación de sesión", () => {
    authMock.user = { id: "usuario-a" };

    const { result, rerender } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart("almendras");
    });

    const savedCart = localStorage.getItem(USER_A_KEY);

    authMock.loading = true;
    rerender();

    expect(result.current.items).toEqual([
      { productId: "almendras", quantity: 1 },
    ]);
    expect(localStorage.getItem(USER_A_KEY)).toBe(savedCart);

    authMock.loading = false;
    rerender();

    expect(result.current.items).toEqual([
      { productId: "almendras", quantity: 1 },
    ]);
    expect(localStorage.getItem(USER_A_KEY)).toBe(savedCart);
  });

  it.each([
    ["JSON roto", "{invalido"],
    ["objeto en lugar de lista", "{}"],
    [
      "cantidad negativa",
      JSON.stringify([
        { productId: "almendras", quantity: -1 },
      ]),
    ],
    [
      "cantidad decimal",
      JSON.stringify([
        { productId: "almendras", quantity: 1.5 },
      ]),
    ],
    [
      "identificador vacío",
      JSON.stringify([
        { productId: "", quantity: 1 },
      ]),
    ],
    [
      "productos duplicados",
      JSON.stringify([
        { productId: "almendras", quantity: 1 },
        { productId: "almendras", quantity: 2 },
      ]),
    ],
  ])("descarta datos inválidos: %s", (_description, stored) => {
    localStorage.setItem(GUEST_KEY, stored);

    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    expect(result.current.items).toEqual([]);
    expect(localStorage.getItem(GUEST_KEY)).toBeNull();
  });

  it("funciona en memoria si localStorage está bloqueado", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Almacenamiento bloqueado");
    });

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Almacenamiento bloqueado");
    });

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Almacenamiento bloqueado");
    });

    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart("almendras");
    });

    expect(result.current.items).toEqual([
      { productId: "almendras", quantity: 1 },
    ]);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
  });
});