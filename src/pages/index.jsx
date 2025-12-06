import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import PosLayout from "./layouts/PosLayout";

// Homepage
import PosHome from "./PosHome";

// Dashboard
import Dashboard from "./dashboard";

// Auth
import Login from "./auth/login";
import Signup from "./auth/signup";
import ForgotPassword from "./auth/forgot-password";
import ResetPassword from "./auth/reset-password";

// Sales
import SalesList from './sales/index';
import SaleNew from './sales/new';
import SaleDetail from './sales/[id]';
import SalesReturns from './sales/returns';
import ReceiptPage from './sales/receipts';
import RecordReturnPage from './sales/returns/record'; // 🔹 Record returned products
import RecordReturnReceiptPage from './sales/returns/receipt'; // 🔹 Page ya receipt
import EditReceiptInfo from "./sales/receipts/settings";
import ProformerIndex from "./sales/proformer/index";
import LoanIndex from "./sales/loans/index";
import NewProformer from "./sales/proformer/new";
import ProformerView from "./sales/proformer/[id]";

// Suppliers
import SuppliersList from './suppliers/index';
import SupplierNew from './suppliers/new';
import SupplierDetail from './suppliers/[id]';
import SupplierEdit from './suppliers/edit';
import SupplierPayments from './suppliers/payments';  
import PaymentsIndex from './suppliers/paymentindex';  


// Purchases
import PurchasesList from './purchases/index';
import PurchaseNew from './purchases/new';
import PurchaseDetail from './purchases/[id]';
import PurchaseReturns from './purchases/returns';   
import EditPurchase from './purchases/edit';      
import PurchaseHistory from './purchases/history';
import RecordReturnPurchase from './purchases/returns/record'; // 🔹 Record returned products


// Customers
import CustomersList from './customers/index';
import CustomerNew from './customers/new';
import CustomerDetail from './customers/[id]';
import CustomerEdit from './customers/edit';

// Employees
import EmployeesList from './employees/index';
import EmployeeNew from './employees/new';
import EmployeeDetail from './employees/[id]';
import EmployeeEdit from './employees/edit';

// Expenses
import ExpensesList from './expenses/index';
import ExpensesNew from './expenses/new';
import RequestList from './expenses/expensesindex';
import RequestNew from './expenses/expenses';
import ExpensesDetail from './expenses/[id]';
import ExpensesEdit from './expenses/edit';

import ExpiredList from './expired/index';
import ExpiredNew from './expired/new';

// Attendances
import AttendancesList from './attendances/index';
import AttendancesNew from './attendances/new';
import AttendancesDetails from './attendances/[id]';

// Products
import ProductsList from './products/index';
import ProductNew from './products/new';
import ProductDetail from './products/[id]';
import ProductEdit from './products/edit';
import ProductAddStock from './products/add-stock'; // 🔹 Hii ndiyo mpya

// Inventory
import InventoryList from "./inventory/index";
import Restock from "./inventory/restock";
import StockHistory from "./inventory/stock-history";

// Categories
import Categories from "./categories";

// Assets
import AssetsList from "./assets/index";
import AssetNew from "./assets/new";

// Other pages
import Reports from './reports';
import Deleted from './deleted';
import Settings from "./settings";
import Profile from "./profile";
import Subscription from "./subscription";
import Notifications from "./notifications";
import Help from "./help";

// Auth Guard (simple placeholder)
const PrivateRoute = ({ children }) => {
  const isAuthenticated = true; // TODO: Replace with Supabase or context-based auth check
  return isAuthenticated ? children : <Navigate to="/pos" />;
};

