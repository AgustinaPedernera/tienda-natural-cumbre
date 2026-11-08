import { auth } from "../config/firebase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Elegí una imagen JPG, PNG o WebP.");
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      "La imagen debe pesar como máximo 5 MB y no estar vacía."
    );
  }
}

export async function uploadProductImage(
  file: File
): Promise<string> {
  validateImageFile(file);

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debés iniciar sesión nuevamente.");
  }

  const token = await user.getIdToken();

  let authorizationResponse: Response;

  try {
    authorizationResponse = await fetch(
      "/api/createImageUpload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contentType: file.type,
          fileSize: file.size,
        }),
      }
    );
  } catch {
    throw new Error(
      "No pudimos conectar con el servidor para preparar la imagen."
    );
  }

  const result: unknown = await authorizationResponse
    .json()
    .catch(() => null);

  if (!authorizationResponse.ok) {
    const message =
      isRecord(result) && typeof result.error === "string"
        ? result.error
        : "No se pudo autorizar la subida de la imagen.";

    throw new Error(message);
  }

  if (
    !isRecord(result) ||
    typeof result.url !== "string" ||
    typeof result.key !== "string" ||
    !result.key.startsWith(`products/${user.uid}/`) ||
    !isRecord(result.fields) ||
    result.fields.key !== result.key
  ) {
    throw new Error(
      "El servidor devolvió una autorización de imagen inválida."
    );
  }

  let destination: URL;

  try {
    destination = new URL(result.url);
  } catch {
    throw new Error("La dirección de subida no es válida.");
  }

  if (
    destination.protocol !== "https:" ||
    !destination.hostname.endsWith(".amazonaws.com") ||
    destination.username ||
    destination.password
  ) {
    throw new Error("El destino de la imagen no es válido.");
  }

  const formData = new FormData();

  for (const [name, value] of Object.entries(result.fields)) {
    if (typeof value !== "string") {
      throw new Error(
        "El servidor devolvió campos de autorización inválidos."
      );
    }

    formData.append(name, value);
  }

  // S3 requiere el archivo después de los demás campos.
  formData.append("file", file);

  let uploadResponse: Response;

  try {
    // No agregar Content-Type ni el token de Firebase:
    // el navegador genera el encabezado multipart,
    // y los campos recibidos autorizan la carga a S3.
    uploadResponse = await fetch(destination.href, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "No pudimos enviar la imagen a S3. Revisá la conexión y la configuración CORS."
    );
  }

  if (!uploadResponse.ok) {
    throw new Error(
      "S3 rechazó la imagen. Intentá nuevamente; si continúa, revisaremos los permisos."
    );
  }

  if (auth.currentUser?.uid !== user.uid) {
    throw new Error(
      "La sesión cambió durante la carga. Volvé a iniciar el proceso."
    );
  }

  // Devuelve la ubicación del archivo.
  // El servidor construirá la URL permanente de CloudFront.
  return result.key;
}