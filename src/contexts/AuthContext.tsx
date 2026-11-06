
import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
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
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const currentUser: User = {
            id: firebaseUser.uid,
            name:
              firebaseUser.displayName ||
              firebaseUser.email?.split("@")[0] ||
              "Usuario",
            email: firebaseUser.email || "",
            role: "customer",
          };

          setUser(currentUser);
        } else {
          setUser(null);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Error al verificar la sesión:", error);
        setUser(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
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
