import React, { useEffect, useState } from "react"; 
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaArrowLeft, FaSearch, FaList, FaDownload, FaPlus } from "react-icons/fa";
import { Toaster, toast } from "react-hot-toast";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

const PurchaseReturnsPage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const purchaseId = queryParams.get("purchaseId");

  const [returns, setReturns] = useState([]);
  const [groupedReturns, setGroupedReturns] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("this_week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load seller info
  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser) {
          setSellerInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            office_id: systemUser.customer_registration_no,
            role: "admin",
            type: "system",
            permissions: ["dashboard", "purchases", "view_all_purchases"],
          });
          return;
        }

        const { data: employeeUser } = await supabase
          .from("employees")
          .select("*, systems_users(customer_registration_no, customer_name)")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (employeeUser) {
          setSellerInfo({
            id: employeeUser.id,
            name: employeeUser.name,
            office_id: employeeUser.systems_users?.customer_registration_no,
            role: employeeUser.role || "employee",
            type: "employee",
            permissions: employeeUser.permissions || ["purchases"],
          });
          return;
        }

        toast.error("Seller info not found.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load seller info.");
      }
    };
    fetchSellerInfo();
  }, []);

  // Fetch products map
  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, price");
    if (data) {
      const map = {};
      data.forEach((p) => (map[p.id] = p));
      setProductsMap(map);
    }
  };

  // Fetch returns
  const fetchReturns = async () => {
    if (!sellerInfo) return;
    setLoading(true);
    setError(null);

    const chunkSize = 1000;
    let from = 0;
    let allReturns = [];

    try {
      let baseQuery = supabase
        .from("purchases_returns")
        .select("*")
        .order("created_at", { ascending: false });

      // Access control
      if (sellerInfo.type === "system" || sellerInfo.role === "admin") {
        baseQuery = baseQuery.eq("office_id", sellerInfo.office_id);
      } else if (sellerInfo.role === "employee") {
        if (sellerInfo.permissions.includes("view_all_purchases")) {
          baseQuery = baseQuery.eq("office_id", sellerInfo.office_id);
        } else {
          baseQuery = baseQuery.eq("seller_id", sellerInfo.id);
        }
      }

      if (purchaseId) baseQuery = baseQuery.eq("purchase_id", purchaseId);

      while (true) {
        const { data, error } = await baseQuery.range(from, from + chunkSize - 1);
        if (error) throw error;
        if (!data?.length) break;
        allReturns.push(...data);
        if (data.length < chunkSize) break;
        from += chunkSize;
      }

      // Time filter
      const now = dayjs();
      let start, end;
      switch (filterType) {
        case "today": start = now.startOf("day"); end = now.endOf("day"); break;
        case "this_week": start = now.startOf("week"); end = now.endOf("week"); break;
        case "month": start = now.startOf("month"); end = now.endOf("month"); break;
        case "year": start = now.startOf("year"); end = now.endOf("year"); break;
        case "custom": 
          if (customFrom && customTo) { 
            start = dayjs(customFrom); 
            end = dayjs(customTo).endOf("day"); 
          } 
          break;
        default: break;
      }

      let filtered = allReturns;
      if (start && end) filtered = filtered.filter(r => dayjs(r.created_at).isBetween(start, end, null, "[]"));
      if (statusFilter !== "all") filtered = filtered.filter(r => r.status?.toLowerCase() === statusFilter);
      if (searchTerm.trim()) filtered = filtered.filter(r => r.reason?.toLowerCase().includes(searchTerm.toLowerCase()) || r.comment?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Related purchases + suppliers
      const purchaseIds = [...new Set(filtered.map(r => r.purchase_id))];
      const { data: purchasesData } = await supabase.from("purchases").select("id, supplier_id").in("id", purchaseIds);
      const supplierIds = [...new Set(purchasesData.map(p => p.supplier_id))];
      const { data: suppliers } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);

      const supplierMap = {}; suppliers.forEach(s => (supplierMap[s.id] = s.name));
      const purchaseMap = {}; purchasesData.forEach(p => (purchaseMap[p.id] = supplierMap[p.supplier_id] || "-"));

      const finalData = filtered.map(r => ({
        ...r,
        supplier_name: purchaseMap[r.purchase_id] || "-",
        product: productsMap[r.product_id],
        seller_name: r.seller_name || "-"
      }));

      const grouped = Object.values(finalData.reduce((acc, r) => {
        if (!acc[r.purchase_id]) acc[r.purchase_id] = { purchase_id: r.purchase_id, supplier_name: r.supplier_name, date: r.created_at, status: r.status, items: [] };
        acc[r.purchase_id].items.push(r);
        return acc;
      }, {}));

      setReturns(finalData);
      setGroupedReturns(grouped);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch returns: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { fetchReturns(); }, [sellerInfo, filterType, customFrom, customTo, statusFilter, searchTerm, purchaseId, productsMap]);

  const totalQty = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const totalAmt = returns.reduce((sum, r) => sum + (r.quantity || 0) * (productsMap[r.product_id]?.price || 0), 0);

const SummaryCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
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

const CustomCard = ({ title, children }) => (
  <div className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-start justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
  `}>
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);

  return (
  <div className="min-h-screen p-4 sm:p-6 font-sans">
    <Toaster position="top-right" />
    <div className="max-w-6xl mx-auto">

      {/* KICHWA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] flex items-center gap-2">
          <FaList /> Bidhaa Zilirudishwa
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link to="../purchases" className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-red-600 shadow flex items-center gap-2">
            <FaArrowLeft /> Rudi kwenye Manunuzi
          </Link>

          <button
            onClick={() => {
              if (!returns.length) return toast.error("Hakuna data ya kuhamisha");
              const header = ["Supplier", "Product", "Quantity", "Price", "Amount", "Reason", "Comment", "Status", "Seller", "Date"];
              const rows = returns.map(r => {
                const p = productsMap[r.product_id] || {};
                return [
                  r.supplier_name,
                  p.name,
                  r.quantity,
                  p.price || 0,
                  (p.price || 0) * r.quantity,
                  r.reason,
                  r.comment,
                  r.status,
                  r.seller_name || "-",
                  new Date(r.created_at).toLocaleDateString(),
                ];
              });
              const csv = [header, ...rows].map(r => r.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `purchase_returns_${Date.now()}.csv`;
              a.click();
            }}
            className="bg-white text-[#2563EB] border border-[#2563EB] px-4 py-2 rounded-xl hover:bg-[#2563EB] hover:text-white shadow flex items-center gap-2"
          >
            <FaDownload /> Hamisha CSV
          </button>

          <Link
            to={`../purchases/returns/record${purchaseId ? `?purchaseId=${purchaseId}` : ""}`}
            className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-red-600 shadow flex items-center gap-2"
          >
            <FaPlus /> Rekodi Kurudisha
          </Link>
        </div>
      </div>

      {/* KADI ZA MUHTASARI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
        <SummaryCard title="Jumla ya Kurudishwa" value={returns.length} />
        <SummaryCard title="Jumla ya Idadi" value={totalQty} />
        <SummaryCard title="Jumla ya Kiasi" value={`TZS ${totalAmt.toLocaleString()}`} />
      </div>

      {/* FILTERS */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FaSearch className="text-gray-400" />
        <input
          type="text"
          placeholder="Tafuta sababu/maoni..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 md:w-1/3 border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="today">Leo</option>
          <option value="this_week">Wiki Hii</option>
          <option value="month">Mwezi Huu</option>
          <option value="year">Mwaka Huu</option>
          <option value="custom">Binafsi</option>
        </select>

        {filterType === "custom" && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="border px-2 py-1 rounded" />
            <span>hadi</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="border px-2 py-1 rounded" />
          </>
        )}

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="all">Hali Zote</option>
          <option value="pending">Inasubiri</option>
          <option value="approved">Imeidhinishwa</option>
        </select>
      </div>

      {/* JEDWALI LA KURUDISHA BIDHAA */}
      {loading ? (
        <p className="text-gray-600">Inapakia kurudisha...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : groupedReturns.length === 0 ? (
        <p className="text-gray-600">Hakuna bidhaa zilizorudishwa.</p>
      ) : (
        <div className="space-y-6">
          {groupedReturns.map(g => (
            <div key={g.purchase_id} className="bg-white rounded-2xl shadow">
              <div className="p-4 bg-[#ffe5e5] rounded-t-2xl flex justify-between">
                <p className="font-semibold text-[#2563EB]">
                  Manunuzi #{g.purchase_id} — {g.supplier_name}
                </p>
                <span className="text-gray-600 text-sm">
                  {new Date(g.date).toLocaleDateString()} | {g.status || "Inasubiri"}
                </span>
              </div>
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#2563EB] text-white text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Bidhaa</th>
                    <th className="px-3 py-2 text-left">Idadi</th>
                    <th className="px-3 py-2 text-left">Bei</th>
                    <th className="px-3 py-2 text-left">Kiasi</th>
                    <th className="px-3 py-2 text-left">Sababu</th>
                    <th className="px-3 py-2 text-left">Maoni</th>
                    <th className="px-3 py-2 text-left">Muuzaji</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map(r => {
                    const p = productsMap[r.product_id] || {};
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2">{p.name || "-"}</td>
                        <td className="px-3 py-2">{r.quantity}</td>
                        <td className="px-3 py-2">{p.price || 0}</td>
                        <td className="px-3 py-2">{(p.price || 0) * r.quantity}</td>
                        <td className="px-3 py-2">{r.reason || "-"}</td>
                        <td className="px-3 py-2">{r.comment || "-"}</td>
                        <td className="px-3 py-2">{r.seller_name || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);


};

export default PurchaseReturnsPage;