const PosRoutes = () => (
  <Routes>
    {/* Public Homepage */}
    <Route path="" element={<PosHome />} />

{/* Auth routes */}
    <Route path="login" element={<Login />} />
    <Route path="signup" element={<Signup />} />
    <Route path="forgot-password" element={<ForgotPassword />} />
    <Route path="reset-password" element={<ResetPassword />} />

    {/* Protected routes */}
    <Route
      path="/dashboard/*"
      element={
        <PrivateRoute>
          <PosLayout />
        </PrivateRoute>
      }
    >
      {/* Dashboard */}
      <Route index element={<Dashboard />} />

      {/* Products module */}
      <Route path="products" element={<ProductsList />} />
      <Route path="products/new" element={<ProductNew />} />
      <Route path="products/:id" element={<ProductDetail />} />
      <Route path="products/edit/:id" element={<ProductEdit />} />
      <Route path="products/add-stock/:id" element={<ProductAddStock />} />


     {/* Sales module */}
<Route path="sales" element={<SalesList />} />
<Route path="sales/new" element={<SaleNew />} />
<Route path="sales/:id" element={<SaleDetail />} />
<Route path="sales/receipt/:saleId" element={<ReceiptPage />} />  {/* Receipt Page */}
<Route path="sales/returns" element={<SalesReturns />} />
<Route path="sales/returns/record" element={<RecordReturnPage />} /> {/* Record returned products */}
<Route path="sales/returns/receipt/:returnId" element={<RecordReturnReceiptPage />} /> {/* Return receipt */}
<Route path="sales/receipts/settings" element={<EditReceiptInfo />} />

{/* Proformer */}
<Route path="sales/proformer" element={<ProformerIndex />} />      {/* Main list */}
<Route path="sales/proformer/new" element={<NewProformer />} />     {/* Create new proformer */}
<Route path="sales/proformer/:id" element={<ProformerView />} />    {/* View proformer details */}
<Route path="sales/loans" element={<LoanIndex />} />

      {/* Suppliers */}
        <Route path="suppliers" element={<SuppliersList />} />
        <Route path="suppliers/new" element={<SupplierNew />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
        <Route path="suppliers/edit/:id" element={<SupplierEdit />} />   
        <Route path="suppliers/payments" element={<SupplierPayments />} />   PaymentsIndex
        <Route path="suppliers/paymentindex" element={<PaymentsIndex />} /> 

      {/* Purchases */}
        <Route path="purchases" element={<PurchasesList />} />
        <Route path="purchases/new" element={<PurchaseNew />} />
        <Route path="purchases/:id" element={<PurchaseDetail />} />
        <Route path="purchases/returns" element={<PurchaseReturns />} />
        <Route path="purchases/edit/:id" element={<EditPurchase />} />
        <Route path="purchases/history/:id" element={<PurchaseHistory />} />
        <Route path="purchases/returns/record" element={<RecordReturnPurchase />} /> {/* Record returned products */}


       {/* Customers */}
        <Route path="customers" element={<CustomersList />} />
        <Route path="customers/new" element={<CustomerNew />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/edit/:id" element={<CustomerEdit />} />


        <Route path="employees" element={<EmployeesList />} />
<Route path="employees/new" element={<EmployeeNew />} />
<Route path="employees/:id" element={<EmployeeDetail />} />
<Route path="employees/edit/:id" element={<EmployeeEdit />} />  {/* Hii ndiyo edit.jsx */}

<Route path="expired" element={<ExpiredList />} />
<Route path="expired/new" element={<ExpiredNew />} />

        
        
{/* Expenses */}
        <Route path="expenses" element={<ExpensesList />} />
        <Route path="expenses/new" element={<ExpensesNew />} />
        <Route path="expenses/expenses" element={<RequestNew />} />
         <Route path="expenses/expensesindex" element={<RequestList />} />
        <Route path="expenses/:id" element={<ExpensesDetail />} />
        <Route path="expenses/edit/:id" element={<ExpensesEdit />} />

 {/* Attendances */}
        <Route path="attendances" element={<AttendancesList />} />
        <Route path="attendances/new" element={<AttendancesNew />} />
        <Route path="attendances/:id" element={<AttendancesDetails />} />
        
{/* Assets */}
      <Route path="assets" element={<AssetsList />} />
      <Route path="assets/new" element={<AssetNew />} />

      {/* Other pages */}
      <Route path="reports" element={<Reports />} />
        <Route path="deleted" element={<Deleted />} />
      <Route path="settings" element={<Settings />} />
      <Route path="profile" element={<Profile />} />
      <Route path="subscription" element={<Subscription />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="help" element={<Help />} />
    </Route>

    {/* Catch-all redirect */}
    <Route path="*" element={<Navigate to="/pos" />} />
  </Routes>
);

export default PosRoutes;
