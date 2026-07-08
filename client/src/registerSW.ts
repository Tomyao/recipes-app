import { toast } from "sonner";

/**
 * Registers the hand-written service worker (public/sw.js — see the README
 * for why it lives in public/ rather than src/) and prompts the user to
 * reload when a new version has installed and is waiting to activate.
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            toast("A new version is available", {
              action: {
                label: "Reload",
                onClick: () => {
                  installing.postMessage({ type: "SKIP_WAITING" });
                },
              },
              duration: 10000,
            });
          }
        });
      });
    } catch (err) {
      console.error("Service worker registration failed:", err);
    }
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
