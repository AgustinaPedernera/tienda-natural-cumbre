import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

class FirebaseAdminConfigError extends Error {
  public code: string;

  constructor(code: string) {
    super("Configuración de Firebase Admin inválida.");
    this.name = "FirebaseAdminConfigError";
    this.code = code;
  }
}

function loadLocalServerVariables() {
  const isDeployment =
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "production";

  // En los despliegues usamos exclusivamente
  // las variables configuradas en Vercel.
  if (isDeployment) return;

  let content: string;

  try {
    content = readFileSync(
      resolve(process.cwd(), ".env.local"),
      "utf8"
    );
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String(error.code)
        : "";

    // El archivo local es opcional si las variables
    // ya fueron proporcionadas por el entorno.
    if (code === "ENOENT") return;

    throw new FirebaseAdminConfigError(
      "config/cannot-read-local-env"
    );
  }

  const localVariables = parseEnv(content);

  const serverVariables: Record<string, string> = {
    FIREBASE_PROJECT_ID: "FIREBASE_PROJECT_ID",
    FIREBASE_CLIENT_EMAIL: "FIREBASE_CLIENT_EMAIL",
    FIREBASE_PRIVATE_KEY: "FIREBASE_PRIVATE_KEY",
    S3_REGION: "AWS_REGION",
    AWS_S3_BUCKET: "AWS_S3_BUCKET",
    S3_ACCESS_KEY_ID: "AWS_ACCESS_KEY_ID",
    S3_SECRET_ACCESS_KEY: "AWS_SECRET_ACCESS_KEY",
    AWS_CLOUDFRONT_URL: "AWS_CLOUDFRONT_URL",
  };

  for (const [name, legacyName] of Object.entries(serverVariables)) {
    // Las claves antiguas se aceptan solo desde el archivo local.
    // En Vercel se usan los nombres S3_* para no depender
    // de variables AWS_* reservadas por la plataforma.
    const value = localVariables[name]?.trim()
      ? localVariables[name]
      : localVariables[legacyName];
    if (!process.env[name]?.trim() && value?.trim()) {
      process.env[name] = value;
    }
  }
}

function readRequiredVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new FirebaseAdminConfigError(
      `config/missing-${name}`
    );
  }

  return value;
}

function getFirebaseAdminApp() {
  loadLocalServerVariables();

  const existingApp = getApps().find(
    (app) => app.name === "[DEFAULT]"
  );

  if (existingApp) {
    return existingApp;
  }

  const projectId = readRequiredVariable(
    "FIREBASE_PROJECT_ID"
  );

  const clientEmail = readRequiredVariable(
    "FIREBASE_CLIENT_EMAIL"
  );

  const privateKey = readRequiredVariable(
    "FIREBASE_PRIVATE_KEY"
  ).replace(/\\n/g, "\n");

  if (
    !privateKey.startsWith("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.endsWith("-----END PRIVATE KEY-----")
  ) {
    throw new FirebaseAdminConfigError(
      "config/invalid-private-key-format"
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}
