import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import PharmacyRoutes from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <PharmacyRoutes />
  </BrowserRouter>
);
