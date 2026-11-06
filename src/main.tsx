import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { getConfigurationError } from "./config/environment";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);
const configurationError = getConfigurationError(import.meta.env);

if (configurationError) {
  root.render(
    <main role="alert">
      <h1>La tienda necesita configuración</h1>
      <p>{configurationError}</p>
    </main>
  );
} else {
  // Firebase solo se inicializa después de validar la configuración.
  Promise.all([import("./App"), import("./providers/AppProviders")])
    .then(([{ default: App }, { AppProviders }]) => {
      root.render(
        <React.StrictMode>
          <BrowserRouter>
            <AppProviders><App /></AppProviders>
          </BrowserRouter>
        </React.StrictMode>
      );
    })
    .catch(() => {
      root.render(
        <main role="alert">
          <h1>No se pudo iniciar la tienda</h1>
          <p>Revisá la configuración de Firebase y recargá la página.</p>
        </main>
      );
    });
}
