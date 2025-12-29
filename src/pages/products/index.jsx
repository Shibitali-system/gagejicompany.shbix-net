import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast, Toaster } from "react-hot-toast";
import { FaSearch, FaPlus, FaEdit, FaEye, FaFileExport, FaTrash } from "react-icons/fa";
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

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [sellerInfo, setSellerInfo] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [checkAll, setCheckAll] = useState(false);

  // ---------------------- Helpers ----------------------
  const handleSelectProduct = (id) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(pid => pid !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const handleCheckAll = () => {
    if (checkAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
    setCheckAll(!checkAll);
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.length === 0) return;

    const confirmed = window.confirm("Are you sure you want to delete selected products?");
    if (!confirmed) return;

    try {
      // STEP 1: Delete from purchase_items
      const { error: purchaseItemsError } = await supabase
        .from("purchase_items")
        .delete()
        .in("product_id", selectedProducts);

      if (purchaseItemsError) throw purchaseItemsError;

      // STEP 2: Delete from products_batches
      const { error: batchError } = await supabase
        .from("products_batches")
        .delete()
        .in("product_id", selectedProducts);

      if (batchError) throw batchError;

      // STEP 3: Delete from products
      const { error: productError } = await supabase
        .from("products")
        .delete()
        .in("id", selectedProducts);

      if (productError) throw productError;

      toast.success("Selected products deleted successfully.");

      // Update UI
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      setCheckAll(false);

    } catch (err) {
      console.error(err);
      toast.error("Failed to delete products: " + err.message);
    }
  };

  const formatTZS = (amount) =>
    `TZS ${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // ---------------------- Fetch Seller Info ----------------------
  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) throw new Error("User not logged in");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser) {
          setSellerInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            type: "system",
            office_id: systemUser.office_id,
            office_name: systemUser.office_name,
            role: "admin" // mark as admin by default if needed
          });
          return;
        }

        const { data: employeeUser } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (employeeUser) {
          const { data: officeData } = await supabase
            .from("systems_users")
            .select("office_name, office_id")
            .eq("office_id", employeeUser.office_id)
            .maybeSingle();

          setSellerInfo({
            id: employeeUser.id,
            name: employeeUser.name,
            type: "employee",
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
          return;
        }

        toast.error("Seller information not found.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch seller information.");
      }
    };
    fetchSellerInfo();
  }, []);

  // ---------------------- Fetch Products ----------------------
  useEffect(() => {
    const fetchProducts = async () => {
      if (!sellerInfo?.office_id) return;
      setLoading(true);
      try {
        let query = supabase
          .from("products")
          .select("*")
          .eq("office_id", sellerInfo.office_id)
          .order("created_at", { ascending: false });

        if (searchQuery.trim()) query = query.ilike("name", `%${searchQuery}%`);
        if (categoryFilter) query = query.eq("category", categoryFilter);

        const { data, error } = await query;
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        toast.error("Failed to fetch products: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchQuery, categoryFilter, sellerInfo]);

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
      const isLowStock = stockFilter === "low" ? parseInt(p.stock) <= 15 : true;
      const isExpired = expiryFilter === "expired" ? p.expiry_date && new Date(p.expiry_date) < new Date() : true;
      return matchesSearch && matchesCategory && isLowStock && isExpired;
    });
  }, [products, searchQuery, categoryFilter, stockFilter, expiryFilter]);

  // ---------------------- Totals / Summary ----------------------
  const totals = useMemo(() => {
    const totalQuantity = filteredProducts.reduce((acc, p) => acc + (parseInt(p.stock) || 0), 0);
    const totalPurchase = filteredProducts.reduce((acc, p) => acc + (p.purchase_price || 0) * (p.stock || 0), 0);
    const totalSales = filteredProducts.reduce((acc, p) => acc + (p.price || 0) * (p.stock || 0), 0);
    const totalProfit = totalSales - totalPurchase;
    const uniqueProducts = filteredProducts.length;
    const expiredCount = filteredProducts.filter(p => p.expiry_date && new Date(p.expiry_date) < new Date()).length;
    return { totalQuantity, totalPurchase, totalSales, totalProfit, uniqueProducts, expiredCount };
  }, [filteredProducts]);

  const handleExport = () => {
    if (filteredProducts.length === 0) {
      toast.error("No products to export!");
      return;
    }

    const exportData = filteredProducts.map(p => ({
      Name: p.name,
      Category: p.category,
      Package: p.package_type,
      "Purchase Price": p.purchase_price,
      "Selling Price": p.price,
      Stock: p.stock,
      "Expiry Date": p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "-",
      "Entered By": p.entered_by || "-",
      "Office Name": p.office_name || "-",
      "Expected Profit": (p.price - p.purchase_price) * (p.stock || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "Products_List.xlsx");
  };

const handleExportPDF = () => {
  if (filteredProducts.length === 0) {
    toast.error("No products to export!");
    return;
  }

  const doc = new jsPDF();

  // Add Office Name as header
  doc.setFontSize(14);
  doc.text(`Office: ${sellerInfo?.office_name || "-"}`, 14, 20);
  doc.setFontSize(12);
  doc.text(`Products List Report`, 14, 28);

  // Prepare table columns
  const columns = [
    { header: "Name", dataKey: "name" },
    { header: "Category", dataKey: "category" },
    { header: "Package", dataKey: "package_type" },
    { header: "Purchase Price", dataKey: "purchase_price" },
    { header: "Selling Price", dataKey: "price" },
    { header: "Stock", dataKey: "stock" },
    { header: "Expiry Date", dataKey: "expiry_date" },
    { header: "Entered By", dataKey: "entered_by" },
    { header: "Expected Profit", dataKey: "profit" },
  ];

  // Prepare table rows
  const rows = filteredProducts.map(p => {
    const expired = p.expiry_date && new Date(p.expiry_date) < new Date();
    const profit = (p.price - p.purchase_price) * (p.stock || 0);
    return {
      name: p.name,
      category: p.category || "-",
      package_type: p.package_type || "-",
      purchase_price: formatTZS(p.purchase_price),
      price: formatTZS(p.price),
      stock: p.stock,
      expiry_date: p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "-",
      entered_by: p.entered_by || "-",
      profit: formatTZS(profit),
    };
  });

  // Generate PDF Table
  doc.autoTable({
    startY: 35,
    head: [columns.map(col => col.header)],
    body: rows.map(r => columns.map(c => r[c.dataKey])),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    styles: { cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  // Save PDF
  doc.save(`Products_List_${sellerInfo?.office_name || "Office"}.pdf`);
};

const handleExportProductStatement = async (productId) => {
  if (!productId) return toast.error("Product not selected!");

  const product = products.find(p => p.id === productId);
  if (!product) return toast.error("Product not found!");

  // fetch movements
  const { data: movements, error } = await supabase
    .from("product_movements")
    .select("*")
    .eq("product_id", productId)
    .order("date", { ascending: true });

  if (error) return toast.error("Failed to fetch movements: " + error.message);

  let balance = 0;
  const rows = [];

  // ✅ Add initial stock as first row
  if (product.stock !== null) {
    const totalIn = movements.filter(m => m.type === "in").reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = movements.filter(m => m.type === "out").reduce((sum, m) => sum + m.quantity, 0);
    const initialStock = product.stock - totalIn + totalOut; // backward calculation

    rows.push({
      date: new Date(product.created_at).toLocaleDateString(),
      in: "-",
      out: "-",
      balance: initialStock,
      note: "Initial Stock",
    });

    balance = initialStock;
  }

  // Map movements
  movements.forEach(m => {
    if (m.type === "in") balance += m.quantity;
    if (m.type === "out") balance -= m.quantity;
    rows.push({
      date: new Date(m.date).toLocaleDateString(),
      in: m.type === "in" ? m.quantity : "-",
      out: m.type === "out" ? m.quantity : "-",
      balance: balance,
      note: m.note || "",
    });
  });

  // Generate PDF (iyo part inakaa ile ile)
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Office: ${sellerInfo?.office_name || "-"}`, 14, 20);
  doc.setFontSize(12);
  doc.text(`Product Statement: ${product.name}`, 14, 28);

  const columns = [
    { header: "Date", dataKey: "date" },
    { header: "Stock In", dataKey: "in" },
    { header: "Stock Out", dataKey: "out" },
    { header: "Balance", dataKey: "balance" },
    { header: "Note", dataKey: "note" },
  ];

  doc.autoTable({
    startY: 35,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => r[c.dataKey])),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    styles: { cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`Product_Statement_${product.name}.pdf`);
};


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

  const isAdmin = sellerInfo?.type === "system" && sellerInfo?.role === "admin";

 // ---------------------- Render ----------------------
