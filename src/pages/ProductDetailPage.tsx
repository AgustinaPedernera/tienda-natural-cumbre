import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useProducts } from "../hooks/useProducts";
import { useCart } from "../hooks/useCart";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { products, loading, error } = useProducts();
  const { items, addToCart } = useCart();

  const [addedProductId, setAddedProductId] = useState<
    string | null
  >(null);

  const product = products.find(
    (item) => item.id === productId
  );

  const quantityInCart =
    items.find((item) => item.productId === productId)
      ?.quantity ?? 0;

  const availableStock = product
    ? Math.max(0, product.stock - quantityInCart)
    : 0;

  const handleAddToCart = () => {
    if (!product || availableStock <= 0) return;

    addToCart(product.id);
    setAddedProductId(product.id);
  };

  return (
    <main className="cumbre-container py-5 md:py-7">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="mb-3 inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
        >
          ← Volver al catálogo
        </Link>

        {loading ? (
          <p role="status" className="text-sm text-muted">
            Cargando producto…
          </p>
        ) : error ? (
          <section
            role="alert"
            className="cumbre-error"
          >
            <h1 className="mb-2 text-lg font-bold">
              No pudimos cargar el producto
            </h1>

            <p className="text-sm">{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cumbre-button cumbre-button-secondary"
            >
              Volver a intentar
            </button>
          </section>
        ) : !product ? (
          <section className="cumbre-card">
            <h1 className="mb-2 text-xl font-bold">
              Producto no encontrado
            </h1>

            <p className="mb-4 text-sm text-muted">
              El producto no existe o ya no está
              disponible en el catálogo.
            </p>

            <Link to="/" className="cumbre-button">
              Explorar catálogo
            </Link>
          </section>
        ) : (
          <article className="cumbre-card">
            <div className="grid items-start gap-5 md:grid-cols-2 md:gap-7">
              <div className="min-w-0">
                <div className="overflow-hidden rounded-xl border border-line bg-surface-soft">
                  <img
                    src={
                      product.imageUrl ||
                      "/product-placeholder.svg"
                    }
                    alt={product.name}
                    className="h-52 w-full object-contain sm:h-64 md:h-80"
                  />
                </div>

                {!product.imageUrl && (
                  <p className="mt-2 mb-0 text-xs text-muted">
                    Imagen ilustrativa.
                  </p>
                )}
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {product.category}
                </p>

                <h1 className="mb-3 font-display text-xl font-bold leading-snug text-ink md:text-2xl">
                  {product.name}
                </h1>

                <p className="mb-4 text-2xl font-bold text-brand">
                  {formatMoney(product.price)}
                </p>

                <dl className="mb-4 grid grid-cols-2 gap-2 border-y border-line py-3 text-sm">
                  <dt className="text-muted">
                    Stock informado
                  </dt>
                  <dd className="m-0 text-right font-semibold">
                    {product.stock}
                  </dd>

                  <dt className="text-muted">
                    En tu carrito
                  </dt>
                  <dd className="m-0 text-right font-semibold">
                    {quantityInCart}
                  </dd>
                </dl>

                <p className="mb-4 text-xs text-muted">
                  {product.stock === 0
                    ? "Este producto está sin stock."
                    : availableStock === 0
                      ? "Ya agregaste todas las unidades disponibles."
                      : `Podés agregar ${availableStock} ${
                          availableStock === 1
                            ? "unidad más"
                            : "unidades más"
                        }.`}
                  {" "}
                  La disponibilidad se confirma al comprar.
                </p>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={availableStock === 0}
                    className="cumbre-button w-full"
                  >
                    {product.stock === 0
                      ? "Sin stock"
                      : availableStock === 0
                        ? "Máximo agregado"
                        : "Agregar al carrito"}
                  </button>

                  <Link
                    to="/cart"
                    className="cumbre-button cumbre-button-secondary w-full"
                  >
                    Ir al carrito
                  </Link>
                </div>

                {addedProductId === product.id &&
                  quantityInCart > 0 && (
                    <p
                      role="status"
                      className="cumbre-success mt-3 mb-0 text-sm"
                    >
                      Producto agregado. Tenés{" "}
                      {quantityInCart}{" "}
                      {quantityInCart === 1
                        ? "unidad"
                        : "unidades"}{" "}
                      de este producto en el carrito.
                    </p>
                  )}
              </div>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}