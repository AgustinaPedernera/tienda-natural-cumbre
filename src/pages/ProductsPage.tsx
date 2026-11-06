import { ProductGrid } from "../components/ProductGrid";

export function ProductsPage() {
  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <h1>Nuestra tienda de frutos secos 🥜</h1>

      <p>
        Descubrí nuestros productos y agregá tus favoritos
        al carrito.
      </p>

      <ProductGrid />
    </main>
  );
}