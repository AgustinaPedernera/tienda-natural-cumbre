import type { ReactNode } from "react";

import { AuthProvider } from "../contexts/AuthContext";
import { ProductsProvider } from "../contexts/ProductsContext";
import { CartProvider } from "../contexts/CartContext";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  );
}