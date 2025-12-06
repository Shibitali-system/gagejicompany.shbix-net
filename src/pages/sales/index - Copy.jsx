import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  FaSearch,
  FaEye,
  FaUndo,
  FaTrash,
  FaFileExcel,
  FaPlus,
  FaMoneyBillWave,
} from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const SalesIndex = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

const [selectedSales, setSelectedSales] = useState([]);
const [checkAll, setCheckAll] = useState(false);

const handleSelectSale = (id) => {
  if (selectedSales.includes(id)) {
    setSelectedSales(selectedSales.filter(sid => sid !== id));
  } else {
    setSelectedSales([...selectedSales, id]);
  }
};

const handleCheckAll = () => {
  if (checkAll) {
    setSelectedSales([]);
  } else {
    setSelectedSales(filteredSales.map(s => s.id));
  }
  setCheckAll(!checkAll);
};

const handleDeleteSelected = async () => {
  if (selectedSales.length === 0) return;

  const confirmed = window.confirm("Are you sure you want to delete selected sales?");
  if (!confirmed) return;

  try {
    // STEP 1: Fetch sale items for all selected sales
    const { data: saleItems, error: itemsFetchErr } = await supabase
      .from("sale_items")
      .select("product_id, quantity")
      .in("sale_id", selectedSales);

    if (itemsFetchErr) throw itemsFetchErr;

    // STEP 2: Loop and restore stock to products
    for (let item of saleItems) {
      const { error: stockErr } = await supabase.rpc(
        "increment_product_stock",
        {
          product_id_input: item.product_id,
          qty_input: item.quantity
        }
      );

      if (stockErr) throw stockErr;
    }

    // STEP 3: Delete sale_items
    const { error: itemsErr } = await supabase
      .from("sale_items")
      .delete()
      .in("sale_id", selectedSales);

    if (itemsErr) throw itemsErr;

    // STEP 4: Delete sales
    const { error: salesErr } = await supabase
      .from("sales")
      .delete()
      .in("id", selectedSales);

    if (salesErr) throw salesErr;

    toast.success("Selected sales deleted successfully.");

    // Update UI
    setSales(prev => prev.filter(s => !selectedSales.includes(s.id)));
    setSelectedSales([]);
    setCheckAll(false);

  } catch (err) {
    console.error(err);
    toast.error("Failed to delete sales: " + err.message);
  }
};



  // 🧩 Load User (Admin or Employee)
