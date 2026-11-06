
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useProducts } from "../hooks/useProducts";
import { createOrder } from "../services/ordersService";

export function CartPage() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart();

  const { products } = useProducts();
  const { user } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    orderId: string;
    total: number;
  } | null>(null);

  const processingRef = useRef(false);

  const pendingRequestRef = useRef<{
    fingerprint: string;
    requestId: string;
  } | null>(null);

  const cartProducts = items.flatMap((item) => {
    const product = products.find(
      (product) => product.id === item.productId
    );

    if (!product) return [];

    return [{ ...item, product }];
  });

  const total = cartProducts.reduce(
    (sum, item) =>
      sum + item.product.price * item.quantity,
    0
  );

  const hasMissingProducts =
    cartProducts.length !== items.length;

  const hasStockProblems = cartProducts.some(
    ({ product, quantity }) =>
      quantity > product.stock || quantity <= 0
  );

  const handleConfirmOrder = async () => {
    if (processingRef.current) return;

    setError("");

    if (!user) {
      setError("Debés iniciar sesión para confirmar tu compra.");
      return;
    }

    if (
      items.length === 0 ||
      hasMissingProducts ||
      hasStockProblems
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
        orderId: result.orderId,
        total: result.total,
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
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <h1>Mi carrito 🛒</h1>

      {confirmation && (
        <section
          role="status"
          style={{
            padding: "20px",
            marginBottom: "20px",
            border: "1px solid #9ac9a9",
            borderRadius: "12px",
            backgroundColor: "#eef8f0",
            color: "#205c36",
          }}
        >
          <h2>¡Compra confirmada! 🎉</h2>

          <p>Tu orden fue registrada correctamente.</p>

          <p>
            <strong>Número de orden:</strong>{" "}
            {confirmation.orderId}
          </p>

          <p>
            <strong>Total:</strong> $
            {confirmation.total.toLocaleString("es-AR")}
          </p>

          <p>Estado de la orden: Pendiente</p>
        </section>
      )}

      {error && (
        <p
          role="alert"
          style={{
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "#fff0f0",
            color: "#a32020",
          }}
        >
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <>
          {!confirmation && <p>Tu carrito está vacío.</p>}
          <Link to="/">Volver al catálogo</Link>
        </>
      ) : (
        <>
          {cartProducts.map(({ product, quantity }) => (
            <article
              key={product.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <h2>{product.name}</h2>

              <p>
                Precio unitario: $
                {product.price.toLocaleString("es-AR")}
              </p>

              <p>
                Subtotal: $
                {(product.price * quantity).toLocaleString(
                  "es-AR"
                )}
              </p>

              <p>
                Stock disponible:{" "}
                {Math.max(0, product.stock - quantity)}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(product.id, quantity - 1)
                  }
                  disabled={isProcessing}
                  aria-label={`Reducir cantidad de ${product.name}`}
                >
                  −
                </button>

                <span>Cantidad: {quantity}</span>

                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(product.id, quantity + 1)
                  }
                  disabled={
                    isProcessing ||
                    quantity >= product.stock
                  }
                  aria-label={`Aumentar cantidad de ${product.name}`}
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => removeFromCart(product.id)}
                  disabled={isProcessing}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}

          {hasMissingProducts && (
            <p role="alert">
              Algunos productos del carrito ya no están
              disponibles. Eliminá esos productos antes de
              continuar.
            </p>
          )}

          <h2>
            Total: ${total.toLocaleString("es-AR")}
          </h2>

          {!user && (
            <p>
              Para confirmar tu compra, primero tenés que{" "}
              <Link to="/login">iniciar sesión</Link>.
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={clearCart}
              disabled={isProcessing}
            >
              Vaciar carrito
            </button>

            <button
              type="button"
              onClick={handleConfirmOrder}
              disabled={
                isProcessing ||
                !user ||
                hasMissingProducts ||
                hasStockProblems
              }
              style={{
                backgroundColor: "#26734d",
                color: "white",
                padding: "12px 20px",
                border: "none",
                borderRadius: "8px",
                cursor: isProcessing
                  ? "wait"
                  : "pointer",
                opacity: isProcessing ? 0.7 : 1,
              }}
            >
              {isProcessing
                ? "Procesando compra..."
                : "Confirmar compra"}
            </button>
          </div>

          <p>
            <Link to="/">Seguir comprando</Link>
          </p>
        </>
      )}
    </main>
  );
}
