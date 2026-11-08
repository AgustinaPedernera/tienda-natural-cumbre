import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { Pagination } from "./ui/Pagination";

const PAGE_SIZE = 12;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function ProductGrid() {
  const { products, loading, error } = useProducts();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const categories = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.category.trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = normalizeText(debouncedSearch);

    return products.filter(
      (product) =>
        normalizeText(product.name).includes(query) &&
        (
          category === "" ||
          product.category.trim() === category
        )
    );
  }, [products, debouncedSearch, category]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const searching = search !== debouncedSearch;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategory("");
    setPage(1);
  };

  if (loading) {
    return (
      <p role="status" className="text-sm text-muted">
        Cargando productos…
      </p>
    );
  }

  if (error) {
    return (
      <div role="alert" className="cumbre-error">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cumbre-button cumbre-button-secondary"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted">
        No hay productos disponibles por el momento.
      </p>
    );
  }

  return (
    <section aria-label="Catálogo de productos">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            htmlFor="product-search"
            className="mb-1 block text-xs font-semibold text-muted"
          >
            Buscar por nombre
          </label>
          <input
            id="product-search"
            type="search"
            placeholder="Almendras, aceite, nueces…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="cumbre-field"
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="product-category"
            className="mb-1 block text-xs font-semibold text-muted"
          >
            Categoría
          </label>
          <select
            id="product-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className="cumbre-field"
          >
            <option value="">Todas las categorías</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p
          role="status"
          aria-atomic="true"
          className="mb-0 text-xs text-muted"
        >
          {searching
            ? "Buscando…"
            : `${filteredProducts.length} ${
                filteredProducts.length === 1
                  ? "producto encontrado"
                  : "productos encontrados"
              }`}
        </p>

        {(search || category) && (
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-11 px-2 text-xs font-semibold text-wine"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="cumbre-card">
          <p className="mb-0 text-sm text-muted">
            No encontramos productos con esos filtros.
          </p>
        </div>
      ) : (
        <>
          <div
            ref={resultsRef}
            aria-busy={searching}
            className="grid scroll-mt-44 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={(nextPage) => {
              setPage(nextPage);
              resultsRef.current?.scrollIntoView({
                block: "start",
              });
            }}
          />
        </>
      )}
    </section>
  );
}