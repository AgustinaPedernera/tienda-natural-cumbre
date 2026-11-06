
/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { AuthProvider } from "../contexts/AuthContext";
import { CartProvider } from "../contexts/CartContext";

import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";

import { productsMock } from "../mocks/productsMock";

const firebaseMocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../config/firebase", () => ({
  auth: {},
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: firebaseMocks.onAuthStateChanged,
  signInWithEmailAndPassword:
    firebaseMocks.signInWithEmailAndPassword,
  signOut: firebaseMocks.signOut,
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}));

const firebaseUser = {
  uid: "u1",
  displayName: "Cliente de prueba",
  email: "cliente@ejemplo.com",
};

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}

describe("Integración entre AuthContext y CartContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    firebaseMocks.onAuthStateChanged.mockImplementation(
      (_auth, callback) => {
        callback(null);
        return vi.fn();
      }
    );

    firebaseMocks.signInWithEmailAndPassword.mockImplementation(
      async () => {
        const callback =
          firebaseMocks.onAuthStateChanged.mock.calls[0]?.[1];

        callback?.(firebaseUser);

        return { user: firebaseUser };
      }
    );

    firebaseMocks.signOut.mockImplementation(async () => {
      const callback =
        firebaseMocks.onAuthStateChanged.mock.calls[0]?.[1];

      callback?.(null);
    });
  });

  it("vacía el carrito cuando el usuario cierra sesión", async () => {
    const { result } = renderHook(
      () => ({
        auth: useAuth(),
        cart: useCart(),
      }),
      { wrapper: TestProviders }
    );

    await act(async () => {
      await result.current.auth.login(
        "cliente@ejemplo.com",
        "password-de-prueba"
      );
    });

    await waitFor(() => {
      expect(result.current.auth.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.cart.addToCart(productsMock[0].id);
    });

    expect(result.current.cart.items).toEqual([
      {
        productId: productsMock[0].id,
        quantity: 1,
      },
    ]);

    await act(async () => {
      await result.current.auth.logout();
    });

    await waitFor(() => {
      expect(result.current.cart.items).toEqual([]);
    });

    expect(result.current.auth.isAuthenticated).toBe(false);

    expect(firebaseMocks.signOut).toHaveBeenCalledTimes(1);
  });
});
