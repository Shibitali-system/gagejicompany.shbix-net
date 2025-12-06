// path: src/pharmacy/utils/registerServiceWorker.js
export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/pharmacy/sw.js");
      console.log("SW registered:", registration.scope);
      return registration;
    } catch (err) {
      console.error("SW registration failed:", err);
      throw err;
    }
  } else {
    throw new Error("Service workers not supported");
  }
}
