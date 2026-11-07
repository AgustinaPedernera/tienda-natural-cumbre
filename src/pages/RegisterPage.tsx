import {
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

function getRegisterErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese correo electrónico.";
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "La contraseña no cumple los requisitos de seguridad de la cuenta.";
    case "auth/network-request-failed":
      return "No se pudo conectar. Revisá tu conexión.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Probá nuevamente más tarde.";
    default:
      return "No pudimos crear la cuenta. Intentá nuevamente.";
  }
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const requestInProgress = useRef(false);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (requestInProgress.current) return;

    setError("");

    if (password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      confirmInputRef.current?.focus();
      return;
    }

    requestInProgress.current = true;
    setSubmitting(true);

    try {
      await register(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getRegisterErrorMessage(err));
    } finally {
      requestInProgress.current = false;
      setSubmitting(false);
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
          aria-labelledby="register-title"
          aria-busy={submitting}
          className="cumbre-card"
        >
          <header className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Tu cuenta
            </p>

            <h1
              id="register-title"
              className="mb-2 font-display text-2xl font-bold text-brand"
            >
              Sumate a Cumbre
            </h1>

            <p className="mb-0 text-sm text-muted">
              Creá tu cuenta para realizar pedidos y consultar
              tus compras.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4"
          >
            <div>
              <label
                htmlFor="register-email"
                className="mb-1 block text-xs font-semibold text-muted"
              >
                Correo electrónico
              </label>

              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                disabled={submitting}
                className="cumbre-field"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-1 block text-xs font-semibold text-muted"
              >
                Contraseña
              </label>

              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                aria-describedby="register-password-help"
                minLength={6}
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                disabled={submitting}
                className="cumbre-field"
              />

              <p
                id="register-password-help"
                className="mt-2 mb-0 text-xs text-muted"
              >
                Usá al menos 6 caracteres.
              </p>
            </div>

            <div>
              <label
                htmlFor="register-confirm"
                className="mb-1 block text-xs font-semibold text-muted"
              >
                Confirmar contraseña
              </label>

              <input
                ref={confirmInputRef}
                id="register-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
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

            <button
              type="submit"
              disabled={submitting}
              className="cumbre-button w-full"
            >
              {submitting
                ? "Creando cuenta…"
                : "Crear mi cuenta"}
            </button>
          </form>

          <p className="mt-5 mb-0 border-t border-line pt-4 text-center text-sm text-muted">
            ¿Ya tenés cuenta?{" "}
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center font-semibold text-wine"
            >
              Iniciá sesión
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}