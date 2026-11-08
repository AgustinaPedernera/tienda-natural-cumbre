import type { ReactNode } from "react";
import { AuthProvider } from "../../contexts/AuthContext";
import { CartProvider } from "../../contexts/CartContext";

export function TestProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}