return (
  <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans">
    <Toaster position="top-right" />

    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header Card */}
      <div
        className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                   flex flex-col md:flex-row justify-between items-start md:items-center gap-4
                   transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]"
      >
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-[#2563EB]">
            Orodha ya Bidhaa
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Muhtasari wa bidhaa zote, kiwango cha stoo, bei ya manunuzi na mauzo.
            Tumia vichujio na utafutaji hapa chini kupata bidhaa kwa haraka.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={handleExport}
            className="bg-[#2563EB] text-white px-4 py-2 rounded-[12px] shadow-md hover:bg-red-600 transition-transform transform hover:-translate-y-[1px] active:translate-y-[1px] flex items-center gap-2 text-sm"
          >
            <FaFileExport /> Hamisha kwenda Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="bg-green-600 text-white px-4 py-2 rounded-[12px] shadow-md hover:bg-green-700 transition-transform transform hover:-translate-y-[1px] active:translate-y-[1px] flex items-center gap-2 text-sm"
          >
            <FaFileExport /> Hamisha kwenda PDF
          </button>

          <Link to="new">
            <button className="bg-[#2563EB] text-white px-5 py-2 rounded-[12px] shadow-md hover:bg-red-600 transition-transform transform hover:-translate-y-[1px] active:translate-y-[1px] flex items-center gap-2 text-sm">
              <FaPlus /> Ongeza Bidhaa
            </button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          title="Idadi ya Bidhaa za Kipekee"
          value={totals.uniqueProducts.toLocaleString()}
        />
        <SummaryCard
          title="Jumla ya Kiasi (Stoo)"
          value={totals.totalQuantity.toLocaleString()}
        />
        <SummaryCard
          title="Jumla ya Manunuzi"
          value={formatTZS(totals.totalPurchase)}
        />
        <SummaryCard
          title="Jumla ya Mauzo"
          value={formatTZS(totals.totalSales)}
        />
        <SummaryCard
          title="Faida Inayotarajiwa"
          value={formatTZS(totals.totalProfit)}
        />
        <SummaryCard
          title="Bidhaa Zilizoharibika"
          value={totals.expiredCount}
          valueColor="text-red-500"
        />
      </div>

      {/* Filters + Search */}
      <div
        className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                   transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]
                   flex flex-col md:flex-row gap-3 items-center"
      >
        <div className="relative flex-1 w-full md:w-auto bg-white rounded-[12px] shadow-md px-3 py-2">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tafuta bidhaa..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full md:w-[250px] pl-10 pr-4 py-2 rounded-[12px] border border-gray-300 focus:ring-2 focus:ring-[#2563EB] outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-[12px] border border-gray-300 focus:ring-2 focus:ring-[#2563EB] w-full md:w-auto shadow-md"
        >
          <option value="">Makundi Yote</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value)}
          className="px-3 py-2 rounded-[12px] border border-gray-300 focus:ring-2 focus:ring-[#2563EB] w-full md:w-auto shadow-md"
        >
          <option value="">Stoo Zote</option>
          <option value="low">Stock Ndogo (≤15)</option>
        </select>

        <select
          value={expiryFilter}
          onChange={e => setExpiryFilter(e.target.value)}
          className="px-3 py-2 rounded-[12px] border border-gray-300 focus:ring-2 focus:ring-[#2563EB] w-full md:w-auto shadow-md"
        >
          <option value="">Hali Zote</option>
          <option value="expired">Zilizoharibika</option>
        </select>
      </div>

      {/* Bulk Delete */}
      {isAdmin && selectedProducts.length > 0 && (
        <div
          className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                     transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]"
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="px-4 py-2 rounded-xl flex items-center gap-2 shadow-md bg-red-600 hover:bg-red-700 text-white">
                <FaTrash /> Futa Zilizochaguliwa
                <span className="bg-white text-red-600 px-2 py-0.5 rounded-lg text-xs font-semibold">
                  {selectedProducts.length}
                </span>
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-[12px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                  <FaTrash /> Thibitisha Kufuta
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Una uhakika unataka kufuta bidhaa
                  <strong> {selectedProducts.length} </strong>
                  ulizochagua?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">
                  Ghairi
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteSelected}
                  className="bg-red-600 text-white rounded-xl hover:bg-red-700"
                >
                  Ndiyo, Futa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Products Table */}
      <div
        className="bg-white border border-[#e5e7eb] rounded-[12px] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                   transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px] overflow-x-auto"
      >

        {/* Desktop Table */}
        <div className="hidden md:block bg-white border border-[#e5e7eb] rounded-[12px] shadow overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
              <tr>
                {sellerInfo?.type === "system" && (
                  <th className="px-3 py-2 text-center">
                    <input type="checkbox" checked={checkAll} onChange={handleCheckAll} />
                  </th>
                )}
                <th className="px-3 py-2 text-left">Jina</th>
                <th className="px-3 py-2 text-left">Kundi</th>
                <th className="px-3 py-2 text-left">Aina ya Kifungashio</th>
                <th className="px-3 py-2 text-right">Bei ya Manunuzi</th>
                <th className="px-3 py-2 text-right">Bei ya Mauzo</th>
                <th className="px-3 py-2 text-right">Stoo</th>
                <th className="px-3 py-2 text-left">Tarehe ya Kuisha</th>
                <th className="px-3 py-2 text-left">Aliyeingiza</th>
                <th className="px-3 py-2 text-left">Ofisi</th>
                <th className="px-3 py-2 text-right">Faida Inayotarajiwa</th>
                <th className="px-3 py-2 text-center">Vitendo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" className="text-center py-6 text-gray-500">
                    Inapakia bidhaa...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center py-6 text-gray-500">
                    Hakuna bidhaa zilizopatikana.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const expired =
                    p.expiry_date && new Date(p.expiry_date) < new Date();
                  const profit =
                    (p.price - p.purchase_price) * (p.stock || 0);

                  return (
                    <tr
                      key={p.id}
                      className={`border-b hover:bg-gray-50 ${
                        expired
                          ? "bg-red-50"
                          : p.stock <= 15
                          ? "bg-yellow-50"
                          : ""
                      }`}
                    >
                      {sellerInfo?.type === "system" && (
                        <td className="px-3 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(p.id)}
                            onChange={() => handleSelectProduct(p.id)}
                          />
                        </td>
                      )}
                      <td className="px-3 py-1 font-medium">{p.name}</td>
                      <td className="px-3 py-1">{p.category || "-"}</td>
                      <td className="px-3 py-1">{p.package_type || "-"}</td>
                      <td className="px-3 py-1 text-right">
                        {formatTZS(p.purchase_price)}
                      </td>
                      <td className="px-3 py-1 text-right">
                        {formatTZS(p.price)}
                      </td>
                      <td
                        className={`px-3 py-1 text-right font-semibold ${
                          p.stock <= 15
                            ? "text-red-600"
                            : "text-[#2563EB]"
                        }`}
                      >
                        {p.stock}
                      </td>
                      <td
                        className={`px-3 py-1 ${
                          expired ? "text-red-600 font-semibold" : ""
                        }`}
                      >
                        {p.expiry_date
                          ? new Date(p.expiry_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-3 py-1">{p.entered_by || "-"}</td>
                      <td className="px-3 py-1">{p.office_name || "-"}</td>
                      <td className="px-3 py-1 text-right">
                        {formatTZS(profit)}
                      </td>
                      <td className="px-3 py-1 text-center flex justify-center gap-2 flex-wrap">
                        <Link to={`${p.id}`}>
                          <button className="bg-blue-500 text-white px-2 py-1 rounded-[12px] hover:bg-blue-600 flex items-center gap-1 text-xs shadow-md">
                            <FaEye /> Tazama
                          </button>
                        </Link>
                        <Link to={`edit/${p.id}`}>
                          <button className="bg-yellow-500 text-white px-2 py-1 rounded-[12px] hover:bg-yellow-600 flex items-center gap-1 text-xs shadow-md">
                            <FaEdit /> Hariri
                          </button>
                        </Link>
                        <Link to={`add-stock/${p.id}`}>
                          <button className="bg-[#2563EB] text-white px-2 py-1 rounded-[12px] hover:bg-red-600 flex items-center gap-1 text-xs shadow-md">
                            <FaPlus /> Ongeza Stock
                          </button>
                        </Link>
                        <button
                          onClick={() => handleExportProductStatement(p.id)}
                          className="bg-green-500 text-white px-2 py-1 rounded-[12px] hover:bg-green-600 flex items-center gap-1 text-xs shadow-md"
                        >
                          <FaFileExport /> Statement
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {filteredProducts.map(p => {
            const expired =
              p.expiry_date && new Date(p.expiry_date) < new Date();
            const profit =
              (p.price - p.purchase_price) * (p.stock || 0);

            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden transition-transform transform hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 flex justify-between items-center">
                  <span className="font-bold text-lg">{p.name}</span>
                  {sellerInfo?.type === "system" && (
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={() => handleSelectProduct(p.id)}
                      className="accent-white w-5 h-5"
                    />
                  )}
                </div>

                <div className="p-4 space-y-1 text-sm text-gray-700">
                  <p><span className="font-semibold">Kundi:</span> {p.category || "-"}</p>
                  <p><span className="font-semibold">Kifungashio:</span> {p.package_type || "-"}</p>
                  <p><span className="font-semibold">Manunuzi:</span> {formatTZS(p.purchase_price)}</p>
                  <p><span className="font-semibold">Mauzo:</span> {formatTZS(p.price)}</p>
                  <p>
                    <span className="font-semibold">Stoo:</span>{" "}
                    <span className={`${p.stock <= 15 ? "text-red-600 font-semibold" : "text-[#2563EB]"}`}>
                      {p.stock}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Kuisha:</span>{" "}
                    <span className={`${expired ? "text-red-600 font-semibold" : ""}`}>
                      {p.expiry_date
                        ? new Date(p.expiry_date).toLocaleDateString()
                        : "-"}
                    </span>
                  </p>
                  <p><span className="font-semibold">Aliyeingiza:</span> {p.entered_by || "-"}</p>
                  <p><span className="font-semibold">Ofisi:</span> {p.office_name || "-"}</p>
                  <p><span className="font-semibold">Faida:</span> {formatTZS(profit)}</p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <Link to={`${p.id}`}>
                      <button className="bg-blue-500 text-white px-3 py-1 rounded-xl hover:bg-blue-600 flex items-center gap-1 text-xs shadow-md">
                        <FaEye /> Tazama
                      </button>
                    </Link>
                    <Link to={`edit/${p.id}`}>
                      <button className="bg-yellow-500 text-white px-3 py-1 rounded-xl hover:bg-yellow-600 flex items-center gap-1 text-xs shadow-md">
                        <FaEdit /> Hariri
                      </button>
                    </Link>
                    <Link to={`add-stock/${p.id}`}>
                      <button className="bg-[#2563EB] text-white px-3 py-1 rounded-xl hover:bg-red-600 flex items-center gap-1 text-xs shadow-md">
                        <FaPlus /> Ongeza Stock
                      </button>
                    </Link>
                    <button
                      onClick={() => handleExportProductStatement(p.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded-xl hover:bg-green-600 flex items-center gap-1 text-xs shadow-md"
                    >
                      <FaFileExport /> Statement
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  </div>
);



};

export default ProductsList;
