import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import PosLayout from "./pages/layouts/PosLayout";

// Auth
import Login from "./pages/auth/login";
import Signup from "./pages/auth/signup";
import ForgotPassword from "./pages/auth/forgot-password";
import ResetPassword from "./pages/auth/reset-password";

// Pages
import Dashboard from "./pages/dashboard";
import PosHome from "./pages/PosHome";

// Products
import ProductsList from './pages/products/index';
import ProductNew from './pages/products/new';
import ProductDetail from './pages/products/[id]';
import ProductEdit from './pages/products/edit';
import ProductAddStock from './pages/products/add-stock'; // 🔹 Hii ndiyo mpya

// Notebook
import NotebookList from "./pages/notebook/index";
import NotebookNew from "./pages/notebook/new";
import NotebookDetails from "./pages/notebook/[id]";
import NotebookEdit from "./pages/notebook/edit";

// Notebook
import MeetingList from "./pages/meeting/index";
import MeetingNew from "./pages/meeting/new";
import MeetingDetails from "./pages/meeting/[id]";
import MeetingEdit from "./pages/meeting/edit";

// Sales
import SalesList from './pages/sales/index';
import SaleNew from './pages/sales/new';
import SaleDetail from './pages/sales/[id]';
import SalesReturns from './pages/sales/returns';
import ReceiptPage from './pages/sales/receipts';
import RecordReturnPage from './pages/sales/returns/record'; // 🔹 Record returned products
import RecordReturnReceiptPage from './pages/sales/returns/receipt'; // 🔹 Page ya receipt
import EditReceiptInfo from "./pages/sales/receipts/settings";
import ProformerIndex from "./pages/sales/proformer/index";
import LoanIndex from "./pages/sales/loans/index";
import NewProformer from "./pages/sales/proformer/new";
import ProformerView from "./pages/sales/proformer/[id]";


// Suppliers
import SuppliersList from './pages/suppliers/index';
import SupplierNew from './pages/suppliers/new';
import SupplierDetail from './pages/suppliers/[id]';
import SupplierEdit from './pages/suppliers/edit';
import SupplierPayments from './pages/suppliers/payments';  
import PaymentsIndex from './pages/suppliers/paymentindex';  


// Purchases
import PurchasesList from './pages/purchases/index';
import PurchaseNew from './pages/purchases/new';
import PurchaseDetail from './pages/purchases/[id]';
import PurchaseReturns from './pages/purchases/returns';   
import EditPurchase from './pages/purchases/edit';      
import PurchaseHistory from './pages/purchases/history';
import RecordReturnPurchase from './pages/purchases/returns/record'; // 🔹 Record returned products


// Customers
import CustomersList from './pages/customers/index';
import CustomerNew from './pages/customers/new';
import CustomerDetail from './pages/customers/[id]';
import CustomerEdit from './pages/customers/edit';

// Employees
import EmployeesList from './pages/employees/index';
import EmployeeNew from './pages/employees/new';
import EmployeeDetail from './pages/employees/[id]';
import EmployeeEdit from './pages/employees/edit';

// Billing
import BillingList from './pages/billing/index';
import BillingNew from './pages/billing/new';
import BillingDetail from './pages/billing/[id]';

// Expenses
import ExpensesList from './pages/expenses/index';
import ExpensesNew from './pages/expenses/new';
import RequestList from './pages/expenses/expensesindex';
import RequestNew from './pages/expenses/expenses';
import ExpensesDetail from './pages/expenses/[id]';
import ExpensesEdit from './pages/expenses/edit';

import ExpiredList from './pages/expired/index';
import ExpiredNew from './pages/expired/new';

// Insurance
import InsuranceList from "./pages/insurance/index";
import InsuranceDetail from "./pages/insurance/[id]";
import InsuranceClaim from "./pages/insurance/claims";
import InsuranceNew from "./pages/insurance/new";
import InsuranceNewClaims from "./pages/insurance/new-claims";

// Assets
import AssetsList from "./pages/assets/index";
import AssetNew from "./pages/assets/new";
import AssetDetails from "./pages/assets/[id]";

// Attendances
import AttendancesList from './pages/attendances/index';
import AttendancesNew from './pages/attendances/new';
import AttendancesDetails from './pages/attendances/[id]';


import InstallInstructions from './pages/install/InstallInstructions';
import InstallComputer from './pages/install/InstallComputer';

// Other pages
import Reports from './pages/reports';       
import Deleted from './pages/Deleted';
import Notifications from './pages/notifications';
import Subscription from './pages/subscription';
import Profile from './pages/profile';
import Settings from './pages/settings';
import Help from './pages/help';

// Simple Auth Guard
const PrivateRoute = ({ children }) => {
  const isAuthenticated = true; // TODO: implement real auth logic
  return isAuthenticated ? children : <Navigate to="/pharmacy/login" />;
};

const PharmacyRoutes = () => (
  <Routes>
    {/* Homepage */}
    <Route path="" element={<PosHome />} />

    {/* Auth routes */}
    <Route path="login" element={<Login />} />
    <Route path="signup" element={<Signup />} />
    <Route path="forgot-password" element={<ForgotPassword />} />
    <Route path="reset-password" element={<ResetPassword />} />

    {/* Protected dashboard and products */}
    <Route
      path="/dashboard/*"
      element={
        <PrivateRoute>
          <PosLayout />
        </PrivateRoute>
      }
    >
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

{/* Notebook */}
<Route path="notebook" element={<NotebookList />} />
<Route path="notebook/new" element={<NotebookNew />} />
<Route path="notebook/:id" element={<NotebookDetails />} />
<Route path="notebook/edit/:id" element={<NotebookEdit />} />

{/* Meeting */}
<Route path="meeting" element={<MeetingList />} />
<Route path="meeting/new" element={<MeetingNew />} />
<Route path="meeting/:id" element={<MeetingDetails />} />
<Route path="meeting/edit/:id" element={<MeetingEdit />} />



        <Route path="employees" element={<EmployeesList />} />
<Route path="employees/new" element={<EmployeeNew />} />
<Route path="employees/:id" element={<EmployeeDetail />} />
<Route path="employees/edit/:id" element={<EmployeeEdit />} />  {/* Hii ndiyo edit.jsx */}

<Route path="expired" element={<ExpiredList />} />
<Route path="expired/new" element={<ExpiredNew />} />

        {/* Billing */}
        <Route path="billing" element={<BillingList />} />
        <Route path="billing/new" element={<BillingNew />} />
        <Route path="billing/:id" element={<BillingDetail />} />

{/* Insurance */}
      <Route path="insurance" element={<InsuranceList />} />
      <Route path="insurance/:id" element={<InsuranceDetail />} />
      <Route path="insurance/new" element={<InsuranceNew />} />
      <Route path="insurance/claims" element={<InsuranceClaim />} />
      <Route path="insurance/new-claims" element={<InsuranceNewClaims />} />

{/* Assets */}
      <Route path="assets" element={<AssetsList />} />
      <Route path="assets/new" element={<AssetNew />} />
      <Route path="assets/:id" element={<AssetDetails />} />

        
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


  
   <Route path="install/InstallInstructions" element={<InstallInstructions />} />
   <Route path="install/InstallComputer" element={<InstallComputer />} />          

        {/* Other pages */}
        <Route path="reports" element={<Reports />} />
        <Route path="deleted" element={<Deleted />} />
        <Route path="notifications" element={<Notifications />} />   
        <Route path="subscription" element={<Subscription />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/pharmacy" />} />
  </Routes>
);

export default PharmacyRoutes;
