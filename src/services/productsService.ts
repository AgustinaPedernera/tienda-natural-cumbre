import {
  collection,
  getDocs,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import type { Product } from "../types/product";

export interface ManagedProduct extends Product {
  adminVersion: number;
  imageKey: string;
}

export interface ProductInput {
  name: string;
  category: string;
  price: number;
  stock: number;

  // undefined: conserva la imagen existente.
  // "": quita la imagen del producto.
  // Otro valor: ubicación de la imagen subida a S3.
  imageKey?: string;
}

function parseProduct(
  id: string,
  data: DocumentData
): ManagedProduct {
  if (
    typeof data.name !== "string" ||
    typeof data.category !== "string" ||
    !Number.isSafeInteger(data.price) ||
    data.price < 0 ||
    !Number.isSafeInteger(data.stock) ||
    data.stock < 0 ||
    (
      data.adminVersion !== undefined &&
      (
        !Number.isSafeInteger(data.adminVersion) ||
        data.adminVersion < 0
      )
    )
  ) {
    throw new Error(
      "Un producto tiene datos inválidos. Revisá el catálogo."
    );
  }

  return {
    id,
    name: data.name,
    category: data.category,
    price: data.price,
    stock: data.stock,
    rating:
      typeof data.rating === "number" ? data.rating : 0,
    imageUrl:
      typeof data.imageUrl === "string" ? data.imageUrl : "",
    imageKey:
      typeof data.imageKey === "string" ? data.imageKey : "",
    adminVersion: data.adminVersion ?? 0,
  };
}

function sortProducts(
  products: ManagedProduct[]
): ManagedProduct[] {
  return products.sort((a, b) =>
    a.name.localeCompare(b.name, "es")
  );
}

export async function getProducts(): Promise<ManagedProduct[]> {
  const snapshot = await getDocs(collection(db, "products"));

  return sortProducts(
    snapshot.docs.map((document) =>
      parseProduct(document.id, document.data())
    )
  );
}

export function subscribeToProducts(
  onProducts: (products: Product[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    collection(db, "products"),
    (snapshot) => {
      try {
        const products = snapshot.docs.map((document) =>
          parseProduct(document.id, document.data())
        );

        onProducts(sortProducts(products));
      } catch {
        onError();
      }
    },
    () => onError()
  );
}

async function manageProduct(
  action: "create" | "update" | "delete",
  product?: ProductInput,
  original?: ManagedProduct
): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debés iniciar sesión nuevamente.");
  }

  const token = await user.getIdToken();

  let response: Response;

  try {
    response = await fetch("/api/manageProduct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action,
        product,
        productId: original?.id,
        expectedVersion: original?.adminVersion,
        expectedStock: original?.stock,
      }),
    });
  } catch {
    throw new Error(
      "No se pudo conectar. Actualizá la lista para comprobar si el cambio se guardó antes de reintentarlo."
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
        : "No se pudo guardar el cambio.";

    throw new Error(message);
  }

  if (
    !result ||
    typeof result !== "object" ||
    !("message" in result) ||
    typeof result.message !== "string" ||
    !("productId" in result) ||
    typeof result.productId !== "string"
  ) {
    throw new Error(
      "Respuesta inesperada. Actualizá la lista para comprobar el cambio."
    );
  }

  return result.message;
}

export function createProduct(
  product: ProductInput
): Promise<string> {
  return manageProduct("create", product);
}

export function updateProduct(
  original: ManagedProduct,
  product: ProductInput
): Promise<string> {
  return manageProduct("update", product, original);
}

export function deleteProduct(
  original: ManagedProduct
): Promise<string> {
  return manageProduct("delete", undefined, original);
}