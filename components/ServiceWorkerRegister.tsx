"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Dev-mode chunk URLs aren't content-hashed the way production build
      // output is, so a service worker caching them cache-first can keep
      // serving stale JS after a code change. Keep development SW-free, and
      // proactively clean up any registration/cache left over from a
      // previous production build or test so dev always reflects current code.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
      }
      return;
    }

    const register = () => {
      // Relative path so this resolves correctly under a subpath (GitHub
      // Pages project site) as well as at the root (local dev/production).
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    };
    // Effects can run after the load event has already fired, in which case
    // waiting for it would mean never registering.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
