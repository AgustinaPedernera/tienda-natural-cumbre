import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useParams,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import {
  getMyOrder,
  getMyOrders,
} from "../services/ordersService";
import { Pagination } from "../components/ui/Pagination";
import type { Order, OrderStatus } from "../types/order";

const PAGE_SIZE = 8;

const statusLabels: Record<OrderStatus, string> = {
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function OrdersContent({ orderId }: { orderId?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        let result: Order[];

        if (orderId) {
          const order = await getMyOrder(orderId);
          result = order ? [order] : [];
        } else {
          result = await getMyOrders();
        }

        if (active) {
          setOrders(result);
        }
      } catch {
        if (active) {
          setError(
            orderId
              ? "No pudimos abrir esta compra. Puede que no exista o que no tengas permiso para verla."
              : "No pudimos cargar tus compras. Revisá tu conexión e intentá nuevamente."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      active = false;
    };
  }, [orderId, attempt]);

  const totalPages = Math.max(
    1,
    Math.ceil(orders.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleOrders = orderId
    ? orders
    : orders.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      );

  return (
    <main className="cumbre-container py-5 md:py-7">
      <div className="mx-auto max-w-4xl">
        <Link
          to={orderId ? "/orders" : "/"}
          className="mb-3 inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
        >
          {orderId
            ? "← Volver a mis compras"
            : "← Volver al catálogo"}
        </Link>

        <header className="mb-5 border-b border-line pb-4">
          <h1 className="mb-1 text-xl font-bold md:text-2xl">
            {orderId ? "Detalle de compra" : "Mis compras"}
          </h1>

          <p className="mb-0 text-sm text-muted">
            {orderId
              ? "Productos, importes y estado de tu pedido."
              : "Consultá el historial y el estado de tus pedidos."}
          </p>
        </header>

        {loading ? (
          <p role="status" className="text-sm text-muted">
            Cargando compras…
          </p>
        ) : error ? (
          <div role="alert" className="cumbre-error">
            <p className="text-sm">{error}</p>

            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="cumbre-button cumbre-button-secondary"
            >
              Volver a intentar
            </button>
          </div>
        ) : orders.length === 0 ? (
          <section className="cumbre-card">
            <h2 className="text-base">
              {orderId
                ? "Compra no encontrada"
                : "Todavía no tenés compras"}
            </h2>

            <p className="text-sm text-muted">
              {orderId
                ? "No encontramos esta orden."
                : "Tus pedidos aparecerán acá después de confirmar una compra."}
            </p>

            <Link to="/" className="cumbre-button">
              Explorar catálogo
            </Link>
          </section>
        ) : (
          <>
            <div
              className={
                orderId
                  ? "grid gap-3"
                  : "grid gap-3 md:grid-cols-2"
              }
            >
              {visibleOrders.map((order) => {
                const units = order.items.reduce(
                  (total, item) => total + item.quantity,
                  0
                );

                return (
                  <article
                    key={order.id}
                    className="cumbre-card"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h2
                        title={order.id}
                        className="mb-0 text-base font-bold"
                      >
                        Pedido #{order.id.slice(-8)}
                      </h2>

                      <span className="rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-semibold text-ink">
                        {statusLabels[order.status]}
                      </span>
                    </div>

                    <p className="text-xs text-muted">
                      {formatDate(order.createdAt)}
                    </p>

                    {orderId ? (
                      <section
                        aria-label="Productos comprados"
                        className="my-4 divide-y divide-line border-y border-line"
                      >
                        {order.items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="min-w-0">
                              <h3 className="mb-1 text-sm font-semibold">
                                {item.name}
                              </h3>

                              <p className="mb-0 text-xs text-muted">
                                {item.quantity}{" "}
                                {item.quantity === 1
                                  ? "unidad"
                                  : "unidades"}{" "}
                                × {formatMoney(item.price)}
                              </p>
                            </div>

                            <p className="mb-0 shrink-0 text-sm font-semibold">
                              {formatMoney(item.subtotal)}
                            </p>
                          </div>
                        ))}
                      </section>
                    ) : (
                      <p className="text-sm text-muted">
                        {units}{" "}
                        {units === 1 ? "unidad" : "unidades"}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="mb-0 text-lg font-bold">
                        {formatMoney(order.total)}
                      </p>

                      {!orderId && (
                        <Link
                          to={`/orders/${encodeURIComponent(order.id)}`}
                          className="cumbre-button cumbre-button-secondary"
                        >
                          Ver detalle
                        </Link>
                      )}
                    </div>

                    {orderId && (
                      <details className="mt-4 border-t border-line pt-3">
                        <summary className="cursor-pointer py-2 text-xs text-muted">
                          Número completo de orden
                        </summary>

                        <p className="mt-2 mb-0 break-all text-xs text-muted">
                          {order.id}
                        </p>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>

            {!orderId && (
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

export function OrdersPage() {
  const { user, loading } = useAuth();
  const { orderId } = useParams<{ orderId: string }>();

  if (loading) {
    return (
      <p
        role="status"
        className="cumbre-container py-6 text-sm text-muted"
      >
        Verificando sesión…
      </p>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <OrdersContent
      key={`${user.id}:${orderId ?? "list"}`}
      orderId={orderId}
    />
  );
}