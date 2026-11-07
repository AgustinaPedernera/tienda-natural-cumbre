import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "../types/product";
import { subscribeToProducts } from "../services/productsService";

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export const ProductsContext = createContext<
  ProductsContextType | undefined
>(undefined);

interface ProductsProviderProps {
  children: ReactNode;
}

export function ProductsProvider({
  children,
}: ProductsProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToProducts(
      (updatedProducts) => {
        setProducts(updatedProducts);
        setError(null);
        setLoading(false);
      },
      () => {
        setProducts([]);
        setError("No se pudieron cargar los productos.");
        setLoading(false);
      }
    );
  }, []);

  return (
    <ProductsContext.Provider
      value={{ products, loading, error }}
    >
      {children}
    </ProductsContext.Provider>
  );
}