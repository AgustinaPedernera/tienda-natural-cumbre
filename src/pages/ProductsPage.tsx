import { ProductGrid } from "../components/ProductGrid";

export function ProductsPage() {
  return (
    <main className="cumbre-container py-5 md:py-7">
      <header className="mb-5">
        <h1 className="mb-2 font-display text-2xl font-bold md:text-3xl">
          Tienda Cumbre 🌿
        </h1>

        <p className="mb-0 text-sm text-muted">
          Descubrí nuestros productos y elegí tus favoritos.
        </p>
      </header>

      <ProductGrid />
    </main>
  );
}