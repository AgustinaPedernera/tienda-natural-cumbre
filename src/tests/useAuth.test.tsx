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

import { AuthProvider } from "../contexts/AuthContext";
import { useAuth } from "../hooks/useAuth";

type FakeUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  getIdTokenResult: () => Promise<{
    claims: Record<string, unknown>;
  }>;
};

type AuthListener = (
  user: FakeUser | null
) => void | Promise<void>;

const firebaseMocks = vi.hoisted(() => ({
  auth: {},
  listener: null as AuthListener | null,
  listenerError: null as (() => void) | null,
  unsubscribe: vi.fn(),
  onIdTokenChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../config/firebase", () => ({
  auth: firebaseMocks.auth,
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  onIdTokenChanged: firebaseMocks.onIdTokenChanged,
  signInWithEmailAndPassword:
    firebaseMocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword:
    firebaseMocks.createUserWithEmailAndPassword,
  signInWithPopup: firebaseMocks.signInWithPopup,
  signOut: firebaseMocks.signOut,
}));

function createUser(
  overrides: Partial<FakeUser> = {}
): FakeUser {
  return {
    uid: "cliente-1",
    displayName: "Cliente de prueba",
    email: "cliente@example.com",
    getIdTokenResult: async () => ({
      claims: { role: "customer" },
    }),
    ...overrides,
  };
}

async function emit(user: FakeUser | null) {
  await act(async () => {
    await firebaseMocks.listener?.(user);
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  firebaseMocks.listener = null;
  firebaseMocks.listenerError = null;

  firebaseMocks.onIdTokenChanged.mockImplementation(
    (
      _auth: unknown,
      listener: AuthListener,
      onError: () => void
    ) => {
      firebaseMocks.listener = listener;
      firebaseMocks.listenerError = onError;

      return firebaseMocks.unsubscribe;
    }
  );

  firebaseMocks.signInWithEmailAndPassword.mockResolvedValue({});
  firebaseMocks.createUserWithEmailAndPassword.mockResolvedValue({});
  firebaseMocks.signInWithPopup.mockResolvedValue({});
  firebaseMocks.signOut.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useAuth aislado", () => {
  it("espera a Firebase antes de resolver la sesión inicial", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("resuelve una sesión sin usuario", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await emit(null);

    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("recupera una sesión existente sin llamar al login", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await emit(createUser());

    expect(result.current.user).toEqual({
      id: "cliente-1",
      name: "Cliente de prueba",
      email: "cliente@example.com",
      role: "customer",
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);

    expect(
      firebaseMocks.signInWithEmailAndPassword
    ).not.toHaveBeenCalled();
  });

  it.each([
    {
      claims: { role: "admin" },
      expected: "admin",
    },
    {
      claims: { role: "customer" },
      expected: "customer",
    },
    {
      claims: {},
      expected: "customer",
    },
    {
      claims: { role: "superadmin" },
      expected: "customer",
    },
  ])(
    "interpreta los permisos del token: $expected",
    async ({ claims, expected }) => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await emit(
        createUser({
          getIdTokenResult: async () => ({ claims }),
        })
      );

      expect(result.current.user?.role).toBe(expected);
    }
  );

  it("usa el correo como nombre si no hay displayName", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await emit(createUser({ displayName: null }));

    expect(result.current.user?.name).toBe("cliente");
  });

  it("usa un nombre alternativo si tampoco hay correo", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await emit(
      createUser({
        displayName: null,
        email: null,
      })
    );

    expect(result.current.user?.name).toBe("Usuario");
    expect(result.current.user?.email).toBe("");
  });

  it("delega login, registro, Google y logout al SDK", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await emit(null);

    await act(async () => {
      await result.current.login(
        "cliente@example.com",
        "password-de-prueba"
      );

      await result.current.register(
        "nuevo@example.com",
        "password-de-prueba"
      );

      await result.current.loginWithGoogle();
      await result.current.logout();
    });

    expect(
      firebaseMocks.signInWithEmailAndPassword
    ).toHaveBeenCalledWith(
      firebaseMocks.auth,
      "cliente@example.com",
      "password-de-prueba"
    );

    expect(
      firebaseMocks.createUserWithEmailAndPassword
    ).toHaveBeenCalledWith(
      firebaseMocks.auth,
      "nuevo@example.com",
      "password-de-prueba"
    );

    expect(
      firebaseMocks.signInWithPopup
    ).toHaveBeenCalledWith(
      firebaseMocks.auth,
      expect.anything()
    );

    expect(firebaseMocks.signOut).toHaveBeenCalledWith(
      firebaseMocks.auth
    );
  });

  it("propaga el error del login para que la pantalla pueda mostrarlo", async () => {
    const failure = new Error("Credenciales inválidas");

    firebaseMocks.signInWithEmailAndPassword
      .mockRejectedValueOnce(failure);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await emit(null);

    await act(async () => {
      await expect(
        result.current.login(
          "cliente@example.com",
          "incorrecta"
        )
      ).rejects.toBe(failure);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("descarta la sesión si no puede verificar sus permisos", async () => {
    const log = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await emit(createUser());

    await emit(
      createUser({
        getIdTokenResult: async () => {
          throw new Error("No disponible");
        },
      })
    );

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);

    expect(log).toHaveBeenCalledWith(
      "No se pudieron verificar los permisos de la sesión."
    );
  });

  it("resuelve un error del observador sin dejar la pantalla cargando", async () => {
    const log = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await emit(createUser());

    act(() => {
      firebaseMocks.listenerError?.();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);

    expect(log).toHaveBeenCalledWith(
      "No se pudo verificar la sesión."
    );
  });

  it("no restaura una sesión vieja si el token llega después del logout", async () => {
    let resolveToken!: (value: {
      claims: Record<string, unknown>;
    }) => void;

    const pendingToken = new Promise<{
      claims: Record<string, unknown>;
    }>((resolve) => {
      resolveToken = resolve;
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    let pendingSession: void | Promise<void> = undefined;

    act(() => {
      pendingSession = firebaseMocks.listener?.(
        createUser({
          getIdTokenResult: () => pendingToken,
        })
      );
    });

    await emit(null);

    await act(async () => {
      resolveToken({
        claims: { role: "admin" },
      });

      await pendingSession;
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("cancela la suscripción al desmontar el provider", () => {
    const { unmount } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    unmount();

    expect(
      firebaseMocks.unsubscribe
    ).toHaveBeenCalledTimes(1);
  });
});