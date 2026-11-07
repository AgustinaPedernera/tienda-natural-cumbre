/** @vitest-environment jsdom */

import type { ReactNode } from "react";
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
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import { ProductsContext } from "../contexts/ProductsContext";
import { CartProvider } from "../contexts/CartContext";
import { ProductCard } from "../components/ProductCard";
import { CartPage } from "../pages/CartPage";

import type { Product } from "../types/product";
import type { User } from "../types/user";
import type { CheckoutResponse } from "../services/ordersService";

const checkoutMocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  randomUUID: vi.fn(),
}));

vi.mock("../services/ordersService", () => ({
  createOrder: checkoutMocks.createOrder,
}));

vi.mock("../services/productsService", () => ({
  subscribeToProducts: vi.fn(),
}));

vi.mock("../config/firebase", () => ({
  auth: {},
  db: {},
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  onIdTokenChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

const customer: User = {
  id: "cliente-1",
  name: "Cliente de prueba",
  email: "cliente@example.com",
  role: "customer",
};

const product: Product = {
  id: "almendras",
  name: "Almendras de prueba",
  category: "Frutos secos",
  price: 100,
  stock: 5,
  imageUrl: "",
};

const successfulOrder: CheckoutResponse = {
  orderId: "orden-de-prueba",
  total: 200,
  status: "pending",
  message: "Compra confirmada correctamente.",
};

const requestId = "11111111-1111-4111-8111-111111111111";

interface TestProvidersProps {
  children: ReactNode;
  user?: User | null;
  products?: Product[];
}

function CheckoutTestProviders({
  children,
  user = customer,
  products = [product],
}: TestProvidersProps) {
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        loading: false,
        login: async () => {},
        register: async () => {},
        loginWithGoogle: async () => {},
        logout: async () => {},
      }}
    >
      <ProductsContext.Provider
        value={{
          products,
          loading: false,
          error: null,
        }}
      >
        <CartProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </CartProvider>
      </ProductsContext.Provider>
    </AuthContext.Provider>
  );
}

function TestRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <ProductCard product={product} />
            <Link to="/cart">Abrir carrito</Link>
          </>
        }
      />

      <Route path="/cart" element={<CartPage />} />
    </Routes>
  );
}

async function addProductsAndOpenCart() {
  const addButton = screen.getByRole("button", {
    name: "Agregar Almendras de prueba al carrito",
  });

  fireEvent.click(addButton);
  fireEvent.click(addButton);

  fireEvent.click(
    screen.getByRole("link", {
      name: "Abrir carrito",
    })
  );

  await screen.findByRole("heading", {
    name: "Mi carrito",
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  checkoutMocks.createOrder.mockResolvedValue(
    successfulOrder
  );

  checkoutMocks.randomUUID
    .mockReset()
    .mockReturnValueOnce(requestId)
    .mockReturnValue(
      "22222222-2222-4222-8222-222222222222"
    );

  vi.stubGlobal("crypto", {
    randomUUID: checkoutMocks.randomUUID,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("flujo de carrito y checkout", () => {
  it("agrega productos, confirma y vacía el carrito", async () => {
    render(
      <CheckoutTestProviders>
        <TestRoutes />
      </CheckoutTestProviders>
    );

    await addProductsAndOpenCart();

    expect(
      screen.getByLabelText("2 unidades")
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmar pedido",
      })
    );

    await screen.findByText("¡Pedido registrado!");

    expect(
      checkoutMocks.createOrder
    ).toHaveBeenCalledWith(
      [{ productId: "almendras", quantity: 2 }],
      requestId
    );

    expect(
      screen.getByText("Gracias por elegir Cumbre")
    ).toBeTruthy();

    expect(
      screen.queryByLabelText("2 unidades")
    ).toBeNull();
  });

  it("conserva el carrito si falla y reutiliza la solicitud al reintentar", async () => {
    checkoutMocks.createOrder
      .mockRejectedValueOnce(
        new Error("No se pudo conectar con el servidor.")
      )
      .mockResolvedValueOnce(successfulOrder);

    render(
      <CheckoutTestProviders>
        <TestRoutes />
      </CheckoutTestProviders>
    );

    await addProductsAndOpenCart();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmar pedido",
      })
    );

    await screen.findByText(
      "No se pudo conectar con el servidor."
    );

    expect(
      screen.getByLabelText("2 unidades")
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmar pedido",
      })
    );

    await screen.findByText("¡Pedido registrado!");

    expect(
      checkoutMocks.createOrder
    ).toHaveBeenCalledTimes(2);

    expect(
      checkoutMocks.createOrder.mock.calls[0][1]
    ).toBe(requestId);

    expect(
      checkoutMocks.createOrder.mock.calls[1][1]
    ).toBe(requestId);

    expect(
      checkoutMocks.randomUUID
    ).toHaveBeenCalledTimes(1);
  });

  it("bloquea confirmaciones repetidas mientras procesa", async () => {
    let resolveOrder!: (
      response: CheckoutResponse
    ) => void;

    checkoutMocks.createOrder.mockImplementationOnce(
      () =>
        new Promise<CheckoutResponse>((resolve) => {
          resolveOrder = resolve;
        })
    );

    render(
      <CheckoutTestProviders>
        <TestRoutes />
      </CheckoutTestProviders>
    );

    await addProductsAndOpenCart();

    const confirmButton = screen.getByRole("button", {
      name: "Confirmar pedido",
    });

    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(
      checkoutMocks.createOrder
    ).toHaveBeenCalledTimes(1);

    expect(
      confirmButton.hasAttribute("disabled")
    ).toBe(true);

    await act(async () => {
      resolveOrder(successfulOrder);
    });

    await screen.findByText("¡Pedido registrado!");
  });

  it("no permite confirmar sin iniciar sesión", async () => {
    render(
      <CheckoutTestProviders user={null}>
        <TestRoutes />
      </CheckoutTestProviders>
    );

    await addProductsAndOpenCart();

    expect(
      screen
        .getByRole("button", {
          name: "Confirmar pedido",
        })
        .hasAttribute("disabled")
    ).toBe(true);

    expect(
      screen.getByRole("link", {
        name: "iniciá sesión",
      })
    ).toBeTruthy();

    expect(
      checkoutMocks.createOrder
    ).not.toHaveBeenCalled();
  });

  it("bloquea el checkout si el stock baja por debajo de la cantidad elegida", async () => {
    const view = render(
      <CheckoutTestProviders>
        <TestRoutes />
      </CheckoutTestProviders>
    );

    await addProductsAndOpenCart();

    view.rerender(
      <CheckoutTestProviders
        products={[{ ...product, stock: 1 }]}
      >
        <TestRoutes />
      </CheckoutTestProviders>
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", {
            name: "Confirmar pedido",
          })
          .hasAttribute("disabled")
      ).toBe(true);
    });

    expect(
      checkoutMocks.createOrder
    ).not.toHaveBeenCalled();
  });
});