
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "./ProductCard";

export function ProductGrid() {
  const { products, loading, error } = useProducts();

  if (loading) return <p role="status">Cargando productos...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (products.length === 0) return <p>No hay productos disponibles.</p>;

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
      }}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </section>
  );
}

