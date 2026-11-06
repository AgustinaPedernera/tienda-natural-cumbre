
import { auth } from "../config/firebase";
import type { CartItem } from "../types/cart";

export interface CheckoutResponse {
  message: string;
  orderId: string;
  total: number;
  status: "pending" | "processing" | "completed" | "cancelled";
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
    !("message" in result) ||
    typeof result.message !== "string" ||
    !("status" in result) ||
    typeof result.status !== "string" ||
    !["pending", "processing", "completed", "cancelled"].includes(
      result.status
    )
  ) {
    throw new Error(
      "El servidor devolvió una respuesta inesperada."
    );
  }

  return result as CheckoutResponse;
}