useEffect(() => {
  const fetchUser = async () => {
    try {
      setLoadingUser(true);

      // 1️⃣ Check Supabase Auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser?.id) throw new Error("No authenticated user");

      // 2️⃣ Try to find if this user is a system admin
      const { data: mainUser, error: mainErr } = await supabase
        .from("systems_users")
        .select("*")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (mainErr) throw mainErr;

      if (mainUser) {
        setUser({
          ...mainUser,
          office_id: mainUser.customer_registration_no,
          name: mainUser.customer_name,
          role: "admin",
          permissions: mainUser.permissions || [
            "dashboard",
            "sales",
            "view_all_sales",
          ],
        });
        return;
      }

      // 3️⃣ Otherwise check if user is an employee
      const { data: employee, error: empErr } = await supabase
        .from("employees")
        .select("*")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (empErr) throw empErr;

      if (employee) {
        // get related office (system user)
        const { data: officeData, error: officeErr } = await supabase
          .from("systems_users")
          .select("*")
          .eq("customer_registration_no", employee.office_id)
          .maybeSingle();

        if (officeErr) throw officeErr;

        setUser({
          ...employee,
          office_id: employee.office_id,
          office_name: officeData?.customer_name || "-",
          role: "employee",
          name: employee.name,
          permissions: employee.permissions || ["sales"],
        });
        return;
      }

      // 4️⃣ If neither admin nor employee found
      throw new Error("No matching system or employee account found for this auth user.");
    } catch (err) {
      console.error("❌ User load error:", err);
      toast.error("Failed to load user.");
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  fetchUser();
}, []);



  // 🔥 Fetch Sales
  useEffect(() => {
    if (!user?.office_id) return;
    fetchSales();
  }, [user, searchTerm, filterType, customFrom, customTo]);

  const fetchSales = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let fromDate, toDate;

      switch (filterType) {
        case "today":
          fromDate = new Date(now.setHours(0, 0, 0, 0));
          toDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case "week":
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          fromDate = new Date(now.setDate(diff));
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date();
          break;
        case "month":
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date();
          break;
        case "year":
          fromDate = new Date(now.getFullYear(), 0, 1);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date();
          break;
        case "custom":
          if (customFrom && customTo) {
            fromDate = new Date(customFrom);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(customTo);
            toDate.setHours(23, 59, 59, 999);
          }
          break;
      }

      // Base query
      let salesQuery = supabase
        .from("sales")
        .select("*, customer:customer_id(name), sale_items(*)")
        .order("created_at", { ascending: false });

      // 🔐 Access control
      if (user.role === "admin") {
        salesQuery = salesQuery.eq("office_id", user.office_id);
      } else if (user.role === "employee") {
        if (user.permissions.includes("view_all_sales")) {
          salesQuery = salesQuery.eq("office_id", user.office_id);
        } else {
          salesQuery = salesQuery.eq("seller_id", user.id).eq("office_id", user.office_id);
        }
      }

      // Date filter
      if (fromDate && toDate) {
        salesQuery = salesQuery
          .gte("created_at", fromDate.toISOString())
          .lte("created_at", toDate.toISOString());
      }

      // Search filter
      if (searchTerm.trim()) {
        salesQuery = salesQuery.or(`id.ilike.%${searchTerm}%,comment.ilike.%${searchTerm}%`);
      }

      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      if (!salesData || salesData.length === 0) {
        setSales([]);
        return;
      }

      // Batch fetch sellers
      const systemSellerIds = [...new Set(salesData.filter(s => s.seller_type === "system").map(s => s.seller_id))];
      const employeeSellerIds = [...new Set(salesData.filter(s => s.seller_type === "employee").map(s => s.seller_id))];

      const { data: systemSellers } = await supabase
        .from("systems_users")
        .select("id, customer_name")
        .in("id", systemSellerIds);

      const { data: employeeSellers } = await supabase
        .from("employees")
        .select("id, name")
        .in("id", employeeSellerIds);

      const systemMap = Object.fromEntries(systemSellers?.map(s => [s.id, s.customer_name]) || []);
      const employeeMap = Object.fromEntries(employeeSellers?.map(e => [e.id, e.name]) || []);

      // Batch fetch products
      const allProductIds = [...new Set(salesData.flatMap(s => s.sale_items?.map(i => i.product_id) || []))];
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price")
        .in("id", allProductIds);

      const productMap = Object.fromEntries(products.map(p => [p.id, p]));

      // Final sales array
      const finalSales = salesData.map(s => ({
        ...s,
        seller_name: s.seller_type === "system" ? systemMap[s.seller_id] || "-" :
                     s.seller_type === "employee" ? employeeMap[s.seller_id] || "-" : "-",
        customer_name: s.customer?.name || "-",
        sale_items: s.sale_items?.map(i => ({ ...i, product: productMap[i.product_id] || null })) || [],
      }));

      setSales(finalSales);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch sales: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered sales for search
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter(s =>
      s.id.toString().includes(term) ||
      (s.comment?.toLowerCase().includes(term))
    );
  }, [sales, searchTerm]);

  // Totals
  const totals = useMemo(() => {
    const totalSalesAmount = filteredSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const totalTransactions = filteredSales.length;
    return { totalSalesAmount, totalTransactions };
  }, [filteredSales]);

  // Excel export
  const exportToExcel = () => {
    if (!filteredSales || filteredSales.length === 0) {
      toast.error("No sales to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      filteredSales.map(s => ({
        "Sale ID": s.id,
        Customer: s.customer_name,
        Seller: s.seller_name,
        Products:
          s.sale_items?.map(i =>
            `${i.product?.name || "-"} x${i.quantity} (TZS ${i.product?.price?.toLocaleString() || 0}) | Discount: ${i.discount || 0}%`
          ).join("; ") || "-",
        "Total Amount": s.total_amount,
        "Payment Method": s.payment_method || "Cash",
        "Payment Status": s.payment_status || "Paid",
        "Loan Amount (TZS)": s.loan_amount || 0,
        "Paid Amount (TZS)": s.paid_amount || 0,
        "Payment Date": s.loan_payment_date ? new Date(s.loan_payment_date).toLocaleDateString() : "-",
        Comment: s.comment || "-",
        Date: new Date(s.created_at).toLocaleString(),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
    XLSX.writeFile(workbook, `sales_export_${new Date().toISOString()}.xlsx`);
  };

  if (loadingUser)
    return <p className="p-6 text-gray-600">Loading user data...</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-700">
            Sales Records
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link
              to="new"
              className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 flex items-center gap-2 shadow"
            >
              <FaPlus /> Record New Sale
            </Link>
            <Link
              to="proformer/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow"
            >
              <FaFileExcel /> Create Proformer
            </Link>
            <Link
  to="loans"
  className="bg-yellow-600 text-white px-4 py-2 rounded-xl hover:bg-yellow-700 flex items-center gap-2 shadow"
>
  <FaMoneyBillWave /> Loan / Debt Followup
</Link>


          </div>
        </div>

        {/* 🔒 Permission Notice */}
        {user.role === "employee" && !user.permissions.includes("view_all_sales") && (
          <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl mb-4 text-sm">
            ⚠️ You are viewing <b>only your own sales</b>. You don’t have permission to view all sales.
          </div>
        )}


      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center mb-4">
        <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
          <button className={`px-3 py-1 rounded-xl ${filterType==="today"?"bg-green-600 text-white":"bg-white border"}`} onClick={()=>setFilterType("today")}>Today</button>
          <button className={`px-3 py-1 rounded-xl ${filterType==="week"?"bg-green-600 text-white":"bg-white border"}`} onClick={()=>setFilterType("week")}>This Week</button>
          <button className={`px-3 py-1 rounded-xl ${filterType==="month"?"bg-green-600 text-white":"bg-white border"}`} onClick={()=>setFilterType("month")}>This Month</button>
          <button className={`px-3 py-1 rounded-xl ${filterType==="year"?"bg-green-600 text-white":"bg-white border"}`} onClick={()=>setFilterType("year")}>This Year</button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <input type="date" value={customFrom} onChange={e=>{setCustomFrom(e.target.value); setFilterType("custom");}} className="border px-2 py-1 rounded" />
          <span>to</span>
          <input type="date" value={customTo} onChange={e=>{setCustomTo(e.target.value); setFilterType("custom");}} className="border px-2 py-1 rounded" />
        </div>

        <button onClick={exportToExcel} className="bg-blue-600 text-white px-3 py-1 rounded-xl flex items-center gap-1 whitespace-nowrap">
          <FaFileExcel /> Export Excel
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex items-center w-full sm:w-1/3">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by ID or comment..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
        <div className="bg-white rounded-2xl p-4 shadow text-center">
          <p className="text-gray-500">Total Transactions</p>
          <p className="text-lg font-bold text-green-700">{totals.totalTransactions}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow text-center">
          <p className="text-gray-500">Total Sales Amount</p>
          <p className="text-lg font-bold text-green-700">TZS {totals.totalSalesAmount.toLocaleString()}</p>
        </div>
      </div>

{user?.role === "admin" && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <button
        disabled={selectedSales.length === 0}
        className={`px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all
          ${
            selectedSales.length === 0
              ? "bg-red-300 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700 text-white"
          } mt-3`}
      >
        <FaTrash className="text-white" />
        Delete Selected
        {selectedSales.length > 0 && (
          <span className="bg-white text-red-600 px-2 py-0.5 rounded-lg text-xs font-semibold">
            {selectedSales.length}
          </span>
        )}
      </button>
    </AlertDialogTrigger>

    <AlertDialogContent className="rounded-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
          <FaTrash /> Confirm Deletion
        </AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete <strong>{selectedSales.length}</strong> selected sale(s)?
          <br />
          This action cannot be undone. Stock for the products will be restored.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDeleteSelected}
          className="bg-red-600 text-white rounded-xl hover:bg-red-700"
        >
          Yes, Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}

      {/* Table */}
      {loading ? <p className="text-gray-600">Loading sales...</p> :
       error ? <p className="text-red-600 font-semibold">{error}</p> :
       sales.length===0 ? <p className="text-gray-600">No sales recorded.</p> :
      <div className="overflow-x-auto bg-white rounded-2xl shadow">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-green-600 text-white text-xs uppercase tracking-wider">
  <tr>
<th className="px-2 text-center">
  {user.role === "admin" && (
    <input type="checkbox" checked={checkAll} onChange={handleCheckAll} />
  )}
</th>

    <th className="px-2 sm:px-3 py-2 text-left">Sale ID</th>
    <th className="px-2 sm:px-3 py-2 text-left">Customer</th>
    <th className="px-2 sm:px-3 py-2 text-left">Products (Qty / Price / Discount)</th>
    <th className="px-2 sm:px-3 py-2 text-right">Total (TZS)</th>
    <th className="px-2 sm:px-3 py-2 text-left">Seller</th>
    <th className="px-2 sm:px-3 py-2 text-left">Discount Type / Value</th>
    <th className="px-2 sm:px-3 py-2 text-left">Payment Method</th>
    <th className="px-2 sm:px-3 py-2 text-left">Payment Status</th>
    <th className="px-2 sm:px-3 py-2 text-left">Loan Amount (TZS)</th>          {/* NEW */}
    <th className="px-2 sm:px-3 py-2 text-left">Paid Amount (TZS)</th>          {/* NEW */}
    <th className="px-2 sm:px-3 py-2 text-left">Payment Date</th>           {/* NEW */}
    <th className="px-2 sm:px-3 py-2 text-left">Comment</th>
    <th className="px-2 sm:px-3 py-2 text-left">Date</th>
    <th className="px-2 sm:px-3 py-2 text-center">Actions</th>
  </tr>
</thead>

<tbody>
  {sales.map(sale => (
    <tr key={sale.id} className="border-b hover:bg-green-50">
<td className="px-2 text-center">
  {user.role === "admin" && (
    <input
      type="checkbox"
      checked={selectedSales.includes(sale.id)}
      onChange={() => handleSelectSale(sale.id)}
    />
  )}
</td>

      <td className="px-2 sm:px-3 py-2 font-medium">{sale.id}</td>
      <td className="px-2 sm:px-3 py-2">{sale.customer_name}</td>
      <td className="px-2 sm:px-3 py-2">
        <ul className="list-disc list-inside">
          {sale.sale_items?.map(i => (
            <li key={i.id}>{i.product?.name} x{i.quantity} | TZS {i.price.toLocaleString()} | Discount: {i.discount || 0}%</li>
          ))}
        </ul>
      </td>
      <td className="px-2 sm:px-3 py-2 text-right">{(sale.total_amount || 0).toLocaleString()}</td>
      <td className="px-2 sm:px-3 py-2">{sale.seller_name}</td>
      <td className="px-2 sm:px-3 py-2">{sale.discount_type || "-"} / {sale.discount_value || 0}</td>
      <td className="px-2 sm:px-3 py-2">{sale.payment_method || "Cash"}</td>
      <td className="px-2 sm:px-3 py-2">{sale.payment_status || "Paid"}</td>
      <td className="px-2 sm:px-3 py-2">{(sale.loan_amount || 0).toLocaleString()}</td>        {/* NEW */}
      <td className="px-2 sm:px-3 py-2">{(sale.paid_amount || 0).toLocaleString()}</td>        {/* NEW */}
      <td className="px-2 sm:px-3 py-2">{sale.loan_payment_date ? new Date(sale.loan_payment_date).toLocaleDateString() : "-"}</td> {/* NEW */}
      <td className="px-2 sm:px-3 py-2">{sale.comment || "-"}</td>
      <td className="px-2 sm:px-3 py-2">{new Date(sale.created_at).toLocaleString()}</td>
      <td className="px-2 sm:px-3 py-2 text-center flex flex-col sm:flex-row justify-center gap-2">
        <div className="flex items-center gap-2">
          <Link to={`${sale.id}`} className="text-blue-600 hover:underline flex items-center gap-1"><FaEye /> View</Link>
          <Link to={`returns?id=${sale.id}`} className="text-red-600 hover:underline flex items-center gap-1">
  <FaUndo /> Return
</Link>

          <Link to={`receipt/${sale.id}`} className="text-green-600 hover:underline flex items-center gap-1"><FaMoneyBillWave /> Receipt</Link>
        </div>
      </td>
    </tr>
  ))}
</tbody>

        </table>
      </div>
      }
    </div>
  </div>
);

};

export default SalesIndex;
