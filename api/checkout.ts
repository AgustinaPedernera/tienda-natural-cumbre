
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "./firebaseAdmin.js";

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type ValidatedProduct = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

class CheckoutError extends Error {
  constructor(
    message: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = "CheckoutError";
  }
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
    // 1. Validar la sesión del usuario.
    const authorization = req.headers.authorization;

    if (
      typeof authorization !== "string" ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        error: "Debés iniciar sesión para comprar.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        error: "Falta el token de autenticación.",
      });
    }

    let userId: string;

    try {
      const decodedToken =
        await getAdminAuth().verifyIdToken(token);

      userId = decodedToken.uid;
    } catch {
      return res.status(401).json({
        error: "Tu sesión no es válida.",
      });
    }

    // 2. Validar el identificador de la compra.
    const requestId = req.body?.requestId;

    if (
      typeof requestId !== "string" ||
      !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)
    ) {
      return res.status(400).json({
        error: "Identificador de compra inválido.",
      });
    }

    // 3. Validar el carrito recibido.
    const items: unknown = req.body?.items;

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 100
    ) {
      return res.status(400).json({
        error: "El carrito debe tener entre 1 y 100 productos.",
      });
    }

    const validItems: CheckoutItem[] = [];
    const productIds = new Set<string>();

    for (const item of items) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.productId !== "string" ||
        item.productId.trim() === "" ||
        item.productId.length > 200 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 1000
      ) {
        return res.status(400).json({
          error: "El carrito contiene datos inválidos.",
        });
      }

      if (productIds.has(item.productId)) {
        return res.status(400).json({
          error: "El carrito contiene productos duplicados.",
        });
      }

      productIds.add(item.productId);

      validItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // 4. Crear una huella del contenido de la compra.
    // El orden de los productos no debe afectar el resultado.
    const normalizedItems = [...validItems].sort(
      (a, b) => a.productId.localeCompare(b.productId)
    );

    const cartFingerprint = createHash("sha256")
      .update(JSON.stringify(normalizedItems))
      .digest("hex");

    const db = getAdminDb();

    // La orden queda asociada al usuario y al requestId.
    const orderId = `${userId}_${requestId}`;

    const orderRef = db.collection("orders").doc(orderId);

    const productRefs = validItems.map((item) =>
      db.collection("products").doc(item.productId)
    );

    // 5. Ejecutar la compra mediante una transacción.
    const result = await db.runTransaction(
      async (transaction) => {
        const existingOrder = await transaction.get(orderRef);

        // Si ya existe, verificar que sea exactamente
        // la misma solicitud de compra.
        if (existingOrder.exists) {
          const previousOrder = existingOrder.data();

          if (
            !previousOrder ||
            previousOrder.userId !== userId ||
            previousOrder.cartFingerprint !== cartFingerprint
          ) {
            throw new CheckoutError(
              "Este identificador ya fue utilizado para otra compra.",
              409
            );
          }

          return {
            orderId,
            total: previousOrder.total as number,
            status: previousOrder.status as string,
            alreadyProcessed: true,
          };
        }

        // Todas las lecturas antes de las escrituras.
        const snapshots = await transaction.getAll(
          ...productRefs
        );

        const validatedProducts: ValidatedProduct[] = [];

        for (let index = 0; index < validItems.length; index++) {
          const item = validItems[index];
          const snapshot = snapshots[index];

          if (!snapshot.exists) {
            throw new CheckoutError(
              `El producto ${item.productId} ya no está disponible.`
            );
          }

          const product = snapshot.data();

          if (!product) {
            throw new CheckoutError(
              "No se pudo consultar uno de los productos."
            );
          }

          const { name, price, stock } = product;

          if (
            typeof name !== "string" ||
            !Number.isSafeInteger(price) ||
            price < 0 ||
            !Number.isSafeInteger(stock) ||
            stock < 0
          ) {
            throw new CheckoutError(
              "Uno de los productos tiene datos inválidos."
            );
          }

          if (stock < item.quantity) {
            throw new CheckoutError(
              `Stock insuficiente para ${name}. Disponibles: ${stock}.`
            );
          }

          const subtotal = price * item.quantity;

          if (!Number.isSafeInteger(subtotal)) {
            throw new CheckoutError(
              "El importe de la compra es inválido."
            );
          }

          validatedProducts.push({
            productId: item.productId,
            name,
            price,
            quantity: item.quantity,
            subtotal,
          });
        }

        // 6. Calcular el total usando precios de Firestore.
        const total = validatedProducts.reduce(
          (sum, product) => sum + product.subtotal,
          0
        );

        if (!Number.isSafeInteger(total)) {
          throw new CheckoutError(
            "El total de la compra es inválido."
          );
        }

        const orderItems = validatedProducts.map(
          ({ productId, name, price, quantity, subtotal }) => ({
            productId,
            name,
            price,
            quantity,
            subtotal,
          })
        );

        // 7. Crear la orden.
        transaction.create(orderRef, {
          userId,
          requestId,
          cartFingerprint,
          items: orderItems,
          total,
          status: "pending",
          createdAt: new Date().toISOString(),
        });

        // 8. Descontar el stock real.
        for (let index = 0; index < validItems.length; index++) {
          transaction.update(productRefs[index], {
            stock: FieldValue.increment(
              -validItems[index].quantity
            ),
          });
        }

        return {
          orderId,
          total,
          status: "pending",
          alreadyProcessed: false,
        };
      }
    );

    // 9. Devolver la confirmación.
    return res.status(result.alreadyProcessed ? 200 : 201).json({
      message: result.alreadyProcessed
        ? "Esta compra ya había sido registrada."
        : "Compra confirmada correctamente.",
      orderId: result.orderId,
      total: result.total,
      status: result.status,
    });
  } catch (error) {
    console.error("Error en checkout:", error);

    if (error instanceof CheckoutError) {
      return res.status(error.statusCode).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: "No se pudo procesar la compra.",
    });
  }
}
