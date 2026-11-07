import { Link } from "react-router-dom";
import type { Product } from "../types/product";
import { useCart } from "../hooks/useCart";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addToCart } = useCart();

  const quantityInCart =
    items.find((item) => item.productId === product.id)
      ?.quantity ?? 0;

  const availableStock = Math.max(
    0,
    product.stock - quantityInCart
  );

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface text-ink">
      <Link
        to={`/products/${encodeURIComponent(product.id)}`}
        aria-label={`Ver ${product.name}`}
        className="block bg-surface-soft"
      >
        <img
          src={product.imageUrl || "/product-placeholder.svg"}
          alt={product.name}
          loading="lazy"
          className="aspect-4/3 w-full object-contain"
        />
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <p className="mb-1 text-xs text-muted">
          {product.category}
        </p>

        <h2 className="mb-2 text-sm font-semibold leading-snug">
          <Link
            to={`/products/${encodeURIComponent(product.id)}`}
            className="text-ink no-underline hover:underline"
          >
            {product.name}
          </Link>
        </h2>

        <p className="mb-1 text-base font-bold">
          ${product.price.toLocaleString("es-AR")}
        </p>

        <p className="mb-3 text-xs text-muted">
          {quantityInCart > 0
            ? `${quantityInCart} en tu carrito`
            : availableStock > 0
              ? "Disponible"
              : "Sin stock"}
        </p>

        <button
          type="button"
          disabled={availableStock === 0}
          onClick={() => {
            if (availableStock > 0) {
              addToCart(product.id);
            }
          }}
          aria-label={`Agregar ${product.name} al carrito`}
          className="cumbre-button mt-auto w-full"
        >
          {availableStock === 0 ? "Sin stock" : "Agregar"}
        </button>
      </div>
    </article>
  );
}