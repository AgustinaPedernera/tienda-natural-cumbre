import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getAdminAuth, getAdminDb } from "../server/firebaseAdmin.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface ProductInput {
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface ProductImage {
  imageKey: string;
  imageUrl: string;
}

class ProductError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function getErrorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error
    ? String(error.code)
    : error instanceof Error
      ? error.name
      : "sin-codigo";
}

function readVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta configurar ${name}.`);
  }

  return value;
}

function hasImageSignature(
  bytes: Uint8Array,
  extension: string
): boolean {
  if (extension === "jpg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (extension === "png") {
    const signature = [
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
    ];

    return (
      bytes.length >= signature.length &&
      signature.every((value, index) => bytes[index] === value)
    );
  }

  if (extension === "webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  return false;
}

async function validateProductImage(
  value: unknown,
  adminId: string
): Promise<ProductImage | undefined> {
  // Si el formulario no envía una imagen, conserva
  // la que ya tiene el producto.
  if (value === undefined) {
    return undefined;
  }

  // Un valor vacío permite quitar la imagen del producto.
  if (value === "") {
    return {
      imageKey: "",
      imageUrl: "",
    };
  }

  if (typeof value !== "string" || value.length > 500) {
    throw new ProductError("La imagen seleccionada no es válida.");
  }

  const parts = value.split("/");

  if (
    parts.length !== 3 ||
    parts[0] !== "products" ||
    parts[1] !== adminId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(
      parts[2]
    )
  ) {
    throw new ProductError(
      "La imagen no corresponde a una carga válida de tu cuenta."
    );
  }

  const extension = parts[2].split(".").pop()!;

  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  const region = readVariable("S3_REGION");
  const bucket = readVariable("AWS_S3_BUCKET");
  const cloudFront = new URL(
    readVariable("AWS_CLOUDFRONT_URL")
  );

  if (
    cloudFront.protocol !== "https:" ||
    !/^[a-z0-9-]+\.cloudfront\.net$/.test(cloudFront.hostname) ||
    cloudFront.pathname !== "/" ||
    cloudFront.search ||
    cloudFront.hash ||
    cloudFront.username ||
    cloudFront.password ||
    cloudFront.port
  ) {
    throw new Error("AWS_CLOUDFRONT_URL tiene un formato inválido.");
  }

  const s3 = new S3Client({
    region,
    maxAttempts: 2,
    credentials: {
      accessKeyId: readVariable("S3_ACCESS_KEY_ID"),
      secretAccessKey: readVariable("S3_SECRET_ACCESS_KEY"),
    },
  });

  try {
    const metadata = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: value,
      })
    );

    if (
      typeof metadata.ContentLength !== "number" ||
      metadata.ContentLength <= 0 ||
      metadata.ContentLength > MAX_IMAGE_BYTES ||
      metadata.ContentType !== contentTypes[extension]
    ) {
      throw new ProductError(
        "La imagen debe ser JPG, PNG o WebP y pesar como máximo 5 MB."
      );
    }

    // Lee únicamente los primeros bytes para comprobar
    // que no sea solo un archivo con extensión de imagen.
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: value,
        Range: "bytes=0-15",
      })
    );

    if (!object.Body) {
      throw new ProductError("No se pudo leer la imagen subida.");
    }

    const bytes = await object.Body.transformToByteArray();

    if (!hasImageSignature(bytes, extension)) {
      throw new ProductError(
        "El contenido del archivo no coincide con el formato de imagen."
      );
    }
  } catch (error) {
    if (error instanceof ProductError) {
      throw error;
    }

    const code = getErrorCode(error);

    if (code === "NotFound" || code === "NoSuchKey") {
      throw new ProductError(
        "La imagen no está en S3. Volvé a subirla antes de guardar."
      );
    }

    console.error(
      "No se pudo verificar la imagen en S3. Código:",
      code
    );

    throw new ProductError(
      "No se pudo verificar la imagen. Revisá la configuración de S3.",
      503
    );
  }

  return {
    imageKey: value,
    imageUrl: `${cloudFront.origin}/${value
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Cache-Control", "no-store");

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

    const adminAuth = getAdminAuth();
    let adminId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(
        authorization.slice(7).trim(),
        true
      );

      if (decodedToken.role !== "admin") {
        return res.status(403).json({
          error: "Necesitás permisos de administrador.",
        });
      }

      adminId = decodedToken.uid;
    } catch {
      return res.status(401).json({
        error: "Volvé a iniciar sesión para continuar.",
      });
    }

    const action = req.body?.action;

    if (
      action !== "create" &&
      action !== "update" &&
      action !== "delete"
    ) {
      throw new ProductError("Acción inválida.");
    }

    const db = getAdminDb();
    let productId: string;

    if (action === "create") {
      productId = db.collection("products").doc().id;
    } else {
      const receivedId = req.body?.productId;

      if (
        typeof receivedId !== "string" ||
        receivedId.trim() === "" ||
        receivedId.length > 200 ||
        receivedId.includes("/")
      ) {
        throw new ProductError("El producto no es válido.");
      }

      productId = receivedId;
    }

    let productData: ProductInput | null = null;
    let imageData: ProductImage | undefined;

    if (action !== "delete") {
      const data = req.body?.product;

      if (
        !data ||
        typeof data.name !== "string" ||
        data.name.trim().length < 2 ||
        data.name.trim().length > 160 ||
        typeof data.category !== "string" ||
        data.category.trim().length < 2 ||
        data.category.trim().length > 80 ||
        !Number.isSafeInteger(data.price) ||
        data.price <= 0 ||
        !Number.isSafeInteger(data.stock) ||
        data.stock < 0
      ) {
        throw new ProductError(
          "Revisá nombre, categoría, precio y stock. Precio y stock deben ser números enteros."
        );
      }

      productData = {
        name: data.name.trim(),
        category: data.category.trim(),
        price: data.price,
        stock: data.stock,
      };
    }

    const expectedVersion = req.body?.expectedVersion;
    const expectedStock = req.body?.expectedStock;

    if (
      action !== "create" &&
      (
        !Number.isSafeInteger(expectedVersion) ||
        expectedVersion < 0 ||
        !Number.isSafeInteger(expectedStock) ||
        expectedStock < 0
      )
    ) {
      throw new ProductError(
        "Actualizá la lista antes de modificar este producto."
      );
    }

    if (action !== "delete") {
      imageData = await validateProductImage(
        req.body?.product?.imageKey,
        adminId
      );
    }

    const productRef = db.collection("products").doc(productId);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(productRef);
      const now = new Date().toISOString();

      if (action === "create") {
        if (snapshot.exists) {
          throw new ProductError(
            "No se pudo crear el producto. Intentá nuevamente.",
            409
          );
        }

        transaction.create(productRef, {
          ...productData!,
          imageUrl: "",
          imageKey: "",
          ...imageData,
          rating: 0,
          adminVersion: 1,
          createdAt: now,
          updatedAt: now,
          updatedBy: adminId,
        });

        return;
      }

      if (!snapshot.exists) {
        if (action === "delete") {
          return;
        }

        throw new ProductError(
          "El producto ya no existe. Actualizá la lista.",
          404
        );
      }

      const current = snapshot.data()!;
      const currentVersion = current.adminVersion ?? 0;

      if (
        !Number.isSafeInteger(currentVersion) ||
        currentVersion < 0
      ) {
        throw new ProductError(
          "La versión del producto no es válida.",
          409
        );
      }

      if (
        currentVersion !== expectedVersion ||
        current.stock !== expectedStock
      ) {
        throw new ProductError(
          "El producto cambió desde que lo cargaste. Actualizá la lista y volvé a editarlo.",
          409
        );
      }

      if (action === "delete") {
        const openOrdersQuery = db
          .collection("orders")
          .where("status", "in", ["pending", "processing"]);

        const openOrders = await transaction.get(
          openOrdersQuery
        );

        for (const orderSnapshot of openOrders.docs) {
          const order = orderSnapshot.data();

          if (!Array.isArray(order.items)) {
            throw new ProductError(
              "Hay una orden abierta con datos inválidos. Revisala antes de eliminar productos.",
              409
            );
          }

          const isInOrder = order.items.some(
            (item: unknown) =>
              typeof item === "object" &&
              item !== null &&
              "productId" in item &&
              item.productId === productId
          );

          if (isInOrder) {
            throw new ProductError(
              "Este producto tiene pedidos pendientes o en preparación. Resolvé esos pedidos antes de eliminarlo.",
              409
            );
          }
        }

        transaction.delete(productRef);
        return;
      }

      const nextVersion = currentVersion + 1;

      if (!Number.isSafeInteger(nextVersion)) {
        throw new ProductError(
          "La versión del producto no es válida.",
          409
        );
      }

      transaction.update(productRef, {
        ...productData!,
        ...imageData,
        adminVersion: nextVersion,
        updatedAt: now,
        updatedBy: adminId,
      });
    });

    return res.status(action === "create" ? 201 : 200).json({
      productId,
      message:
        action === "create"
          ? "Producto creado correctamente."
          : action === "update"
            ? "Producto actualizado correctamente."
            : "Producto eliminado correctamente.",
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return res.status(error.statusCode).json({
        error: error.message,
      });
    }

    console.error(
      "Error gestionando producto. Código:",
      getErrorCode(error)
    );

    return res.status(500).json({
      error: "No se pudo guardar el cambio. Intentá nuevamente.",
    });
  }
}
