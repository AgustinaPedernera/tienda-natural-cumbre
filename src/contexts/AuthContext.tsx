import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth } from "../config/firebase";
import type { User } from "../types/user";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let revision = 0;

    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        const currentRevision = ++revision;

        setLoading(true);
        setUser(null);

        if (!firebaseUser) {
          setLoading(false);
          return;
        }

        try {
          const tokenResult =
            await firebaseUser.getIdTokenResult();

          if (!active || currentRevision !== revision) {
            return;
          }

          setUser({
            id: firebaseUser.uid,
            name:
              firebaseUser.displayName ||
              firebaseUser.email?.split("@")[0] ||
              "Usuario",
            email: firebaseUser.email || "",
            role:
              tokenResult.claims.role === "admin"
                ? "admin"
                : "customer",
          });
        } catch {
          if (active && currentRevision === revision) {
            setUser(null);
            console.error(
              "No se pudieron verificar los permisos de la sesión."
            );
          }
        } finally {
          if (active && currentRevision === revision) {
            setLoading(false);
          }
        }
      },
      () => {
        revision++;

        if (active) {
          setUser(null);
          setLoading(false);
          console.error("No se pudo verificar la sesión.");
        }
      }
    );

    return () => {
      active = false;
      revision++;
      unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (
    email: string,
    password: string
  ): Promise<void> => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async (): Promise<void> => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}