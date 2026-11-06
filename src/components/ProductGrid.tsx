
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "./ProductCard";

export function ProductGrid() {
  const { products } = useProducts();

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
