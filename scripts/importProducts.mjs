import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "tienda-natural-cumbre";
const CATALOG_PATH = resolve("catalogo_cumbre_60_productos.json");

async function main() {
  const products = JSON.parse(
    await readFile(CATALOG_PATH, "utf8")
  );

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.trim()
    .replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de Firebase Admin. Cargá .env.local con --env-file."
    );
  }

  if (!Array.isArray(products)) {
    throw new Error("El catálogo debe ser un array de productos.");
  }

  if (projectId !== PROJECT_ID) {
    throw new Error(
      "La clave privada no corresponde al proyecto Firebase."
    );
  }

  const ids = new Set();

  for (const product of products) {
    if (
      typeof product.id !== "string" ||
      !product.id ||
      typeof product.name !== "string" ||
      !product.name ||
      typeof product.category !== "string" ||
      !product.category ||
      typeof product.price !== "number" ||
      !Number.isFinite(product.price) ||
      product.price < 0 ||
      !Number.isInteger(product.stock) ||
      product.stock < 0
    ) {
      throw new Error(
        `Producto inválido: ${JSON.stringify(product)}`
      );
    }

    if (ids.has(product.id)) {
      throw new Error(`ID duplicado: ${product.id}`);
    }

    ids.add(product.id);
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId: PROJECT_ID,
  });

  const db = getFirestore();
  const collection = db.collection("products");

  const references = products.map((product) =>
    collection.doc(product.id)
  );

  const existingDocuments = await db.getAll(...references);
  const batch = db.batch();

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    if (existingDocuments[i].exists) {
      skipped++;
      continue;
    }

    const { id, ...data } = products[i];

    batch.create(references[i], data);
    created++;
  }

  if (created > 0) {
    await batch.commit();
  }

  console.log("Importación completada.");
  console.log(`Productos nuevos: ${created}`);
  console.log(`Productos existentes: ${skipped}`);
  console.log(`Total del catálogo: ${products.length}`);
}

main().catch((error) => {
  console.error("Error al importar productos:", error.message);
  process.exitCode = 1;
});