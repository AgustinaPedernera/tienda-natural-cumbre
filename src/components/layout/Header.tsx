import {
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";

function navigationStyle(isActive: boolean) {
  return [
    "flex min-h-11 items-center rounded-lg px-3 py-2",
    "text-sm font-semibold no-underline",
    isActive
      ? "bg-brand text-on-brand"
      : "text-ink hover:bg-surface-soft",
  ].join(" ");
}

export function Header() {
  const { user, loading, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const [theme, setTheme] = useState<"light" | "dark">(
    () =>
      document.documentElement.dataset.theme === "dark"
        ? "dark"
        : "light"
  );

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const logoutInProgress = useRef(false);

  const cartCount = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const closeMenu = () => setMenuOpen(false);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";

    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);

    try {
      localStorage.setItem("cumbre-theme", nextTheme);
    } catch {
      // El tema funciona aunque no pueda guardarse.
    }
  };

  const handleKeyboard = (
    event: KeyboardEvent<HTMLElement>
  ) => {
    if (event.key === "Escape" && menuOpen) {
      closeMenu();
      menuButtonRef.current?.focus();
    }
  };

  const handleLogout = async () => {
    if (logoutInProgress.current) return;

    logoutInProgress.current = true;
    setLoggingOut(true);
    setError("");

    try {
      await logout();
      closeMenu();
      navigate("/");
    } catch {
      setError(
        "No se pudo cerrar sesión. Intentá nuevamente."
      );
    } finally {
      logoutInProgress.current = false;
      setLoggingOut(false);
    }
  };

  const controlStyle =
    "flex size-11 shrink-0 items-center justify-center " +
    "rounded-lg border border-line bg-transparent " +
    "text-ink hover:bg-surface-soft";

  return (
    <header
      onKeyDown={handleKeyboard}
      className="sticky top-0 z-40 border-b border-line bg-surface text-ink"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:p-3 focus:text-on-brand"
      >
        Saltar al contenido
      </a>

      <div className="cumbre-container">
        <div className="flex min-h-16 items-center justify-between gap-2 py-2">
          <Link
            to="/"
            onClick={closeMenu}
            aria-label="Cumbre Productos Naturales, inicio"
            className="flex min-w-0 items-center gap-2 text-brand no-underline"
          >
            <svg
              viewBox="0 0 48 48"
              width="34"
              height="34"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle
                cx="24"
                cy="24"
                r="22"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle
                cx="25"
                cy="15"
                r="5"
                fill="#E8BB55"
              />
              <path
                d="M8 34L19 20L27 30L32 24L41 34H8Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M15 25L19 28L22 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold leading-none text-brand dark:text-[#E8BB55] sm:text-2xl">
                Cumbre
              </span>

              <span className="mt-1 hidden whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-muted min-[400px]:block sm:text-[10px]">
                Productos naturales
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Activar modo claro"
                  : "Activar modo oscuro"
              }
              title={
                theme === "dark"
                  ? "Activar modo claro"
                  : "Activar modo oscuro"
              }
              className={controlStyle}
            >
              <span aria-hidden="true" className="text-lg">
                {theme === "dark" ? "☀" : "☾"}
              </span>
            </button>

            <Link
              to="/cart"
              onClick={closeMenu}
              aria-label={`Ver carrito, ${cartCount} unidades`}
              className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-line px-2 text-xs font-semibold text-ink no-underline hover:bg-surface-soft"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M3 3H5L7.5 15H18L21 6H6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="20" r="1" />
                <circle cx="17" cy="20" r="1" />
              </svg>

              <span>{cartCount}</span>
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              aria-label={
                menuOpen ? "Cerrar menú" : "Abrir menú"
              }
              className={`${controlStyle} md:hidden`}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path d="M6 6L18 18M18 6L6 18" />
                ) : (
                  <path d="M4 6H20M4 12H20M4 18H20" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <nav
          id="main-navigation"
          aria-label="Navegación principal"
          className={[
            menuOpen ? "grid" : "hidden",
            "gap-3 border-t border-line py-2",
            "md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start",
          ].join(" ")}
        >
          <div className="flex min-w-0 flex-col gap-1 md:flex-row md:flex-wrap">
            <NavLink
              to="/"
              end
              onClick={closeMenu}
              className={({ isActive }) =>
                navigationStyle(isActive)
              }
            >
              Catálogo
            </NavLink>

            {!loading && user && (
              <>
                <NavLink
                  to="/orders"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    navigationStyle(isActive)
                  }
                >
                  Mis compras
                </NavLink>

                {user.role === "admin" && (
                  <>
                    <NavLink
                      to="/admin"
                      end
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        navigationStyle(isActive)
                      }
                    >
                      Órdenes del comercio
                    </NavLink>

                    <NavLink
                      to="/admin/products"
                      onClick={closeMenu}
                      className={({ isActive }) =>
                        navigationStyle(isActive)
                      }
                    >
                      Gestionar productos
                    </NavLink>
                  </>
                )}
              </>
            )}
          </div>

          {loading ? (
            <span
              role="status"
              className="flex min-h-11 items-center text-xs text-muted"
            >
              Verificando sesión…
            </span>
          ) : user ? (
            <div className="flex min-w-0 items-center justify-end gap-2 border-t border-line pt-2 md:border-0 md:pt-0">
              <span
                title={user.name}
                className="min-w-0 max-w-48 truncate text-xs text-muted md:max-w-36 lg:max-w-48"
              >
                Hola, {user.name}
              </span>

              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-soft"
              >
                {loggingOut ? "Cerrando sesión…" : "Salir"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1 md:flex-row">
              <NavLink
                to="/login"
                onClick={closeMenu}
                className={({ isActive }) =>
                  navigationStyle(isActive)
                }
              >
                Iniciar sesión
              </NavLink>

              <NavLink
                to="/register"
                onClick={closeMenu}
                className={({ isActive }) =>
                  navigationStyle(isActive)
                }
              >
                Crear cuenta
              </NavLink>
            </div>
          )}
        </nav>

        {error && (
          <p role="alert" className="cumbre-error mb-3">
            {error}
          </p>
        )}
      </div>
    </header>
  );
}