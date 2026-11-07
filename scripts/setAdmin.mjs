import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const uid = process.argv[2];

  if (!uid) {
    throw new Error(
      "Falta el UID de la cuenta que será administradora."
    );
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY
      ?.trim()
      .replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de Firebase Admin en .env.local."
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  const adminAuth = getAuth();
  const account = await adminAuth.getUser(uid);

  await adminAuth.setCustomUserClaims(uid, {
    ...account.customClaims,
    role: "admin",
  });

  console.log(
    "Permiso de administrador asignado. Cerrá sesión en la tienda y volvé a ingresar."
  );
}

main().catch((error) => {
  console.error(
    "No se pudo asignar el permiso:",
    error?.code || "Revisá el UID y la configuración de Firebase Admin."
  );

  process.exitCode = 1;
});