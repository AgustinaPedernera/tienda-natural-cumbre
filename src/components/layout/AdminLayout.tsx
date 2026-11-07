import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

interface AdminLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AdminLayout({
  title,
  description,
  children,
}: AdminLayoutProps) {
  return (
    <div className="cumbre-container py-4 md:py-6">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-6">
        <aside className="min-w-0">
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
              Administración
            </p>

            <nav
              aria-label="Panel de administración"
              className="grid grid-cols-2 gap-2 lg:grid-cols-1"
            >
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  [
                    "flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold no-underline",
                    isActive
                      ? "bg-brand text-on-brand"
                      : "text-ink hover:bg-surface-soft",
                  ].join(" ")
                }
              >
                Órdenes
              </NavLink>

              <NavLink
                to="/admin/products"
                className={({ isActive }) =>
                  [
                    "flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold no-underline",
                    isActive
                      ? "bg-brand text-on-brand"
                      : "text-ink hover:bg-surface-soft",
                  ].join(" ")
                }
              >
                Productos
              </NavLink>
            </nav>

            <Link
              to="/"
              className="mt-3 hidden min-h-11 items-center border-t border-line px-3 pt-3 text-xs text-muted no-underline hover:text-ink lg:flex"
            >
              ← Volver a la tienda
            </Link>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="mb-4 border-b border-line pb-4">
            <h1 className="mb-1 text-xl font-bold text-ink md:text-2xl">
              {title}
            </h1>

            {description && (
              <p className="mb-0 text-sm text-muted">
                {description}
              </p>
            )}
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}