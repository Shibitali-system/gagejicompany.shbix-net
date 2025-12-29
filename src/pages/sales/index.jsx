import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { sendNotification } from "../utils/sendNotification";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  FaSearch,
  FaEye,
  FaUndo,
  FaFilePdf,
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

  setLoading(true);

  try {
    // 🔐 Get access token for Edge Function
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("User not authenticated");

    // 1️⃣ Fetch sale_items for selected sales
    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select("*")
      .in("sale_id", selectedSales);
    if (itemsError) throw itemsError;

    // 2️⃣ Fetch sales
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .in("id", selectedSales);
    if (salesError) throw salesError;

    // 3️⃣ Insert sales into deleted_sales
    const deletedSalesData = salesData.map((sale) => ({
      original_sale_id: sale.id,
      office_id: sale.office_id,
      seller_id: sale.seller_id,
      customer_id: sale.customer_id,
      total_amount: sale.total_amount,
      payment_status: sale.payment_status,
      payment_method: sale.payment_method,
      comment: sale.comment,
      deleted_by: user.id,
    }));
    const { data: insertedDeletedSales, error: delSalesError } = await supabase
      .from("deleted_sales")
      .insert(deletedSalesData)
      .select();
    if (delSalesError) throw delSalesError;

    // 4️⃣ Map sale_items to the new deleted_sale_id
    const deletedSaleItems = saleItems.map((item) => {
      const deletedSale = insertedDeletedSales.find(
        (ds) => ds.original_sale_id === item.sale_id
      );
      return {
        deleted_sale_id: deletedSale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        deleted_by: user.id,
      };
    });

    // 5️⃣ Insert sale_items into deleted_sale_items
    const { error: delItemsError } = await supabase
      .from("deleted_sale_items")
      .insert(deletedSaleItems);
    if (delItemsError) throw delItemsError;

    // 6️⃣ Restore stock
    for (let item of saleItems) {
      await supabase.rpc("increment_product_stock", {
        product_id_input: item.product_id,
        qty_input: item.quantity,
      });
    }

    // 7️⃣ Delete original sale_items & sales
    await supabase.from("sale_items").delete().in("sale_id", selectedSales);
    await supabase.from("sales").delete().in("id", selectedSales);

    // 8️⃣ Send push notification via Edge Function
    try {
      await fetch(
        "https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/quick-handler",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`, // JWT ya user
          },
          body: JSON.stringify({
            auth_user_id: user.id,
            office_id: user.office_id,
            title: "Sales Deleted",
            message: `${user.name} deleted ${selectedSales.length} sale(s)`,
            url: "/pharmacy/dashboard/sales",
          }),
        }
      );
    } catch (pushErr) {
      console.warn("🔕 Push notification failed:", pushErr);
    }

    // 9️⃣ Local / PWA notification
    notify("Sales Deleted", {
      body: `${user.name} deleted ${selectedSales.length} sale(s)`,
      icon: "/pwa-192.png",
      badge: "/badge-72.png",
    });

    // 🔟 Update UI
    toast.success("✅ Selected sales soft-deleted successfully");
    setSales((prev) => prev.filter((s) => !selectedSales.includes(s.id)));
    setSelectedSales([]);
    setCheckAll(false);
  } catch (err) {
    console.error("❌ Delete error:", err);
    toast.error("Failed to delete sales: " + (err.message || err));
  } finally {
    setLoading(false);
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

// ---------------------- Summary Card Component ----------------------
const SummaryCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4
      flex flex-col items-center justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
  </div>
);

const exportToPDF = async () => {
  const officeName = user?.office_name || "UNKNOWN OFFICE";

  const doc = new jsPDF({ orientation: "landscape" });

  // Header
  doc.setFontSize(16);
  doc.setTextColor("#2563EB");
  doc.setFont("helvetica", "bold");
  doc.text(officeName, doc.internal.pageSize.getWidth()/2, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor("#000");
  doc.setFont("helvetica", "normal");
  doc.text(`Sales Report (${filterType.charAt(0).toUpperCase() + filterType.slice(1)})`, doc.internal.pageSize.getWidth()/2, 22, { align: "center" });

  const tableColumn = ["Sale ID","Customer","Total (TZS)","Seller","Payment Status","Date","Products (Name xQty Price Disc)"];

  const tableRows = filteredSales.map(sale => [
    sale.id,
    sale.customer_name,
    (sale.total_amount || 0).toLocaleString(),
    sale.seller_name,
    sale.payment_status || "Paid",
    new Date(sale.created_at).toLocaleString(),
    sale.sale_items?.map(i => `${i.product?.name} x${i.quantity} | TZS ${i.price.toLocaleString()} | Disc: ${i.discount || 0}%`).join("\n")
  ]);

  // Calculate Grand Total
  const grandTotal = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

  doc.autoTable({
    startY: 30,
    head: [tableColumn],
    body: tableRows,
    styles: { fontSize: 10, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [37,99,235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245,245,245] },
    columnStyles: { 6: { cellWidth: 120 } },
    didDrawPage: (data) => {
      // Optional: page footer per page
    },
    foot: [
      ["", "", grandTotal.toLocaleString(), "", "", "", ""]
    ],
    footStyles: { fillColor: [37,99,235], textColor: 255, fontStyle: 'bold' }
  });

  // Footer / Page number
  const pageCount = doc.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
  }

  doc.save(`Sales_Report_${new Date().toISOString().slice(0,10)}.pdf`);
};


  // Excel export
  const exportToExcel = () => {
  if (!filteredSales || filteredSales.length === 0) {
    toast.error("No sales to export");
    return;
  }

  // 1️⃣ Map sales data
  const data = filteredSales.map(s => ({
    "Sale ID": s.id,
    Customer: s.customer_name,
    Seller: s.seller_name,
    Products:
      s.sale_items?.map(i =>
        `${i.product?.name || "-"} x${i.quantity} (TZS ${i.price?.toLocaleString() || 0}) | Discount: ${i.discount || 0}%`
      ).join("; ") || "-",
    "Total Amount (TZS)": s.total_amount || 0,
    "Payment Method": s.payment_method || "Cash",
    "Payment Status": s.payment_status || "Paid",
    "Loan Amount (TZS)": s.loan_amount || 0,
    "Paid Amount (TZS)": s.paid_amount || 0,
    "Payment Date": s.loan_payment_date ? new Date(s.loan_payment_date).toLocaleDateString() : "-",
    Comment: s.comment || "-",
    Date: new Date(s.created_at).toLocaleString(),
  }));

  // 2️⃣ Add totals row
  const totalsRow = {
    "Sale ID": "TOTAL",
    Customer: "",
    Seller: "",
    Products: "",
    "Total Amount (TZS)": filteredSales.reduce((acc, s) => acc + (s.total_amount || 0), 0),
    "Loan Amount (TZS)": filteredSales.reduce((acc, s) => acc + (s.loan_amount || 0), 0),
    "Paid Amount (TZS)": filteredSales.reduce((acc, s) => acc + (s.paid_amount || 0), 0),
    "Payment Method": "",
    "Payment Status": "",
    "Payment Date": "",
    Comment: "",
    Date: "",
  };

  data.push(totalsRow);

  // 3️⃣ Convert to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data, { skipHeader: false });

  // 4️⃣ Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");

  // 5️⃣ Format header row bold
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for(let C = range.s.c; C <= range.e.c; ++C) {
    const cell = worksheet[XLSX.utils.encode_cell({ r:0, c:C })];
    if(cell && !cell.s) cell.s = {};
    cell.s = { font: { bold: true } };
  }

  // 6️⃣ Auto-width columns
  const colWidths = [];
  for(let C = range.s.c; C <= range.e.c; ++C) {
    let maxLength = 10;
    for(let R = range.s.r; R <= range.e.r; ++R) {
      const cell = worksheet[XLSX.utils.encode_cell({ r:R, c:C })];
      if(cell?.v) {
        maxLength = Math.max(maxLength, cell.v.toString().length);
      }
    }
    colWidths.push({ wch: maxLength + 2 });
  }
  worksheet['!cols'] = colWidths;

  // 7️⃣ Save file
  XLSX.writeFile(workbook, `sales_export_${new Date().toISOString().slice(0,10)}.xlsx`);
};

  if (loadingUser)
    return <p className="p-6 text-gray-600">Loading user data...</p>;

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />

    <div className="max-w-7xl mx-auto space-y-6">

      {/* Kadi ya Kichwa */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] 
                      flex flex-col md:flex-row items-start md:items-center justify-between gap-4
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#2563EB" }}>
            Rekodi za Mauzo
          </h1>
          <p className="text-sm text-gray-500 mt-1">Muhtasari wa mauzo ya hivi karibuni na hatua zilizofanywa</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="new"
            className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#e03636] flex items-center gap-2 shadow-sm"
          >
            <FaPlus /> Rekodi Mauzo Mapya
          </Link>

          <Link
            to="proformer/new"
            className="bg-white text-[#2563EB] border border-[#e5e7eb] rounded-[4px] px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] hover:bg-[#fdfdfd] hover:shadow-md transition-all duration-200 font-sans text-sm"
          >
            <FaFileExcel /> Unda Proformer
          </Link>

          <Link
            to="loans"
            className="bg-white text-[#2563EB] border border-[#e5e7eb] rounded-[4px] px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] hover:bg-[#fdfdfd] hover:shadow-md transition-all duration-200 font-sans text-sm"
          >
            <FaMoneyBillWave /> Ukaguzi wa Mikopo / Deni
          </Link>
        </div>
      </div>

      {/* Kadi ya Ukitumia Hakuna Ruhusa Kamili */}
      {user?.role === "employee" && !user.permissions.includes("view_all_sales") && (
        <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                        transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px] text-sm">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium" style={{ color: "#2563EB" }}>⚠️ Mtazamo Mdogo</p>
              <p className="text-gray-600">
                Unaona <strong>mauzo yako pekee</strong>. Huna ruhusa ya kuona mauzo yote.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kadi ya Vichujio & Utafutaji */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          {/* Vichujio */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className={`px-3 py-1 rounded-xl border ${filterType === "today" ? "bg-[#2563EB] text-white" : "bg-white"}`}
              onClick={() => setFilterType("today")}
            >
              Leo
            </button>
            <button
              className={`px-3 py-1 rounded-xl border ${filterType === "week" ? "bg-[#2563EB] text-white" : "bg-white"}`}
              onClick={() => setFilterType("week")}
            >
              Wiki Hii
            </button>
            <button
              className={`px-3 py-1 rounded-xl border ${filterType === "month" ? "bg-[#2563EB] text-white" : "bg-white"}`}
              onClick={() => setFilterType("month")}
            >
              Mwezi Huu
            </button>
            <button
              className={`px-3 py-1 rounded-xl border ${filterType === "year" ? "bg-[#2563EB] text-white" : "bg-white"}`}
              onClick={() => setFilterType("year")}
            >
              Mwaka Huu
            </button>

            <div className="flex items-center gap-2 border rounded-xl px-3 py-1 bg-white">
              <input
                type="date"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setFilterType("custom"); }}
                className="outline-none text-sm"
              />
              <span className="text-gray-400">hadi</span>
              <input
                type="date"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setFilterType("custom"); }}
                className="outline-none text-sm"
              />
            </div>
          </div>

          {/* Vitendo */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="bg-[#2563EB] text-white px-3 py-1 rounded-xl flex items-center gap-2 shadow-sm whitespace-nowrap hover:bg-[#e03636]"
            >
              <FaFileExcel /> Hamisha Excel
            </button>
            <button
              onClick={exportToPDF}
              className="bg-[#2563EB] text-white px-3 py-1 rounded-xl flex items-center gap-2 shadow-sm whitespace-nowrap hover:bg-[#e03636]"
            >
              <FaFilePdf /> Hamisha PDF
            </button>
          </div>
        </div>

        {/* Safu ya Utafutaji */}
        <div className="mt-4">
          <div className="flex items-center gap-2 w-full max-w-md">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              placeholder="Tafuta kwa ID au maelezo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2"
            />
          </div>
        </div>
      </div>

      {/* Safu ya Kadi za Muhtasari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Jumla ya Muamala" value={totals?.totalTransactions ?? 0} />
        <SummaryCard title="Jumla ya Mauzo" value={`TZS ${totals?.totalSalesAmount?.toLocaleString() ?? 0}`} />
        <SummaryCard title="Jumla ya Faida" value={`TZS ${totals?.profit?.toLocaleString() ?? 0}`} />
        <SummaryCard title="Bidhaa Zenye Stoo Chache" value={totals?.lowStockCount ?? 0} />
      </div>

      {/* Kadi ya Vitendo kwa Wingi */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]
                      flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {user?.role === "admin" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={selectedSales.length === 0}
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all
                    ${selectedSales.length === 0 ? "bg-red-200 cursor-not-allowed text-gray-600" : "bg-[#2563EB] text-white hover:bg-[#e03636]"}`}
                >
                  <FaTrash />
                  Futa Zilizochaguliwa
                  {selectedSales.length > 0 && (
                    <span className="bg-white text-[#2563EB] px-2 py-0.5 rounded-lg text-xs font-semibold">
                      {selectedSales.length}
                    </span>
                  )}
                </button>
              </AlertDialogTrigger>

              <AlertDialogContent className="rounded-[12px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2" style={{ color: "#2563EB" }}>
                    <FaTrash /> Thibitisha Ufutaji
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Una uhakika unataka kufuta <strong>{selectedSales.length}</strong> mauzo yaliyoteuliwa?
                    <br />
                    Hatua hii haiwezi kubadilishwa. Stoo ya bidhaa itarejeshwa.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl border px-4 py-2">Ghairi</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSelected}
                    className="bg-[#2563EB] text-white rounded-xl hover:bg-[#e03636] px-4 py-2"
                  >
                    Ndiyo, Futa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {selectedSales.length > 0 ? `${selectedSales.length} zilizoteuliwa` : "Hakuna vitu vilivyochaguliwa"}
        </div>
      </div>

      {/* Meza / Kadi */}
      <div>
        {loading ? (
          <div className="p-6 text-center text-gray-600">Inapakia mauzo...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 font-semibold">{error}</div>
        ) : sales.length === 0 ? (
          <div className="p-6 text-center text-gray-600">Hakuna mauzo yaliyorekodiwa.</div>
        ) : (
          <>
            {/* Meza kwa Desktop */}
            <div className="hidden md:block bg-white border border-[#e5e7eb] rounded-[12px] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
                    <th className="px-3 py-3 text-center w-8">
                      {user.role === "admin" && <input type="checkbox" checked={checkAll} onChange={handleCheckAll} />}
                    </th>
                    <th className="px-3 py-3 text-left">ID ya Mauzo</th>
                    <th className="px-3 py-3 text-left">Mteja</th>
                    <th className="px-3 py-3 text-left">Bidhaa (Kiasi / Bei / Punguzo)</th>
                    <th className="px-3 py-3 text-right">Jumla (TZS)</th>
                    <th className="px-3 py-3 text-left">Muuzaji</th>
                    <th className="px-3 py-3 text-left">Aina ya Punguzo / Thamani</th>
                    <th className="px-3 py-3 text-left">Njia ya Malipo</th>
                    <th className="px-3 py-3 text-left">Hali ya Malipo</th>
                    <th className="px-3 py-3 text-left">Kiasi cha Deni (TZS)</th>
                    <th className="px-3 py-3 text-left">Kiasi Kilicholipwa (TZS)</th>
                    <th className="px-3 py-3 text-left">Tarehe ya Malipo</th>
                    <th className="px-3 py-3 text-left">Maelezo</th>
                    <th className="px-3 py-3 text-left">Tarehe</th>
                    <th className="px-3 py-3 text-center">Vitendo</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-3 py-3 text-center">
                        {user.role === "admin" && (
                          <input type="checkbox" checked={selectedSales.includes(sale.id)} onChange={() => handleSelectSale(sale.id)} />
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium">{sale.id}</td>
                      <td className="px-3 py-3">{sale.customer_name}</td>
                      <td className="px-3 py-3">
                        <ul className="list-disc list-inside space-y-1">
                          {sale.sale_items?.map(i => (
                            <li key={i.id} className="text-sm text-gray-700">
                              {i.product?.name} x{i.quantity} | TZS {Number(i.price).toLocaleString()} | Punguzo: {i.discount || 0}%
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{(sale.total_amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-3">{sale.seller_name}</td>
                      <td className="px-3 py-3">{sale.discount_type || "-"} / {sale.discount_value || 0}</td>
                      <td className="px-3 py-3">{sale.payment_method || "Cash"}</td>
                      <td className="px-3 py-3">{sale.payment_status || "Imelipwa"}</td>
                      <td className="px-3 py-3">{(sale.loan_amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-3">{(sale.paid_amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-3">{sale.loan_payment_date ? new Date(sale.loan_payment_date).toLocaleDateString() : "-"}</td>
                      <td className="px-3 py-3">{sale.comment || "-"}</td>
                      <td className="px-3 py-3">{new Date(sale.created_at).toLocaleString()}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <Link to={`${sale.id}`} className="bg-white border rounded-lg px-3 py-1 text-sm hover:shadow-sm flex items-center gap-1"><FaEye /> Angalia</Link>
                          <Link to={`returns?id=${sale.id}`} className="bg-white border rounded-lg px-3 py-1 text-sm hover:shadow-sm flex items-center gap-1"><FaUndo /> Rejesha</Link>
                          <Link to={`receipt/${sale.id}`} className="bg-white border rounded-lg px-3 py-1 text-sm hover:shadow-sm flex items-center gap-1"><FaMoneyBillWave /> Risiti</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kadi za Kisasa kwa Simu */}
            <div className="md:hidden space-y-4">
              {sales.map(sale => (
                <div 
                  key={sale.id} 
                  className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden transition-transform transform hover:scale-[1.02] hover:shadow-xl"
                >
                  {/* Kichwa */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 flex justify-between items-center">
                    <span className="font-bold text-lg">Mauzo #{sale.id}</span>
                    {user.role === "admin" && (
                      <input 
                        type="checkbox" 
                        checked={selectedSales.includes(sale.id)} 
                        onChange={() => handleSelectSale(sale.id)} 
                        className="accent-white w-5 h-5"
                      />
                    )}
                  </div>

                  {/* Mwili */}
                  <div className="p-4 space-y-2">
                    <p><span className="font-semibold">Mteja:</span> {sale.customer_name}</p>
                    <p>
                      <span className="font-semibold">Jumla:</span> 
                      <span className="text-green-600 font-bold ml-1">TZS {(sale.total_amount || 0).toLocaleString()}</span>
                    </p>
                    <p><span className="font-semibold">Muuzaji:</span> {sale.seller_name}</p>
                    <p>
                      <span className="font-semibold">Hali ya Malipo:</span> 
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        sale.payment_status === "Paid" ? "bg-green-100 text-green-700" :
                        sale.payment_status === "Pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {sale.payment_status || "Imelipwa"}
                      </span>
                    </p>

                    {/* Accordion ya Bidhaa */}
                    <details className="group">
                      <summary className="cursor-pointer font-semibold text-gray-700 flex justify-between items-center">
                        Bidhaa ({sale.sale_items?.length})
                        <span className="transition-transform duration-200 group-open:rotate-180">▼</span>
                      </summary>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {sale.sale_items?.map(i => (
                          <li key={i.id} className="text-sm text-gray-700">
                            {i.product?.name} x{i.quantity} | TZS {Number(i.price).toLocaleString()} | Punguzo: {i.discount || 0}%
                          </li>
                        ))}
                      </ul>
                    </details>

                    {/* Vitufe vya Vitendo */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link 
                        to={`${sale.id}`} 
                        className="flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      >
                        <FaEye /> Angalia
                      </Link>
                      <Link 
                        to={`returns?id=${sale.id}`} 
                        className="flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition"
                      >
                        <FaUndo /> Rejesha
                      </Link>
                      <Link 
                        to={`receipt/${sale.id}`} 
                        className="flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                      >
                        <FaMoneyBillWave /> Risiti
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Kadi ya Mwisho / Maelezo */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]
                      text-sm text-gray-600">
        <p>
          Kumbuka: tumia vichujio hapo juu kupunguza matokeo. Kwa vitendo vya wingi, chagua safu na tumia kitufe cha "Futa Zilizochaguliwa".
        </p>
      </div>

    </div>
  </div>
);





};

export default SalesIndex;
