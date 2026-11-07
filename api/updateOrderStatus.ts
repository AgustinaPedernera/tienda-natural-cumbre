import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb } from "./firebaseAdmin.js";

type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cancelled";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

class OrderError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isStatus(value: unknown): value is OrderStatus {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "completed" ||
    value === "cancelled"
  );
}

function getErrorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error
    ? String(error.code)
    : "sin-codigo";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  try {
    const authorization = req.headers.authorization;

    if (
      typeof authorization !== "string" ||
      !authorization.startsWith("Bearer ") ||
      !authorization.slice(7).trim()
    ) {
      return res.status(401).json({
        error: "Debés iniciar sesión.",
      });
    }

    // La configuración del servidor puede fallar antes
    // de verificar el token.
    const adminAuth = getAdminAuth();

    let adminId: string;

    try {
      const token = authorization.slice(7).trim();
      const decodedToken = await adminAuth.verifyIdToken(
        token,
        true
      );

      if (decodedToken.role !== "admin") {
        return res.status(403).json({
          error: "Necesitás permisos de administrador.",
        });
      }

      adminId = decodedToken.uid;
    } catch (error) {
      console.error(
        "Error verificando administrador. Código:",
        getErrorCode(error)
      );

      return res.status(401).json({
        error: "Volvé a iniciar sesión para continuar.",
      });
    }

    const orderId: unknown = req.body?.orderId;
    const nextStatus: unknown = req.body?.status;
    const expectedStatus: unknown = req.body?.expectedStatus;

    if (
      typeof orderId !== "string" ||
      orderId.trim() === "" ||
      orderId.length > 500 ||
      orderId.includes("/") ||
      !isStatus(nextStatus) ||
      !isStatus(expectedStatus)
    ) {
      return res.status(400).json({
        error: "Los datos del cambio de estado no son válidos.",
      });
    }

    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderId);

    const result = await db.runTransaction(
      async (transaction) => {
        const orderSnapshot = await transaction.get(orderRef);

        if (!orderSnapshot.exists) {
          throw new OrderError("La orden no existe.", 404);
        }

        const order = orderSnapshot.data();

        if (!order || !isStatus(order.status)) {
          throw new OrderError(
            "La orden tiene un estado inválido.",
            409
          );
        }

        const currentStatus = order.status;

        // Un reintento del mismo cambio no vuelve a
        // descontar ni devolver stock.
        if (currentStatus === nextStatus) {
          return { alreadyApplied: true };
        }

        // Evita aplicar una acción sobre datos desactualizados.
        if (currentStatus !== expectedStatus) {
          throw new OrderError(
            "La orden cambió desde que la abriste. Actualizá la lista antes de continuar.",
            409
          );
        }

        if (!transitions[currentStatus].includes(nextStatus)) {
          throw new OrderError(
            "Ese cambio de estado no está permitido.",
            409
          );
        }

        if (nextStatus === "cancelled") {
          if (
            !Array.isArray(order.items) ||
            order.items.length === 0 ||
            order.items.length > 100
          ) {
            throw new OrderError(
              "No se puede cancelar: los productos de la orden tienen datos inválidos.",
              409
            );
          }

          const quantities = new Map<string, number>();

          for (const item of order.items) {
            if (
              !item ||
              typeof item !== "object" ||
              typeof item.productId !== "string" ||
              item.productId.trim() === "" ||
              item.productId.length > 200 ||
              item.productId.includes("/") ||
              !Number.isSafeInteger(item.quantity) ||
              item.quantity <= 0 ||
              item.quantity > 1000 ||
              quantities.has(item.productId)
            ) {
              throw new OrderError(
                "No se puede cancelar: los productos de la orden tienen datos inválidos.",
                409
              );
            }

            quantities.set(item.productId, item.quantity);
          }

          const productIds = [...quantities.keys()];
          const productRefs = productIds.map((id) =>
            db.collection("products").doc(id)
          );

          // Primero se leen todos los productos.
          const snapshots = await transaction.getAll(
            ...productRefs
          );

          const restoredStocks = snapshots.map(
            (snapshot, index) => {
              if (!snapshot.exists) {
                throw new OrderError(
                  "No se puede devolver stock porque un producto ya no existe. Revisá el catálogo antes de cancelar.",
                  409
                );
              }

              const stock = snapshot.data()?.stock;
              const quantity = quantities.get(
                productIds[index]
              )!;

              if (
                !Number.isSafeInteger(stock) ||
                stock < 0 ||
                !Number.isSafeInteger(stock + quantity)
              ) {
                throw new OrderError(
                  "No se puede devolver stock porque un producto tiene datos inválidos.",
                  409
                );
              }

              return stock + quantity;
            }
          );

          // Las escrituras se hacen después de las lecturas.
          productRefs.forEach((productRef, index) => {
            transaction.update(productRef, {
              stock: restoredStocks[index],
            });
          });
        }

        const now = new Date().toISOString();

        transaction.update(orderRef, {
          status: nextStatus,
          updatedAt: now,
          updatedBy: adminId,
          ...(nextStatus === "cancelled"
            ? { cancelledAt: now, stockRestoredAt: now }
            : {}),
        });

        return { alreadyApplied: false };
      }
    );

    return res.status(200).json({
      orderId,
      status: nextStatus,
      message: result.alreadyApplied
        ? "La orden ya tenía ese estado."
        : "Estado actualizado correctamente.",
    });
  } catch (error) {
    if (error instanceof OrderError) {
      return res.status(error.statusCode).json({
        error: error.message,
      });
    }

    console.error(
      "Error actualizando orden. Código:",
      getErrorCode(error)
    );

    return res.status(500).json({
      error: "No se pudo actualizar la orden. Intentá nuevamente.",
    });
  }
}