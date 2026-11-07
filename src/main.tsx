import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AppProviders } from "./providers/AppProviders";

import "./index.css";

function initializeTheme() {
  let savedTheme: string | null = null;

  try {
    savedTheme = localStorage.getItem("cumbre-theme");
  } catch {
    // La tienda funciona aunque el navegador
    // no permita acceder al almacenamiento local.
  }

  const theme =
    savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

  document.documentElement.dataset.theme = theme;
}

initializeTheme();

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>
);