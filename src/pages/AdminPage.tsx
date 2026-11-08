import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { useAuth } from "../hooks/useAuth";
import { AdminLayout } from "../components/layout/AdminLayout";
import type { OrderStatus } from "../types/order";

interface AdminOrder {
  id: string;
  userId: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

const PAGE_SIZE = 8;

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pendiente",
  processing: "En preparación",
  completed: "Completada",
  cancelled: "Cancelada",
};

const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const actionLabels: Record<OrderStatus, string> = {
  pending: "Marcar pendiente",
  processing: "Preparar",
  completed: "Completar",
  cancelled: "Cancelar",
};

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "completed" ||
    value === "cancelled"
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function updateOrderStatus(
  order: AdminOrder,
  status: OrderStatus
): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debés iniciar sesión nuevamente.");
  }

  const token = await user.getIdToken();
  let response: Response;

  try {
    response = await fetch("/api/updateOrderStatus", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId: order.id,
        status,
        expectedStatus: order.status,
      }),
    });
  } catch {
    throw new Error(
      "No se pudo conectar. Actualizá las órdenes para comprobar el estado."
    );
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "No se pudo actualizar la orden.";

    throw new Error(message);
  }

  if (
    !result ||
    typeof result !== "object" ||
    !("orderId" in result) ||
    result.orderId !== order.id ||
    !("status" in result) ||
    result.status !== status ||
    !("message" in result) ||
    typeof result.message !== "string"
  ) {
    throw new Error(
      "Respuesta inesperada. Actualizá la lista para comprobar el estado."
    );
  }

  return result.message;
}

