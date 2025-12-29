import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../supabaseClient";
import { FaSearch, FaTrash, FaFileExcel, FaExclamationTriangle } from "react-icons/fa";
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
import { Link } from "react-router-dom";

const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">
      {title}
    </p>
    <div className="w-full">{children}</div>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-2 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">
        {title}
      </p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

const ExpiredProductsIndex = () => {
  const [expiredProducts, setExpiredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("week"); // default to week
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [checkAll, setCheckAll] = useState(false);

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Select / Deselect
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

  // Delete selected expired products
  const handleDeleteSelected = async () => {
    if (selectedProducts.length === 0) return;

    try {
      await supabase.from("expired_products").delete().in("id", selectedProducts);
      toast.success(`${selectedProducts.length} expired product(s) deleted successfully`);
      setExpiredProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      setCheckAll(false);
    } catch (err) {
      console.error("❌ Delete error:", err);
      toast.error("Failed to delete: " + err.message);
    }
  };

  // Load user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadingUser(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();

        const { data: mainUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser?.id)
          .maybeSingle();

        if (mainUser) {
          setUser({ ...mainUser, role: "admin" });
          return;
        }

        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser?.id)
          .maybeSingle();

        if (employee) {
          setUser({ ...employee, role: "employee" });
          return;
        }

        throw new Error("User not found in system");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user.");
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch expired products
  useEffect(() => {
    if (!user) return;
    fetchExpiredProducts();
  }, [user, searchTerm, filterType, customFrom, customTo]);

  const fetchExpiredProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Determine date range
      let fromDate, toDate;
      const now = new Date();
      switch (filterType) {
        case "today":
          fromDate = new Date(now.setHours(0, 0, 0, 0));
          toDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case "week":
        default:
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          fromDate = new Date(now.setDate(diff));
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date();
          break;
        case "month":
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
          toDate = new Date();
          break;
        case "year":
          fromDate = new Date(now.getFullYear(), 0, 1);
          toDate = new Date();
          break;
        case "custom":
          if (customFrom && customTo) {
            fromDate = new Date(customFrom);
            toDate = new Date(customTo);
          }
          break;
      }

      // Fetch data in batches of 1000
      let allData = [];
      const limit = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("expired_products")
          .select("*")
          .order("expired_date", { ascending: false })
          .range(from, from + limit - 1);

        if (searchTerm.trim()) {
          query = query.or(`product_id.ilike.%${searchTerm}%,office_name.ilike.%${searchTerm}%,entered_by.ilike.%${searchTerm}%`);
        }
        if (fromDate && toDate) {
          query = query.gte("expired_date", fromDate.toISOString()).lte("expired_date", toDate.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        allData = allData.concat(data || []);
        from += limit;
        hasMore = data && data.length === limit;
      }

      // Map product names
      const productIds = [...new Set(allData.map(p => p.product_id))];
      let productMap = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase.from("products").select("id, name").in("id", productIds);
        productMap = Object.fromEntries(products.map(p => [p.id, p.name]));
      }

      // Map entered_by names
      const userIds = [...new Set(allData.map(p => p.entered_by))];
      let userMap = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase.from("systems_users").select("id, customer_name").in("id", userIds);
        userMap = Object.fromEntries(users.map(u => [u.id, u.customer_name]));
      }

      const finalData = allData.map(p => ({
        ...p,
        product_name: productMap[p.product_id] || p.product_id,
        entered_by_name: userMap[p.entered_by] || p.entered_by,
      }));

      setExpiredProducts(finalData);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch expired products: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return expiredProducts;
    const term = searchTerm.toLowerCase();
    return expiredProducts.filter(p =>
      (p.product_name || "").toLowerCase().includes(term) ||
      (p.office_name || "").toLowerCase().includes(term) ||
      (p.entered_by_name || "").toLowerCase().includes(term)
    );
  }, [expiredProducts, searchTerm]);

  // Totals
  const totals = useMemo(() => {
    const totalQty = filteredProducts.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const totalProducts = filteredProducts.length;
    return { totalQty, totalProducts };
  }, [filteredProducts]);

  // Excel export
  const exportToExcel = () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      toast.error("No expired products to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      filteredProducts.map(p => ({
        Product: p.product_name,
        Quantity: p.quantity,
        "Expired Date": new Date(p.expired_date).toLocaleDateString(),
        "Office Name": p.office_name,
        "Entered By": p.entered_by_name,
        "Created At": new Date(p.created_at).toLocaleString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expired Products");
    XLSX.writeFile(workbook, `expired_products_${new Date().toISOString()}.xlsx`);
  };

  if (loadingUser) return <p className="p-6 text-gray-600">Loading user data...</p>;

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Kichwa + Vidokezo + Vitufe */}
      <CustomCard>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB]">Bidhaa zilizoisha Muda</h1>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            <Link
              to="new"
              className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2 shadow"
            >
              <FaExclamationTriangle className="text-white" /> Weka Bidhaa Zilizopotea Uhai
            </Link>
            <button
              onClick={exportToExcel}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow"
            >
              <FaFileExcel /> Hamisha Excel
            </button>
          </div>
        </div>

        {/* Vidokezo / Maelekezo */}
        <p className="text-gray-600 text-sm">
          Tumia vitufe hapo juu kuongeza au kuhamisha bidhaa zilizopotea uhai.
        </p>
      </CustomCard>

      {/* Filteri */}
      <CustomCard title="Filteri">
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          {["all","today","week","month","year","custom"].map(f => (
            <button
              key={f}
              className={`px-3 py-1 rounded-xl ${filterType===f?"bg-[#2563EB] text-white":"bg-white border border-[#e5e7eb]"}`}
              onClick={()=>setFilterType(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          {filterType==="custom" && (
            <div className="flex gap-2 items-center">
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="border border-[#e5e7eb] px-2 py-1 rounded" />
              <span>hadi</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="border border-[#e5e7eb] px-2 py-1 rounded" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Tafuta bidhaa, ofisi, aliyeingiza..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full sm:w-1/3 border border-[#e5e7eb] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
      </CustomCard>

      {/* Muhtasari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormCard title="Jumla ya Rekodi">
          <p className="text-[#2563EB] font-bold">{totals.totalProducts}</p>
        </FormCard>
        <FormCard title="Jumla ya Kiasi">
          <p className="text-[#2563EB] font-bold">{totals.totalQty}</p>
        </FormCard>
      </div>

      {/* Futa Zilizochaguliwa */}
      {user?.role === "admin" && selectedProducts.length > 0 && (
        <CustomCard>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="px-4 py-2 rounded-xl flex items-center gap-2 bg-[#2563EB] hover:bg-red-600 text-white shadow">
                <FaTrash /> Futa Zilizochaguliwa ({selectedProducts.length})
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#2563EB] flex items-center gap-2">
                  <FaTrash /> Thibitisha Ufutaji
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Una uhakika unataka kufuta <strong>{selectedProducts.length}</strong> bidhaa zilizopotea uhai? Hatua hii haiwezi kubatilishwa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Ghairi</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected} className="bg-[#2563EB] text-white rounded-xl hover:bg-red-600">Ndiyo, Futa</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CustomCard>
      )}

      {/* Jedwali */}
      <CustomCard title="Bidhaa Zilizopotea Uhai">
        {loading ? <p className="text-gray-600">Inapakia bidhaa zilizopotea uhai...</p> :
         error ? <p className="text-red-600 font-semibold">{error}</p> :
         filteredProducts.length === 0 ? <p className="text-gray-600">Hakuna bidhaa zilizopotea uhai zilizopatikana.</p> :
         <div className="overflow-x-auto">
           <table className="min-w-full border-collapse text-sm">
             <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
               <tr>
                 <th className="px-2 text-center">{user.role==="admin" && <input type="checkbox" checked={checkAll} onChange={handleCheckAll} />}</th>
                 <th className="px-2 sm:px-3 py-2 text-left">Bidhaa</th>
                 <th className="px-2 sm:px-3 py-2 text-left">Kiasi</th>
                 <th className="px-2 sm:px-3 py-2 text-left">Tarehe ya Kuisha</th>
                 <th className="px-2 sm:px-3 py-2 text-left">Jina la Ofisi</th>
                 <th className="px-2 sm:px-3 py-2 text-left">Aliyeingiza</th>
                 <th className="px-2 sm:px-3 py-2 text-left">Imeundwa</th>
               </tr>
             </thead>
             <tbody>
               {filteredProducts.map(p => (
                 <tr key={p.id} className="border-b hover:bg-red-50">
                   <td className="px-2 text-center">{user.role==="admin" && <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={()=>handleSelectProduct(p.id)} />}</td>
                   <td className="px-2 sm:px-3 py-2">{p.product_name}</td>
                   <td className="px-2 sm:px-3 py-2">{p.quantity}</td>
                   <td className="px-2 sm:px-3 py-2">{new Date(p.expired_date).toLocaleDateString()}</td>
                   <td className="px-2 sm:px-3 py-2">{p.office_name}</td>
                   <td className="px-2 sm:px-3 py-2">{p.entered_by_name}</td>
                   <td className="px-2 sm:px-3 py-2">{new Date(p.created_at).toLocaleString()}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
        }
      </CustomCard>

    </div>
  </div>
);


};

export default ExpiredProductsIndex;
