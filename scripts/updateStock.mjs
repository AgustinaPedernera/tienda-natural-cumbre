import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

if (projectId !== "tienda-natural-cumbre") {
  throw new Error(
    "La clave privada no corresponde a Tienda Natural Cumbre."
  );
}

initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  projectId: "tienda-natural-cumbre",
});

const db = getFirestore();

async function updateStock() {
  const snapshot = await db.collection("products").get();

  if (snapshot.empty) {
    console.log("No se encontraron productos.");
    return;
  }

  const batch = db.batch();
  let updated = 0;
  let unchanged = 0;

  snapshot.docs.forEach((document) => {
    // Solo actualizamos productos sin stock.
    if (document.data().stock === 0) {
      batch.update(document.ref, {
        stock: 20,
      });
      updated++;
    } else {
      unchanged++;
    }
  });

  if (updated > 0) {
    await batch.commit();
  }

  console.log("Actualización completada.");
  console.log(`Productos actualizados: ${updated}`);
  console.log(`Productos sin cambios: ${unchanged}`);
  console.log(`Total de productos: ${snapshot.size}`);
}

updateStock().catch((error) => {
  console.error("Error al actualizar stock:", error.message);
  process.exitCode = 1;
});