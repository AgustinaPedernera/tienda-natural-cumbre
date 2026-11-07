import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useProducts } from "../hooks/useProducts";
import {
  createOrder,
  type CheckoutResponse,
} from "../services/ordersService";

interface OrderConfirmation {
  userId: string;
  orderId: string;
  total: number;
  status: CheckoutResponse["status"];
}

const statusLabels: Record<
  CheckoutResponse["status"],
  string
> = {
  pending: "Pendiente",
  processing: "En preparación",
  completed: "Completada",
  cancelled: "Cancelada",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CartPage() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart();

  const {
    products,
    loading: productsLoading,
    error: productsError,
  } = useProducts();

  const { user, loading: authLoading } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] =
    useState<OrderConfirmation | null>(null);

  const processingRef = useRef(false);

  const pendingRequestRef = useRef<{
    fingerprint: string;
    requestId: string;
  } | null>(null);

  const cartProducts = items.flatMap((item) => {
    const product = products.find(
      (product) => product.id === item.productId
    );

    return product ? [{ ...item, product }] : [];
  });

  const missingProducts = items.filter(
    (item) =>
      !products.some(
        (product) => product.id === item.productId
      )
  );

  const total = cartProducts.reduce(
    (sum, item) =>
      sum + item.product.price * item.quantity,
    0
  );

  const units = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const hasStockProblems = cartProducts.some(
    ({ product, quantity }) =>
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > product.stock
  );

  const hasInvalidTotal =
    !Number.isSafeInteger(total) || total < 0;

  const visibleConfirmation =
    confirmation && confirmation.userId === user?.id
      ? confirmation
      : null;

  const checkoutDisabled =
    isProcessing ||
    authLoading ||
    productsLoading ||
    Boolean(productsError) ||
    !user ||
    items.length === 0 ||
    missingProducts.length > 0 ||
    hasStockProblems ||
    hasInvalidTotal;

  const handleConfirmOrder = async () => {
    if (processingRef.current) return;

    setError("");

    if (authLoading || productsLoading) {
      setError("Esperá a que termine de cargar la información.");
      return;
    }

    if (!user) {
      setError("Debés iniciar sesión para confirmar tu compra.");
      return;
    }

    if (
      productsError ||
      items.length === 0 ||
      missingProducts.length > 0 ||
      hasStockProblems ||
      hasInvalidTotal
    ) {
      setError(
        "Revisá los productos y las cantidades antes de confirmar."
      );
      return;
    }

    const fingerprint = JSON.stringify({
      userId: user.id,
      items: [...items]
        .sort((a, b) =>
          a.productId.localeCompare(b.productId)
        )
        .map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
    });

    if (
      !pendingRequestRef.current ||
      pendingRequestRef.current.fingerprint !== fingerprint
    ) {
      pendingRequestRef.current = {
        fingerprint,
        requestId: crypto.randomUUID(),
      };
    }

    const requestId = pendingRequestRef.current.requestId;

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const result = await createOrder(items, requestId);

      setConfirmation({
        userId: user.id,
        orderId: result.orderId,
        total: result.total,
        status: result.status,
      });

      clearCart();
      pendingRequestRef.current = null;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo confirmar la compra."
      );
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  return (
    <main className="cumbre-container py-5 md:py-7">
      <header className="mb-5 border-b border-line pb-4">
        <h1 className="mb-1 text-xl font-bold md:text-2xl">
          Mi carrito
        </h1>

        <p className="mb-0 text-sm text-muted">
          Revisá tus productos antes de confirmar el pedido.
        </p>
      </header>

      {visibleConfirmation && (
        <section
          role="status"
          className="cumbre-success mb-5"
        >
          <h2 className="mb-2 text-base font-bold">
            ¡Pedido registrado!
          </h2>

          <p className="text-sm">
            Total:{" "}
            <strong>
              {formatMoney(visibleConfirmation.total)}
            </strong>
          </p>

          <p className="text-sm">
            Estado:{" "}
            {statusLabels[visibleConfirmation.status]}
          </p>

          <Link
            to={`/orders/${encodeURIComponent(
              visibleConfirmation.orderId
            )}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-inherit underline"
          >
            Ver detalle del pedido →
          </Link>
        </section>
      )}

      {error && (
        <p role="alert" className="cumbre-error mb-4 text-sm">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <section className="cumbre-card mx-auto max-w-lg py-8 text-center">
          <h2 className="mb-2 text-lg">
            {visibleConfirmation
              ? "Gracias por elegir Cumbre"
              : "Tu carrito está vacío"}
          </h2>

          <p className="mb-5 text-sm text-muted">
            {visibleConfirmation
              ? "Podés consultar el estado del pedido en Mis compras."
              : "Explorá el catálogo y agregá tus productos favoritos."}
          </p>

          <Link to="/" className="cumbre-button">
            Volver al catálogo
          </Link>
        </section>
      ) : productsLoading ? (
        <p role="status" className="text-sm text-muted">
          Cargando los productos del carrito…
        </p>
      ) : productsError ? (
        <section role="alert" className="cumbre-error">
          <p className="text-sm">
            No pudimos consultar el catálogo. Tus productos
            siguen en el carrito.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cumbre-button cumbre-button-secondary"
          >
            Volver a intentar
          </button>
        </section>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
          <section
            aria-label="Productos del carrito"
            className="grid min-w-0 gap-3"
          >
            {cartProducts.map(({ product, quantity }) => {
              const exceedsStock = quantity > product.stock;

              return (
                <article
                  key={product.id}
                  className="cumbre-card"
                >
                  <div className="flex items-start gap-3">
                    <Link
                      to={`/products/${encodeURIComponent(
                        product.id
                      )}`}
                      className="shrink-0"
                    >
                      <img
                        src={
                          product.imageUrl ||
                          "/product-placeholder.svg"
                        }
                        alt={product.name}
                        loading="lazy"
                        className="h-16 w-16 rounded-lg border border-line bg-surface-soft object-contain sm:h-20 sm:w-20"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <h2 className="mb-1 text-sm font-semibold">
                        <Link
                          to={`/products/${encodeURIComponent(
                            product.id
                          )}`}
                          className="text-ink no-underline hover:underline"
                        >
                          {product.name}
                        </Link>
                      </h2>

                      <p className="mb-1 text-xs text-muted">
                        {formatMoney(product.price)} por unidad
                      </p>

                      <p className="mb-0 text-sm font-bold">
                        Subtotal:{" "}
                        {formatMoney(product.price * quantity)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <div
                      role="group"
                      aria-label={`Cantidad de ${product.name}`}
                      className="flex items-center gap-1"
                    >
                      <button
                        type="button"
                        disabled={isProcessing}
                        aria-label={`Reducir cantidad de ${product.name}`}
                        onClick={() => {
                          setError("");
                          updateQuantity(
                            product.id,
                            quantity - 1
                          );
                        }}
                        className="flex size-11 items-center justify-center rounded-lg border border-line bg-surface-soft text-lg text-ink"
                      >
                        −
                      </button>

                      <span
                        aria-label={`${quantity} unidades`}
                        className="min-w-10 px-2 text-center text-sm font-semibold tabular-nums"
                      >
                        {quantity}
                      </span>

                      <button
                        type="button"
                        disabled={
                          isProcessing ||
                          quantity >= product.stock
                        }
                        aria-label={`Aumentar cantidad de ${product.name}`}
                        onClick={() => {
                          setError("");
                          updateQuantity(
                            product.id,
                            quantity + 1
                          );
                        }}
                        className="flex size-11 items-center justify-center rounded-lg border border-line bg-surface-soft text-lg text-ink"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      aria-label={`Eliminar ${product.name} del carrito`}
                      onClick={() => {
                        setError("");
                        removeFromCart(product.id);
                      }}
                      className="min-h-11 rounded-lg px-3 text-xs font-semibold text-danger"
                    >
                      Eliminar
                    </button>
                  </div>

                  {exceedsStock && (
                    <p
                      role="alert"
                      className="mt-3 mb-0 rounded-lg bg-danger-surface p-3 text-xs text-danger"
                    >
                      Quedan {product.stock} unidades.
                      Reducí la cantidad para continuar.
                    </p>
                  )}

                  {product.stock === 0 && (
                    <p className="mt-2 mb-0 text-xs text-muted">
                      Este producto está sin stock.
                    </p>
                  )}
                </article>
              );
            })}

            {missingProducts.map((item) => (
              <article
                key={item.productId}
                className="cumbre-card"
              >
                <h2 className="mb-2 text-sm">
                  Producto no disponible
                </h2>

                <p className="text-xs text-muted">
                  Este producto ya no está en el catálogo.
                  Quitalo del carrito para continuar.
                </p>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setError("");
                    removeFromCart(item.productId);
                  }}
                  className="min-h-11 rounded-lg bg-danger-surface px-3 text-xs font-semibold text-danger"
                >
                  Quitar producto no disponible
                </button>
              </article>
            ))}

            <Link
              to="/"
              className="inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
            >
              ← Seguir comprando
            </Link>
          </section>

          <aside
            aria-label="Resumen del pedido"
            className="cumbre-card lg:sticky lg:top-44"
          >
            <h2 className="mb-4 text-base font-bold">
              Resumen del pedido
            </h2>

            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted">Unidades</dt>
              <dd className="m-0 text-right">{units}</dd>

              <dt className="border-t border-line pt-3 font-semibold">
                Total
              </dt>
              <dd className="m-0 border-t border-line pt-3 text-right text-lg font-bold">
                {hasInvalidTotal ? "—" : formatMoney(total)}
              </dd>
            </dl>

            <p className="mb-4 text-xs text-muted">
              Compra con pago simulado. No se realizará
              ningún cobro.
            </p>

            {missingProducts.length > 0 && (
              <p className="mb-3 text-xs text-danger">
                Quitá los productos no disponibles para
                continuar.
              </p>
            )}

            {hasStockProblems && (
              <p className="mb-3 text-xs text-danger">
                Revisá las cantidades: algún producto no
                tiene stock suficiente.
              </p>
            )}

            {hasInvalidTotal && (
              <p className="mb-3 text-xs text-danger">
                No pudimos calcular el importe. Revisá el
                carrito antes de continuar.
              </p>
            )}

            {authLoading ? (
              <p
                role="status"
                className="text-xs text-muted"
              >
                Verificando sesión…
              </p>
            ) : !user ? (
              <p className="text-sm text-muted">
                Para confirmar, primero{" "}
                <Link
                  to="/login"
                  className="font-semibold text-wine"
                >
                  iniciá sesión
                </Link>
                .
              </p>
            ) : null}

            <button
              type="button"
              disabled={checkoutDisabled}
              onClick={handleConfirmOrder}
              className="cumbre-button w-full"
            >
              {isProcessing
                ? "Confirmando pedido…"
                : "Confirmar pedido"}
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setError("");
                clearCart();
              }}
              className="mt-2 min-h-11 w-full rounded-lg px-3 text-xs text-muted hover:bg-surface-soft"
            >
              Vaciar carrito
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}