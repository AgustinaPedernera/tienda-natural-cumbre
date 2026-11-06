
import type { Product } from "../types/product";
import { useCart } from "../hooks/useCart";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addToCart } = useCart();

  // Buscamos cuántas unidades de este producto
  // ya están agregadas al carrito.
  const cartItem = items.find(
    (item) => item.productId === product.id
  );

  const quantityInCart = cartItem?.quantity ?? 0;

  // Calculamos el stock disponible para agregar.
  const availableStock = Math.max(
    0,
    product.stock - quantityInCart
  );

  const handleAddToCart = () => {
    if (availableStock > 0) {
      addToCart(product.id);
    }
  };

  return (
    <article
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "20px",
        backgroundColor: "#fff",
        color: "#333",
      }}
    >
      <h3>{product.name}</h3>

      <p>Categoría: {product.category}</p>

      <p>
        Precio: ${product.price.toLocaleString("es-AR")}
      </p>

      <p>
        Stock disponible: {availableStock}
      </p>

      {quantityInCart > 0 && (
        <p style={{ color: "#26734d", fontWeight: 600 }}>
          🛒 En tu carrito: {quantityInCart}
        </p>
      )}

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={availableStock === 0}
      >
        {availableStock === 0
          ? "Sin stock disponible"
          : "Agregar al carrito"}
      </button>
    </article>
  );
}