interface OrderActionsProps {
  order: AdminOrder;
  disabled: boolean;
  saving: boolean;
  confirming: boolean;
  onAction: (status: OrderStatus) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

function OrderActions({
  order,
  disabled,
  saving,
  confirming,
  onAction,
  onConfirm,
  onDismiss,
}: OrderActionsProps) {
  if (saving) {
    return (
      <p role="status" className="mb-0 text-xs text-muted">
        Guardando…
      </p>
    );
  }

  if (confirming) {
    return (
      <div className="rounded-lg border border-line bg-surface-soft p-3">
        <p className="mb-2 text-xs text-ink">
          ¿Cancelar el pedido? Se devolverá el stock y no
          podrá reabrirse.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className="min-h-11 rounded-lg bg-danger-surface px-3 text-xs font-semibold text-danger"
          >
            Confirmar cancelación
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={onDismiss}
            className="min-h-11 rounded-lg border border-line px-3 text-xs text-ink"
          >
            Conservar
          </button>
        </div>
      </div>
    );
  }

  if (transitions[order.status].length === 0) {
    return (
      <span className="text-xs text-muted">
        Orden finalizada
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions[order.status].map((nextStatus) => (
        <button
          key={nextStatus}
          type="button"
          disabled={disabled}
          onClick={() => onAction(nextStatus)}
          className={[
            "min-h-11 rounded-lg px-3 text-xs font-semibold",
            nextStatus === "cancelled"
              ? "border border-line bg-danger-surface text-danger"
              : "bg-brand text-on-brand",
          ].join(" ")}
        >
          {actionLabels[nextStatus]}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex rounded-full border border-line bg-surface-soft px-2.5 py-1 text-xs font-semibold text-ink">
      {statusLabels[status]}
    </span>
  );
}

function AdminOrders() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const savingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setLoadError("");

      try {
        const ordersCollection = collection(db, "orders");

        const ordersQuery = status
          ? query(
              ordersCollection,
              where("status", "==", status)
            )
          : query(ordersCollection);

        const snapshot = await getDocs(ordersQuery);

        const result: AdminOrder[] = snapshot.docs.map(
          (document) => {
            const data = document.data();

            if (
              typeof data.userId !== "string" ||
              typeof data.total !== "number" ||
              !Number.isSafeInteger(data.total) ||
              data.total < 0 ||
              !isOrderStatus(data.status) ||
              typeof data.createdAt !== "string" ||
              !Number.isFinite(Date.parse(data.createdAt))
            ) {
              throw new Error("Orden con datos inválidos.");
            }

            return {
              id: document.id,
              userId: data.userId,
              total: data.total,
              status: data.status,
              createdAt: data.createdAt,
            };
          }
        );

        result.sort(
          (a, b) =>
            Date.parse(b.createdAt) - Date.parse(a.createdAt)
        );

        if (active) {
          setOrders(result);
        }
      } catch {
        if (active) {
          setLoadError(
            "No pudimos cargar las órdenes. Revisá tu conexión y los permisos."
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
  }, [status, attempt]);

  const totalPages = Math.max(
    1,
    Math.ceil(orders.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleOrders = orders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleStatusChange = async (
    order: AdminOrder,
    nextStatus: OrderStatus
  ) => {
    if (savingRef.current) return;

    savingRef.current = true;
    setSavingId(order.id);
    setCancelId(null);
    setActionError("");
    setMessage("");

    try {
      const confirmation = await updateOrderStatus(
        order,
        nextStatus
      );

      if (mountedRef.current) {
        setMessage(confirmation);
      }
    } catch (error) {
      if (mountedRef.current) {
        setActionError(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la orden."
        );
      }
    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setSavingId(null);
        setAttempt((value) => value + 1);
      }
    }
  };

  const renderActions = (order: AdminOrder) => (
    <OrderActions
      order={order}
      disabled={savingId !== null || loading}
      saving={savingId === order.id}
      confirming={cancelId === order.id}
      onAction={(nextStatus) => {
        if (savingRef.current) return;

        setMessage("");
        setActionError("");

        if (nextStatus === "cancelled") {
          setCancelId(order.id);
        } else {
          setCancelId(null);
          void handleStatusChange(order, nextStatus);
        }
      }}
      onConfirm={() => {
        void handleStatusChange(order, "cancelled");
      }}
      onDismiss={() => setCancelId(null)}
    />
  );

  return (
    <AdminLayout
      title="Órdenes del comercio"
      description="Consultá pedidos y actualizá su estado."
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:max-w-60">
          <label
            htmlFor="admin-order-status"
            className="mb-1 block text-xs font-semibold text-muted"
          >
            Estado del pedido
          </label>

          <select
            id="admin-order-status"
            value={status}
            disabled={savingId !== null}
            onChange={(event) => {
              const value = event.target.value;

              if (value === "" || isOrderStatus(value)) {
                setStatus(value);
                setPage(1);
                setCancelId(null);
                setMessage("");
                setActionError("");
              }
            }}
            className="cumbre-field"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="processing">En preparación</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>

        <button
          type="button"
          disabled={loading || savingId !== null}
          onClick={() => {
            setCancelId(null);
            setMessage("");
            setActionError("");
            setAttempt((value) => value + 1);
          }}
          className="cumbre-button cumbre-button-secondary"
        >
          Actualizar
        </button>
      </div>

      {message && (
        <p role="status" className="cumbre-success mb-4 text-sm">
          {message}
        </p>
      )}

      {actionError && (
        <p role="alert" className="cumbre-error mb-4 text-sm">
          {actionError}
        </p>
      )}

      {loading ? (
        <p role="status" className="text-sm text-muted">
          Cargando órdenes…
        </p>
      ) : loadError ? (
        <p role="alert" className="cumbre-error">
          {loadError}
        </p>
      ) : orders.length === 0 ? (
        <div className="cumbre-card">
          <p className="mb-0 text-sm text-muted">
            No hay órdenes para este estado.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            {orders.length}{" "}
            {orders.length === 1 ? "orden encontrada" : "órdenes encontradas"}
          </p>

          {/* Celulares: tarjetas compactas. */}
          <div className="grid gap-3 md:hidden">
            {visibleOrders.map((order) => (
              <article key={order.id} className="cumbre-card">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2
                    title={order.id}
                    className="mb-0 text-sm font-bold"
                  >
                    Pedido #{order.id.slice(-8)}
                  </h2>

                  <StatusBadge status={order.status} />
                </div>

                <dl className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                  <dt className="text-muted">Fecha</dt>
                  <dd className="m-0 text-right">
                    {formatDate(order.createdAt)}
                  </dd>

                  <dt className="text-muted">Cliente</dt>
                  <dd
                    title={order.userId}
                    className="m-0 truncate text-right"
                  >
                    {order.userId}
                  </dd>

                  <dt className="text-muted">Total</dt>
                  <dd className="m-0 text-right text-sm font-bold">
                    {formatMoney(order.total)}
                  </dd>
                </dl>

                <details className="mb-3 text-xs">
                  <summary className="cursor-pointer py-2 text-muted">
                    Identificador completo
                  </summary>
                  <p className="mt-1 mb-0 break-all">
                    {order.id}
                  </p>
                </details>

                {renderActions(order)}
              </article>
            ))}
          </div>

          {/* Escritorio: tabla. */}
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
            <table className="w-full min-w-160 text-left text-sm">
              <caption className="sr-only">
                Órdenes del comercio
              </caption>

              <thead className="border-b border-line bg-surface-soft text-xs text-muted">
                <tr>
                  <th scope="col" className="p-3">Pedido</th>
                  <th scope="col" className="p-3">Cliente</th>
                  <th scope="col" className="p-3">Total</th>
                  <th scope="col" className="p-3">Estado</th>
                  <th scope="col" className="p-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {visibleOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="p-3 align-top">
                      <span
                        title={order.id}
                        className="block font-semibold"
                      >
                        #{order.id.slice(-8)}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {formatDate(order.createdAt)}
                      </span>
                      <details className="mt-1 text-xs">
                        <summary className="cursor-pointer py-1 text-muted">
                          Ver ID
                        </summary>
                        <span className="mt-1 block max-w-48 break-all">
                          {order.id}
                        </span>
                      </details>
                    </td>

                    <td className="p-3 align-top">
                      <span
                        title={order.userId}
                        className="block max-w-28 truncate text-xs text-muted"
                      >
                        {order.userId}
                      </span>
                    </td>

                    <td className="whitespace-nowrap p-3 align-top font-semibold">
                      {formatMoney(order.total)}
                    </td>

                    <td className="p-3 align-top">
                      <StatusBadge status={order.status} />
                    </td>

                    <td className="p-3 align-top">
                      {renderActions(order)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Páginas de órdenes"
              className="mt-4 flex flex-wrap items-center justify-between gap-3"
            >
              <button
                type="button"
                disabled={currentPage === 1 || savingId !== null}
                onClick={() => {
                  setCancelId(null);
                  setPage(currentPage - 1);
                }}
                className="cumbre-button cumbre-button-secondary"
              >
                Anterior
              </button>

              <span aria-live="polite" className="text-xs text-muted">
                Página {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  currentPage === totalPages ||
                  savingId !== null
                }
                onClick={() => {
                  setCancelId(null);
                  setPage(currentPage + 1);
                }}
                className="cumbre-button cumbre-button-secondary"
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </AdminLayout>
  );
}

export function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <p role="status" className="cumbre-container py-6 text-sm">
        Verificando permisos…
      </p>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return (
      <main className="cumbre-container py-8">
        <h1>Acceso restringido</h1>
        <p>Esta sección requiere permisos de administrador.</p>
        <Link to="/">Volver al catálogo</Link>
      </main>
    );
  }

  return <AdminOrders key={user.id} />;
}