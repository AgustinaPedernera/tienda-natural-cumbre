import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getAdminAuth } from "../server/firebaseAdmin.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getExtension(contentType: unknown): string | null {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

function getErrorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error
    ? String(error.code)
    : "sin-codigo";
}

function readVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta configurar ${name}.`);
  }

  return value;
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
    let userId: string;

    try {
      const token = await adminAuth.verifyIdToken(
        authorization.slice(7).trim(),
        true
      );

      if (token.role !== "admin") {
        return res.status(403).json({
          error:
            "Necesitás permisos de administrador para subir imágenes.",
        });
      }

      userId = token.uid;
    } catch {
      return res.status(401).json({
        error: "Volvé a iniciar sesión para continuar.",
      });
    }

    const contentType: unknown = req.body?.contentType;
    const fileSize: unknown = req.body?.fileSize;

    const extension = getExtension(contentType);

    if (!extension) {
      return res.status(400).json({
        error: "Elegí una imagen JPG, PNG o WebP.",
      });
    }

    if (
      typeof fileSize !== "number" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_IMAGE_BYTES
    ) {
      return res.status(400).json({
        error: "La imagen debe pesar como máximo 5 MB y no estar vacía.",
      });
    }

    const region = readVariable("S3_REGION");
    const bucket = readVariable("AWS_S3_BUCKET");

    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: readVariable("S3_ACCESS_KEY_ID"),
        secretAccessKey: readVariable(
          "S3_SECRET_ACCESS_KEY"
        ),
      },
    });

    // El servidor elige el destino y genera un nombre único.
    // No utiliza el nombre original del archivo.
    const key =
      `products/${userId}/${randomUUID()}.${extension}`;

    const upload = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Expires: 60,
      Fields: {
        "Content-Type": String(contentType),
        success_action_status: "204",
      },
      Conditions: [
        ["content-length-range", 1, MAX_IMAGE_BYTES],
        ["eq", "$Content-Type", String(contentType)],
        ["eq", "$success_action_status", "204"],
      ],
    });

    return res.status(200).json({
      url: upload.url,
      fields: upload.fields,
      key,
      expiresIn: 60,
      maxBytes: MAX_IMAGE_BYTES,
    });
  } catch (error) {
    console.error(
      "Error preparando subida a S3. Código:",
      getErrorCode(error)
    );

    return res.status(500).json({
      error:
        "No se pudo preparar la carga de la imagen. Revisá la configuración del servidor.",
    });
  }
}
