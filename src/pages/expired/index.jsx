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
  }, [user, filterType, customFrom, customTo]);

  const fetchExpiredProducts = async () => {
  try {
    setLoading(true);
    setError(null);

    // --- DATE FILTERS ---
    let fromDate = null;
    let toDate = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filterType) {
      case "today":
        fromDate = new Date(today);
        toDate = new Date(today);
        toDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        // Start of week = Monday
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + 1);
        monday.setHours(0, 0, 0, 0);
        fromDate = monday;

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        toDate = sunday;
        break;
      case "month":
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      case "year":
        fromDate = new Date(today.getFullYear(), 0, 1);
        toDate = new Date(today.getFullYear(), 11, 31);
        toDate.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (customFrom && customTo) {
          fromDate = new Date(customFrom);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date(customTo);
          toDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        break;
    }

    // --- FETCH EXPIRED PRODUCTS ---
    let query = supabase
      .from("expired_products")
      .select("*")
      .eq("office_id", user.office_id); // filter by office_id

    if (fromDate && toDate) {
      // ⚡ USE created_at for filters
      query = query.gte("created_at", fromDate.toISOString())
                   .lte("created_at", toDate.toISOString());
    }

    const { data: expiredData, error: expiredError } = await query;
    if (expiredError) throw expiredError;
    if (!expiredData || expiredData.length === 0) {
      setExpiredProducts([]);
      return;
    }

    // --- BUILD ID LISTS ---
    const productIds = [...new Set(expiredData.map(e => e.product_id))];
    const userIds = [...new Set(expiredData.map(e => e.entered_by))];

    // --- FETCH PRODUCTS ---
    const { data: productsData } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);
    const productMap = new Map(productsData.map(p => [p.id, p.name]));

    // --- FETCH USERS ---
    const { data: systemUsers } = await supabase
      .from("systems_users")
      .select("id, customer_name")
      .in("id", userIds);
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name")
      .in("id", userIds);

    const userMap = new Map();
    systemUsers?.forEach(u => userMap.set(u.id, u.customer_name));
    employees?.forEach(e => userMap.set(e.id, e.name));

    // --- FINAL DATA ---
    const finalData = expiredData.map(p => ({
      ...p,
      product_name: productMap.get(p.product_id) || p.product_id,
      entered_by_name: userMap.get(p.entered_by) || p.entered_by,
      office_name: p.office_name
    }));

    setExpiredProducts(finalData);

  } catch (err) {
    console.error(err);
    setError("Failed to load data");
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
