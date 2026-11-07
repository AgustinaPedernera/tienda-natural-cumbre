import {
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";

import { auth } from "../config/firebase";
import { useAuth } from "../hooks/useAuth";

const resetConfirmation =
  "Si el correo corresponde a una cuenta, recibirás instrucciones para recuperar tu contraseña. Revisá también la carpeta de spam.";

function getErrorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error
    ? String(error.code)
    : "";
}

function getAuthErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Probá nuevamente más tarde.";
    case "auth/popup-closed-by-user":
      return "Cerraste la ventana de Google antes de ingresar.";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google.";
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase.";
    case "auth/network-request-failed":
      return "No se pudo conectar. Revisá tu conexión.";
    default:
      return "No pudimos iniciar sesión. Intentá nuevamente.";
  }
}

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const emailInputRef = useRef<HTMLInputElement>(null);
  const requestInProgress = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "login" | "google" | "reset" | null
  >(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submitting = pendingAction !== null;

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (requestInProgress.current) return;

    requestInProgress.current = true;
    clearMessages();
    setPendingAction("login");

    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      requestInProgress.current = false;
      setPendingAction(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    clearMessages();
    setPendingAction("google");

    try {
      await loginWithGoogle();
      navigate("/", { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      requestInProgress.current = false;
      setPendingAction(null);
    }
  };

  const handlePasswordReset = async () => {
    if (requestInProgress.current) return;

    clearMessages();

    if (!email.trim()) {
      setError(
        "Escribí tu correo electrónico para recuperar la contraseña."
      );
      emailInputRef.current?.focus();
      return;
    }

    if (!emailInputRef.current?.reportValidity()) {
      return;
    }

    requestInProgress.current = true;
    setPendingAction("reset");

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(resetConfirmation);
    } catch (err) {
      switch (getErrorCode(err)) {
        case "auth/user-not-found":
          setMessage(resetConfirmation);
          break;
        case "auth/invalid-email":
          setError("El correo electrónico no es válido.");
          break;
        case "auth/too-many-requests":
          setError(
            "Demasiados intentos. Probá nuevamente más tarde."
          );
          break;
        case "auth/network-request-failed":
          setError(
            "No se pudo conectar. Revisá tu conexión e intentá nuevamente."
          );
          break;
        default:
          setError(
            "No pudimos solicitar la recuperación. Intentá nuevamente."
          );
      }
    } finally {
      requestInProgress.current = false;
      setPendingAction(null);
    }
  };

  return (
    <main className="cumbre-container py-5 md:py-8">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-3 inline-flex min-h-11 items-center text-sm text-muted no-underline hover:text-ink"
        >
          ← Volver al catálogo
        </Link>

        <section
          aria-labelledby="login-title"
          aria-busy={submitting}
          className="cumbre-card"
        >
          <header className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Tu cuenta
            </p>

            <h1
              id="login-title"
              className="mb-2 font-display text-2xl font-bold text-brand"
            >
              Ingresá a Cumbre
            </h1>

            <p className="mb-0 text-sm text-muted">
              Consultá tus compras y continuá con tu pedido.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4"
          >
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-xs font-semibold text-muted"
              >
                Correo electrónico
              </label>

              <input
                ref={emailInputRef}
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearMessages();
                }}
                disabled={submitting}
                className="cumbre-field"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1 block text-xs font-semibold text-muted"
              >
                Contraseña
              </label>

              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearMessages();
                }}
                disabled={submitting}
                className="cumbre-field"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="cumbre-error mb-0 text-sm"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="cumbre-success mb-0 text-sm"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="cumbre-button w-full"
            >
              {pendingAction === "login"
                ? "Ingresando…"
                : "Iniciar sesión"}
            </button>

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={submitting}
              className="min-h-11 rounded-lg px-2 text-sm font-semibold text-wine hover:bg-surface-soft"
            >
              {pendingAction === "reset"
                ? "Solicitando recuperación…"
                : "Olvidé mi contraseña"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-line"
            />
            <span className="text-xs text-muted">
              o continuá con
            </span>
            <span
              aria-hidden="true"
              className="h-px flex-1 bg-line"
            />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="cumbre-button cumbre-button-secondary w-full"
          >
            {pendingAction === "google"
              ? "Conectando con Google…"
              : "Continuar con Google"}
          </button>

          <p className="mt-5 mb-0 border-t border-line pt-4 text-center text-sm text-muted">
            ¿Todavía no tenés cuenta?{" "}
            <Link
              to="/register"
              className="inline-flex min-h-11 items-center font-semibold text-wine"
            >
              Registrate
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}