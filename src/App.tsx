
import { Routes, Route, Link, useNavigate } from "react-router-dom";

import { ProductsPage } from "./pages/ProductsPage";
import { CartPage } from "./pages/CartPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";

function App() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const cartCount = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("No se pudo cerrar sesión:", error);
    }
  };

  return (
    <>
      <nav
        aria-label="Navegación principal"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "20px",
          padding: "16px 24px",
          backgroundColor: "#173f4f",
        }}
      >
        <Link
          to="/"
          style={{
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          🥜 Tienda Natural
        </Link>

        <Link
          to="/cart"
          aria-label={`Ver carrito, ${cartCount} productos`}
          style={{
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          🛒 ({cartCount})
        </Link>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {loading ? (
            <span style={{ color: "#ffffff" }}>
              Verificando sesión...
            </span>
          ) : isAuthenticated ? (
            <>
              <span style={{ color: "#ffffff" }}>
                Hola, {user?.name}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "8px 14px",
                  border: "1px solid #ffffff",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: "#ffffff",
                  textDecoration: "none",
                }}
              >
                Iniciar sesión
              </Link>

              <Link
                to="/register"
                style={{
                  color: "#ffffff",
                  textDecoration: "none",
                }}
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<ProductsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </>
  );
}

export default App;
