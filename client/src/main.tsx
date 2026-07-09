import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { queryClient } from "@/lib/queryClient";
import { registerServiceWorker } from "@/registerSW";
// Self-hosted (bundled, offline-cacheable) — the OS-default "system-ui" stack
// (e.g. Segoe UI on Windows) has asymmetric ascent/descent metrics that make
// button/label text look vertically off-center even at line-height: 1. Inter's
// metrics are balanced for UI use, which fixes that regardless of platform.
import "@fontsource-variable/inter";
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </BrowserRouter>
      <Toaster richColors closeButton position="bottom-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);

registerServiceWorker();
