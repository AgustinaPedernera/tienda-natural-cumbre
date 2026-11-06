
import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "../types/product";
import { getProducts } from "../services/productsService";

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
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError(null);

        const productsFromFirestore = await getProducts();

        if (active) {
          setProducts(productsFromFirestore);
        }
      } catch (err) {
        console.error("Error al cargar productos:", err);

        if (active) {
          setError("No se pudieron cargar los productos.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      active = false;
    };
  }, []);

  return (
    <ProductsContext.Provider
      value={{ products, loading, error }}
    >
      {children}
    </ProductsContext.Provider>
  );
}
