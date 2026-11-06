
import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #b7c8c1",
  borderRadius: "8px",
  fontSize: "16px",
  boxSizing: "border-box",
  backgroundColor: "#ffffff",
  color: "#173f4f",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  padding: "13px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#216653",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 600,
  cursor: "pointer",
};

function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setSubmitting(true);

    try {
      await loginWithGoogle();
      navigate("/", { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "80vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "32px",
          backgroundColor: "#f8faf9",
          color: "#173f4f",
          borderRadius: "16px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        }}
      >
        <h1 style={{ color: "#173f4f", textAlign: "center" }}>
          Bienvenido a Tienda Natural
        </h1>

        <p style={{ textAlign: "center", color: "#52665e" }}>
          Ingresá a tu cuenta para continuar.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "16px", marginTop: "24px" }}
        >
          <div>
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              style={{ ...inputStyle, marginTop: "6px" }}
            />
          </div>

          <div>
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              style={{ ...inputStyle, marginTop: "6px" }}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: "#b42318", margin: 0 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} style={buttonStyle}>
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <div style={{ textAlign: "center", margin: "20px 0" }}>
          o continuá con
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting}
          style={{
            ...buttonStyle,
            backgroundColor: "#ffffff",
            color: "#173f4f",
            border: "1px solid #b7c8c1",
          }}
        >
          Continuar con Google
        </button>

        <p style={{ textAlign: "center", marginTop: "24px" }}>
          ¿Todavía no tenés cuenta?{" "}
          <Link to="/register" style={{ color: "#216653" }}>
            Registrate
          </Link>
        </p>
      </section>
    </main>
  );
}
