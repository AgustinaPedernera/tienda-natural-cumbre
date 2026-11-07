import { describe, expect, it } from "vitest";
import { getConfigurationError } from "../config/environment";

describe("configuración de Firebase", () => {
  it("identifica variables ausentes sin revelar valores", () => {
    const error = getConfigurationError({ VITE_FIREBASE_API_KEY: "valor-privado" });
    expect(error).toContain("VITE_FIREBASE_PROJECT_ID");
    expect(error).not.toContain("valor-privado");
  });

  it("rechaza espacios y acepta una configuración completa", () => {
    const env = {
      VITE_FIREBASE_API_KEY: "config-web",
      VITE_FIREBASE_AUTH_DOMAIN: "proyecto.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "proyecto",
      VITE_FIREBASE_APP_ID: "app",
    };
    expect(getConfigurationError(env)).toBeNull();
    expect(getConfigurationError({ ...env, VITE_FIREBASE_API_KEY: "  " })).toContain("VITE_FIREBASE_API_KEY");
  });
});
