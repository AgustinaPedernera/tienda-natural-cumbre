import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";

import { Header } from "./components/layout/Header";

const ProductsPage = lazy(() =>
  import("./pages/ProductsPage").then((module) => ({
    default: module.ProductsPage,
  }))
);

const ProductDetailPage = lazy(() =>
  import("./pages/ProductDetailPage").then((module) => ({
    default: module.ProductDetailPage,
  }))
);

const CartPage = lazy(() =>
  import("./pages/CartPage").then((module) => ({
    default: module.CartPage,
  }))
);

const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  }))
);

const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  }))
);

const OrdersPage = lazy(() =>
  import("./pages/OrdersPage").then((module) => ({
    default: module.OrdersPage,
  }))
);

const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({
    default: module.AdminPage,
  }))
);

const AdminProductsPage = lazy(() =>
  import("./pages/AdminProductsPage").then((module) => ({
    default: module.AdminProductsPage,
  }))
);

function PageLoading() {
  return (
    <div
      role="status"
      className="cumbre-container py-8"
    >
      <p className="mb-4 text-sm text-muted">
        Cargando sección…
      </p>

      <div aria-hidden="true" className="grid gap-3">
        <div className="h-6 w-40 rounded-lg bg-surface-soft" />
        <div className="h-4 w-64 max-w-full rounded-lg bg-surface-soft" />
        <div className="h-32 rounded-xl border border-line bg-surface" />
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="flex min-h-svh flex-col bg-page text-ink">
      <Header />

      <div
        id="main-content"
        tabIndex={-1}
        className="min-w-0 flex-1"
      >
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route
              path="/"
              element={<ProductsPage />}
            />

            <Route
              path="/products/:productId"
              element={<ProductDetailPage />}
            />

            <Route
              path="/cart"
              element={<CartPage />}
            />

            <Route
              path="/login"
              element={<LoginPage />}
            />

            <Route
              path="/register"
              element={<RegisterPage />}
            />

            <Route
              path="/orders"
              element={<OrdersPage />}
            />

            <Route
              path="/orders/:orderId"
              element={<OrdersPage />}
            />

            <Route
              path="/admin"
              element={<AdminPage />}
            />

            <Route
              path="/admin/products"
              element={<AdminProductsPage />}
            />

            <Route
              path="*"
              element={
                <main className="cumbre-container py-12">
                  <h1>Página no encontrada</h1>

                  <Link
                    to="/"
                    className="cumbre-button"
                  >
                    Volver al catálogo
                  </Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </div>

      <footer className="mt-10 border-t border-line bg-surface">
        <div className="cumbre-container flex flex-col gap-2 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-lg font-bold text-brand">
            Cumbre · Productos naturales
          </span>

          <span>
            Elegí natural, elegí bienestar.
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;