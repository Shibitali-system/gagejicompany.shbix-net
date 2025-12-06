import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PosLayout from "./layouts/PosLayout";

// ===== Pages =====
import Dashboard from "./dashboard";

// Sales
import SalesList from "./sales/index";
import NewSale from "./sales/new";
import SaleDetails from "./sales/[id]";

// Products
import ProductsList from "./products/index";
import ProductNew from "./products/new";
import ProductDetail from "./products/[id]";
import ProductEdit from "./products/edit";

// Purchases
import PurchasesList from "./purchases/index";
import PurchaseNew from "./purchases/new";
import PurchaseDetail from "./purchases/[id]";
import PurchaseReturns from "./purchases/returns";

// Customers
import CustomersList from "./customers/index";
import CustomerNew from "./customers/new";
import CustomerDetail from "./customers/[id]";
import CustomerEdit from "./customers/edit";

// Employees
import EmployeesList from "./employees/index";
import EmployeeNew from "./employees/new";
import EmployeeDetail from "./employees/[id]";
import EmployeeEdit from "./employees/edit";

// Billing
import BillingList from "./billing/index";
import BillingNew from "./billing/new";
import BillingDetail from "./billing/[id]";

// Other pages
import Reports from "./reports";
import Notifications from "./notifications";
import Subscription from "./subscription";
import Profile from "./profile";
import Settings from "./settings";
import Help from "./help";

// Simple Auth Guard
const PrivateRoute = ({ children }) => {
  const isAuthenticated = true; // TODO: add real auth check
  return isAuthenticated ? children : <Navigate to="/pos/login" />;
};

export default function PosRoutes() {
  return (
    <Routes>
      {/* Public login / auth routes if any */}
      <Route path="/pos/login" element={<Navigate to="/pos/dashboard" />} />

      {/* Protected routes */}
      <Route
        path="/pos/*"
        element={
          <PrivateRoute>
            <PosLayout />
          </PrivateRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* Products */}
        <Route path="products">
          <Route index element={<ProductsList />} />
          <Route path="new" element={<ProductNew />} />
          <Route path=":id" element={<ProductDetail />} />
          <Route path="edit/:id" element={<ProductEdit />} />
        </Route>

        {/* Sales */}
        <Route path="sales">
          <Route index element={<SalesList />} />
          <Route path="new" element={<NewSale />} />
          <Route path=":id" element={<SaleDetails />} />
        </Route>

        {/* Purchases */}
        <Route path="purchases">
          <Route index element={<PurchasesList />} />
          <Route path="new" element={<PurchaseNew />} />
          <Route path=":id" element={<PurchaseDetail />} />
          <Route path="returns" element={<PurchaseReturns />} />
        </Route>

        {/* Customers */}
        <Route path="customers">
          <Route index element={<CustomersList />} />
          <Route path="new" element={<CustomerNew />} />
          <Route path=":id" element={<CustomerDetail />} />
          <Route path="edit/:id" element={<CustomerEdit />} />
        </Route>

        {/* Employees */}
        <Route path="employees">
          <Route index element={<EmployeesList />} />
          <Route path="new" element={<EmployeeNew />} />
          <Route path=":id" element={<EmployeeDetail />} />
          <Route path="edit/:id" element={<EmployeeEdit />} />
        </Route>

        {/* Billing */}
        <Route path="billing">
          <Route index element={<BillingList />} />
          <Route path="new" element={<BillingNew />} />
          <Route path=":id" element={<BillingDetail />} />
        </Route>

        {/* Other pages */}
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/pos/dashboard" />} />
    </Routes>
  );
}
