
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

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      await register(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String(err.code)
          : "";

      if (code === "auth/email-already-in-use") {
        setError("Ya existe una cuenta con ese correo electrónico.");
      } else if (code === "auth/invalid-email") {
        setError("El correo electrónico no es válido.");
      } else if (code === "auth/weak-password") {
        setError("La contraseña es demasiado débil.");
      } else {
        setError("No pudimos crear la cuenta. Intentá nuevamente.");
      }
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
          Crear una cuenta
        </h1>

        <p style={{ textAlign: "center", color: "#52665e" }}>
          Registrate en Tienda Natural Cumbre.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "16px", marginTop: "24px" }}
        >
          <div>
            <label htmlFor="register-email">Correo electrónico</label>
            <input
              id="register-email"
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
            <label htmlFor="register-password">Contraseña</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              style={{ ...inputStyle, marginTop: "6px" }}
            />
          </div>

          <div>
            <label htmlFor="register-confirm">
              Confirmar contraseña
            </label>
            <input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              disabled={submitting}
              style={{ ...inputStyle, marginTop: "6px" }}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: "#b42318", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "13px",
              border: "none",
              borderRadius: "8px",
              backgroundColor: "#216653",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {submitting ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px" }}>
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" style={{ color: "#216653" }}>
            Iniciá sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
