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
  waitFor,
} from "@testing-library/react";

import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { TestProviders } from "./helpers/TestProviders";

type FakeUser = {
  uid: string;
  displayName: string;
  email: string;
  getIdTokenResult: () => Promise<{
    claims: { role: string };
  }>;
};

type AuthListener = (
  user: FakeUser | null
) => void | Promise<void>;

const firebaseMocks = vi.hoisted(() => ({
  listener: null as AuthListener | null,
  onIdTokenChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../config/firebase", () => ({
  auth: {},
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  onIdTokenChanged: firebaseMocks.onIdTokenChanged,
  signInWithEmailAndPassword:
    firebaseMocks.signInWithEmailAndPassword,
  signOut: firebaseMocks.signOut,
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}));

const fakeUser: FakeUser = {
  uid: "cliente-1",
  displayName: "Cliente de prueba",
  email: "cliente@example.com",
  getIdTokenResult: async () => ({
    claims: { role: "customer" },
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  firebaseMocks.listener = null;

  firebaseMocks.onIdTokenChanged.mockImplementation(
    (_auth: unknown, callback: AuthListener) => {
      firebaseMocks.listener = callback;
      void callback(null);

      return () => {
        firebaseMocks.listener = null;
      };
    }
  );

  firebaseMocks.signInWithEmailAndPassword.mockImplementation(
    async () => {
      await firebaseMocks.listener?.(fakeUser);
      return { user: fakeUser };
    }
  );

  firebaseMocks.signOut.mockImplementation(async () => {
    await firebaseMocks.listener?.(null);
  });
});

afterEach(cleanup);

function useSessionAndCart() {
  return {
    auth: useAuth(),
    cart: useCart(),
  };
}

describe("integración entre sesión y carrito", () => {
  it("vacía el carrito al cerrar sesión", async () => {
    const { result } = renderHook(useSessionAndCart, {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.auth.login(
        "cliente@example.com",
        "password-de-prueba"
      );
    });

    await waitFor(() => {
      expect(result.current.auth.user?.id).toBe(
        "cliente-1"
      );
    });

    act(() => {
      result.current.cart.addToCart("almendras");
    });

    expect(result.current.cart.items).toHaveLength(1);

    await act(async () => {
      await result.current.auth.logout();
    });

    await waitFor(() => {
      expect(
        result.current.auth.isAuthenticated
      ).toBe(false);

      expect(result.current.cart.items).toEqual([]);
    });

    expect(firebaseMocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("conserva el carrito de invitado al iniciar sesión", async () => {
    const { result } = renderHook(useSessionAndCart, {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.cart.addToCart("almendras");
    });

    await act(async () => {
      await result.current.auth.login(
        "cliente@example.com",
        "password-de-prueba"
      );
    });

    await waitFor(() => {
      expect(
        result.current.auth.isAuthenticated
      ).toBe(true);
    });

    expect(result.current.cart.items).toEqual([
      { productId: "almendras", quantity: 1 },
    ]);
  });

  it("no entrega el carrito de una cuenta a otra", async () => {
    const { result } = renderHook(useSessionAndCart, {
      wrapper: TestProviders,
    });

    await act(async () => {
      await result.current.auth.login(
        "cliente@example.com",
        "password-de-prueba"
      );
    });

    act(() => {
      result.current.cart.addToCart("almendras");
    });

    await act(async () => {
      await firebaseMocks.listener?.({
        ...fakeUser,
        uid: "cliente-2",
      });
    });

    await waitFor(() => {
      expect(result.current.auth.user?.id).toBe(
        "cliente-2"
      );

      expect(result.current.cart.items).toEqual([]);
    });
  });
});


it("conserva el carrito mientras se renueva el token de la misma cuenta", async () => {
  const { result } = renderHook(useSessionAndCart, { wrapper: TestProviders });
  await act(async () => {
    await result.current.auth.login("cliente@example.com", "password-de-prueba");
  });
  act(() => { result.current.cart.addToCart("almendras"); });

  let resolveToken!: (value: { claims: { role: string } }) => void;
  const pendingToken = new Promise<{ claims: { role: string } }>((resolve) => {
    resolveToken = resolve;
  });
  let pendingRefresh: void | Promise<void> = undefined;
  act(() => {
    pendingRefresh = firebaseMocks.listener?.({
      ...fakeUser,
      getIdTokenResult: () => pendingToken,
    });
  });
  expect(result.current.auth.loading).toBe(true);
  expect(result.current.cart.items).toEqual([{ productId: "almendras", quantity: 1 }]);

  await act(async () => {
    resolveToken({ claims: { role: "customer" } });
    await pendingRefresh;
  });
  expect(result.current.auth.loading).toBe(false);
  expect(result.current.cart.items).toEqual([{ productId: "almendras", quantity: 1 }]);
});
