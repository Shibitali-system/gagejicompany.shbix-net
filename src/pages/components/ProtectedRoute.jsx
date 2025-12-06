import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ user, requiredKey, adminOnly = false }) => {
  // Admin anaweza kuona kila kitu
  if (user?.role === "admin") return <Outlet />;

  // Route hii ni admin tu
  if (adminOnly) return <Navigate to="/pharmacy/dashboard" replace />;

  // Employee lazima awe na permission
  if (requiredKey && user?.permissions?.includes(requiredKey)) {
    return <Outlet />;
  }

  // Default: redirect to dashboard
  return <Navigate to="/pharmacy/dashboard" replace />;
};

export default ProtectedRoute;
