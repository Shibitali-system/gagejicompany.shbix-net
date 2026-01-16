import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import PharmacyRoutes from "./App";

// Import virtual:pwa-register from vite-plugin-pwa
import { registerSW } from "virtual:pwa-register";

// Lazimisha auto-update kwa PWA
const updateSW = registerSW({
  onNeedRefresh() {
    // Service worker mpya imepatikana, reload app
    updateSW(true); // reload automatically
  },
  onOfflineReady() {
    console.log("App ready offline");
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <PharmacyRoutes />
  </BrowserRouter>
);
