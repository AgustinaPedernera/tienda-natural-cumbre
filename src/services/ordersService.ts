import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import type { CartItem } from "../types/cart";
import type { Order, OrderStatus } from "../types/order";

export interface CheckoutResponse {
  message: string;
  orderId: string;
  total: number;
  status: OrderStatus;
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "completed" ||
    value === "cancelled"
  );
}

function parseOrder(
  id: string,
  data: Record<string, unknown>
): Order {
  if (
    typeof data.userId !== "string" ||
    typeof data.createdAt !== "string" ||
    !Number.isFinite(Date.parse(data.createdAt)) ||
    typeof data.total !== "number" ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    !isOrderStatus(data.status) ||
    !Array.isArray(data.items)
  ) {
    throw new Error("Una orden tiene datos inválidos.");
  }

  const items = data.items.map((item: unknown) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("productId" in item) ||
      typeof item.productId !== "string" ||
      !("name" in item) ||
      typeof item.name !== "string" ||
      !("price" in item) ||
      typeof item.price !== "number" ||
      !Number.isSafeInteger(item.price) ||
      item.price < 0 ||
      !("quantity" in item) ||
      typeof item.quantity !== "number" ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      !("subtotal" in item) ||
      typeof item.subtotal !== "number" ||
      !Number.isSafeInteger(item.subtotal) ||
      item.subtotal < 0
    ) {
      throw new Error("Un producto de la orden tiene datos inválidos.");
    }

    return {
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    };
  });

  return {
    id,
    userId: data.userId,
    items,
    total: data.total,
    status: data.status,
    createdAt: data.createdAt,
  };
}

export async function getMyOrders(): Promise<Order[]> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debés iniciar sesión para ver tus compras.");
  }

  // El filtro es necesario: las reglas no filtran resultados.
  const ordersQuery = query(
    collection(db, "orders"),
    where("userId", "==", user.uid)
  );

  const snapshot = await getDocs(ordersQuery);

  return snapshot.docs
    .map((document) =>
      parseOrder(document.id, document.data())
    )
    .sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
}

export async function getMyOrder(
  orderId: string
): Promise<Order | null> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debés iniciar sesión para ver tu compra.");
  }

  if (!orderId || orderId.includes("/")) {
    throw new Error("El número de orden no es válido.");
  }

  const snapshot = await getDoc(doc(db, "orders", orderId));

  if (!snapshot.exists()) return null;

  const order = parseOrder(snapshot.id, snapshot.data());

  if (order.userId !== user.uid) {
    throw new Error("No tenés permiso para ver esta compra.");
  }

  return order;
}

export async function createOrder(
  items: CartItem[],
  requestId: string
): Promise<CheckoutResponse> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "Debés iniciar sesión para confirmar la compra."
    );
  }

  if (items.length === 0) {
    throw new Error("No podés confirmar un carrito vacío.");
  }

  const token = await user.getIdToken();

  let response: Response;

  try {
    response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        requestId,
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      }),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Intentá nuevamente."
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
        : "No se pudo confirmar la compra.";

    throw new Error(message);
  }

  if (
    !result ||
    typeof result !== "object" ||
    !("orderId" in result) ||
    typeof result.orderId !== "string" ||
    !("total" in result) ||
    typeof result.total !== "number" ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0 ||
    !("message" in result) ||
    typeof result.message !== "string" ||
    !("status" in result) ||
    !isOrderStatus(result.status)
  ) {
    throw new Error(
      "El servidor devolvió una respuesta inesperada."
    );
  }

  return {
    orderId: result.orderId,
    total: result.total,
    message: result.message,
    status: result.status,
  };
}