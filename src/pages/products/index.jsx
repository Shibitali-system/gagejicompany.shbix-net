import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
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
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#ef4444]"}`}>{value}</p>
  </div>
);

  const isAdmin = sellerInfo?.type === "system" && sellerInfo?.role === "admin";

  // ---------------------- Render ----------------------
  return (
  <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans">
    <Toaster position="top-right" />

    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header Card */}
<div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                flex flex-col md:flex-row justify-between items-start md:items-center gap-4
                transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]">
  
  <div className="flex-1">
    <h1 className="text-2xl md:text-3xl font-bold text-[#ef4444]">Products List</h1>
    <p className="text-sm text-gray-500 mt-1">
      Overview of all products, stock levels, purchase & sale prices. Use the filters and search below to find specific items quickly.
    </p>
  </div>

  <div className="flex gap-3 flex-wrap items-center">
    <button
      onClick={handleExport}
      className="bg-[#ef4444] text-white px-4 py-2 rounded-[12px] shadow-md hover:bg-red-600 transition-transform transform hover:-translate-y-[1px] active:translate-y-[1px] flex items-center gap-2 text-sm"
    >
      <FaFileExport /> Export to Excel
    </button>
    <Link to="new">
      <button className="bg-[#ef4444] text-white px-5 py-2 rounded-[12px] shadow-md hover:bg-red-600 transition-transform transform hover:-translate-y-[1px] active:translate-y-[1px] flex items-center gap-2 text-sm">
        <FaPlus /> Add Product
      </button>
    </Link>
  </div>
</div>


      {/* Summary Cards (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard title="Unique Products" value={totals.uniqueProducts.toLocaleString()} />
        <SummaryCard title="Total Quantity" value={totals.totalQuantity.toLocaleString()} />
        <SummaryCard title="Total Purchase" value={formatTZS(totals.totalPurchase)} />
        <SummaryCard title="Total Sales" value={formatTZS(totals.totalSales)} />
        <SummaryCard title="Expected Profit" value={formatTZS(totals.totalProfit)} />
        <SummaryCard title="Expired" value={totals.expiredCount} valueColor="text-red-500" />
      </div>

      {/* Filters + Search Card */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]
                      flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full md:w-auto bg-white rounded-[12px] shadow-md px-3 py-2">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full md:w-[250px] pl-10 pr-4 py-2 rounded-[12px] border border-gray-300 focus:ring-2 focus:ring-[#ef4444] outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-[12px] border border-gray-300 focus:ring-2 focus:ring-[#ef4444] w-full md:w-auto shadow-md"
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value)}
          className="px-3 py-2 rounded-[12px] border border-gray-300 focus:ring-2 focus:ring-[#ef4444] w-full md:w-auto shadow-md"
        >
          <option value="">All Stock</option>
          <option value="low">Low Stock (≤15)</option>
        </select>

        <select
          value={expiryFilter}
          onChange={e => setExpiryFilter(e.target.value)}
          className="px-3 py-2 rounded-[12px] border border-gray-300 focus:ring-2 focus:ring-[#ef4444] w-full md:w-auto shadow-md"
        >
          <option value="">All Status</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Bulk Delete Card */}
      {isAdmin && selectedProducts.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                        transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="px-4 py-2 rounded-xl flex items-center gap-2 shadow-md bg-red-600 hover:bg-red-700 text-white">
                <FaTrash /> Delete Selected
                <span className="bg-white text-red-600 px-2 py-0.5 rounded-lg text-xs font-semibold">
                  {selectedProducts.length}
                </span>
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-[12px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                  <FaTrash /> Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{selectedProducts.length}</strong> selected product(s)?
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
        </div>
      )}

      {/* Products Table Card */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px] overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[#ef4444] text-white text-xs uppercase tracking-wider rounded-t-[12px]">
            <tr>
              {sellerInfo?.type === "system" && <th className="px-3 py-2 text-center"><input type="checkbox" checked={checkAll} onChange={handleCheckAll} /></th>}
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Package</th>
              <th className="px-3 py-2 text-right">Purchase</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Stock</th>
              <th className="px-3 py-2 text-left">Expiry</th>
              <th className="px-3 py-2 text-left">Entered By</th>
              <th className="px-3 py-2 text-left">Office</th>
              <th className="px-3 py-2 text-right">Expected Profit</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="12" className="text-center py-6 text-gray-500">Loading products...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="12" className="text-center py-6 text-gray-500">No products found.</td></tr>
            ) : filteredProducts.map(p => {
              const expired = p.expiry_date && new Date(p.expiry_date) < new Date();
              const profit = (p.price - p.purchase_price) * (p.stock || 0);
              return (
                <tr key={p.id} className={`border-b hover:bg-gray-50 ${expired ? "bg-red-50" : p.stock <= 15 ? "bg-yellow-50" : ""}`}>
                  {sellerInfo?.type === "system" && <td className="px-3 py-1 text-center">
                    <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => handleSelectProduct(p.id)} />
                  </td>}
                  <td className="px-3 py-1 font-medium">{p.name}</td>
                  <td className="px-3 py-1">{p.category || "-"}</td>
                  <td className="px-3 py-1">{p.package_type || "-"}</td>
                  <td className="px-3 py-1 text-right">{formatTZS(p.purchase_price)}</td>
                  <td className="px-3 py-1 text-right">{formatTZS(p.price)}</td>
                  <td className={`px-3 py-1 text-right font-semibold ${p.stock <= 15 ? "text-red-600" : "text-[#ef4444]"}`}>{p.stock}</td>
                  <td className={`px-3 py-1 ${expired ? "text-red-600 font-semibold" : ""}`}>{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "-"}</td>
                  <td className="px-3 py-1">{p.entered_by || "-"}</td>
                  <td className="px-3 py-1">{p.office_name || "-"}</td>
                  <td className="px-3 py-1 text-right">{formatTZS(profit)}</td>
                  <td className="px-3 py-1 text-center flex justify-center gap-2 flex-wrap">
                    <Link to={`${p.id}`}>
                      <button className="bg-blue-500 text-white px-2 py-1 rounded-[12px] hover:bg-blue-600 flex items-center gap-1 text-xs shadow-md"><FaEye /> View</button>
                    </Link>
                    <Link to={`edit/${p.id}`}>
                      <button className="bg-yellow-500 text-white px-2 py-1 rounded-[12px] hover:bg-yellow-600 flex items-center gap-1 text-xs shadow-md"><FaEdit /> Edit</button>
                    </Link>
                    <Link to={`add-stock/${p.id}`}>
                      <button className="bg-[#ef4444] text-white px-2 py-1 rounded-[12px] hover:bg-red-600 flex items-center gap-1 text-xs shadow-md"><FaPlus /> Add Stock</button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  </div>
);

};

export default ProductsList;
