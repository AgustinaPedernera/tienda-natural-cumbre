const requiredVariables = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export function getConfigurationError(env: Record<string, unknown>): string | null {
  const missing = requiredVariables.filter((name) => {
    const value = env[name];
    return typeof value !== "string" || value.trim() === "";
  });

  return missing.length
    ? `Faltan variables de configuración: ${missing.join(", ")}. Completá .env.local y reiniciá el servidor. En Vercel, configurá las variables y generá un nuevo despliegue.`
    : null;
}
