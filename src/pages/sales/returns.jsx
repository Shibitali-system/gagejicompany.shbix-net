import React, { useEffect, useState } from "react"; 
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaArrowLeft, FaSearch, FaList, FaDownload, FaPlus, FaBoxOpen, FaPrint, FaShareAlt } from "react-icons/fa";
import { Toaster, toast } from "react-hot-toast";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

const ReturnsPage = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const saleId = queryParams.get("saleId");

const handlePrint = () => toast("Print not implemented yet");
  const handleDownloadPDF = () => toast("Download PDF not implemented yet");
  const handleShare = () => toast("Share not implemented yet");
  const handleSubmit = () => toast("Submit not implemented yet");
const [selectedSale, setSelectedSale] = useState(null);
const [sales, setSales] = useState([]); // store all sales


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

const filteredSales = sales.filter((s) => 
  String(s.id).includes(searchTerm) || 
  (s.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
);

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
            permissions: ["dashboard", "sales", "view_all_sales"],
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
            permissions: employeeUser.permissions || ["sales"],
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

  // Fetch returns with access control + chunked fetching
  const fetchReturns = async () => {
    if (!sellerInfo) return;
    setLoading(true);
    setError(null);

    const chunkSize = 1000;
    let from = 0;
    let allReturns = [];

    try {
      let baseQuery = supabase.from("sales_returns").select("*").order("created_at", { ascending: false });

      // Access control
      if (sellerInfo.type === "system" || sellerInfo.role === "admin") {
        baseQuery = baseQuery.eq("office_id", sellerInfo.office_id);
      } else if (sellerInfo.role === "employee") {
        if (sellerInfo.permissions.includes("view_all_sales")) {
          baseQuery = baseQuery.eq("office_id", sellerInfo.office_id);
        } else {
          baseQuery = baseQuery.eq("seller_id", sellerInfo.id);
        }
      }

      if (saleId) baseQuery = baseQuery.eq("sale_id", saleId);

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
        case "custom": if (customFrom && customTo) { start = dayjs(customFrom); end = dayjs(customTo).endOf("day"); } break;
        default: break;
      }

      let filtered = allReturns;
      if (start && end) filtered = filtered.filter(r => dayjs(r.created_at).isBetween(start, end, null, "[]"));
      if (statusFilter !== "all") filtered = filtered.filter(r => r.status?.toLowerCase() === statusFilter);
      if (searchTerm.trim()) filtered = filtered.filter(r => r.reason?.toLowerCase().includes(searchTerm.toLowerCase()) || r.comment?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Related sales + customers
      const saleIds = [...new Set(filtered.map(r => r.sale_id))];
      const { data: salesData } = await supabase.from("sales").select("id, customer_id").in("id", saleIds);
      const customerIds = [...new Set(salesData.map(s => s.customer_id))];
      const { data: customers } = await supabase.from("customers").select("id, name").in("id", customerIds);

      const customerMap = {}; customers.forEach(c => (customerMap[c.id] = c.name));
      const saleMap = {}; salesData.forEach(s => (saleMap[s.id] = customerMap[s.customer_id] || "-"));

      const finalData = filtered.map(r => ({
        ...r,
        customer_name: saleMap[r.sale_id] || "-",
        product: productsMap[r.product_id],
        seller_name: r.seller_name || "-"
      }));

      const grouped = Object.values(finalData.reduce((acc, r) => {
        if (!acc[r.sale_id]) acc[r.sale_id] = { sale_id: r.sale_id, customer_name: r.customer_name, date: r.created_at, status: r.status, items: [] };
        acc[r.sale_id].items.push(r);
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
  useEffect(() => { fetchReturns(); }, [sellerInfo, filterType, customFrom, customTo, statusFilter, searchTerm, saleId, productsMap]);

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
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#ef4444]"}`}>{value}</p>
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
  <div className="min-h-screen bg-[#fff5f5] p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-6xl mx-auto">

      {/* HEADER CARD */}
      <CustomCard>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          
          {/* TITLE */}
          <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444] flex items-center gap-2">
            <FaList /> Returned Products
          </h1>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-2">

            {/* BACK BUTTON */}
            <Link
              to="../sales"
              className="px-4 py-2 rounded-xl shadow bg-[#ef4444] text-white hover:bg-[#dc2626] flex items-center gap-2 transition"
            >
              <FaArrowLeft /> Back to Sales
            </Link>

            {/* EXPORT CSV (white button red text) */}
            <button
              onClick={() => {
                if (!returns.length) return toast.error("No data to export");
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
                a.download = `sale_returns_${Date.now()}.csv`;
                a.click();
              }}
              className="px-4 py-2 rounded-xl shadow bg-white border border-[#ef4444] text-[#ef4444] hover:bg-[#fff1f1] flex items-center gap-2 transition"
            >
              <FaDownload /> Export CSV
            </button>

            {/* RECORD RETURN BUTTON */}
            <Link
              to={`../sales/returns/record${saleId ? `?saleId=${saleId}` : ""}`}
              className="px-4 py-2 rounded-xl shadow bg-[#ef4444] text-white hover:bg-[#dc2626] flex items-center gap-2 transition"
            >
              <FaPlus /> Record Return
            </Link>

          </div>
        </div>
      </CustomCard>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <SummaryCard title="Total Returns" value={returns.length} valueColor="text-[#ef4444]" />
        <SummaryCard title="Total Quantity" value={totalQty} valueColor="text-[#ef4444]" />
        <SummaryCard title="Total Amount" value={`TZS ${totalAmt.toLocaleString()}`} valueColor="text-[#ef4444]" />
      </div>

      {/* FILTERS CARD */}
      <CustomCard title="Filters">
        <div className="w-full flex flex-wrap items-center gap-3">

          {/* SEARCH INPUT */}
          <div className="flex items-center gap-2 border border-[#ef4444] rounded-xl px-3 py-2 w-full md:w-auto">
            <FaSearch className="text-[#ef4444]" />
            <input
              type="text"
              placeholder="Search reason or comment..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full outline-none"
            />
          </div>

          {/* FILTER SELECTS */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-[#ef4444] rounded-xl px-3 py-2 text-[#ef4444] focus:ring-2 focus:ring-[#ef4444]"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom</option>
          </select>

          {filterType === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="border border-[#ef4444] px-3 py-2 rounded-xl text-[#ef4444]"
              />
              <span>to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="border border-[#ef4444] px-3 py-2 rounded-xl text-[#ef4444]"
              />
            </>
          )}

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-[#ef4444] rounded-xl px-3 py-2 text-[#ef4444] focus:ring-2 focus:ring-[#ef4444]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>

        </div>
      </CustomCard>

      {/* TABLE AREA */}
      <div className="mt-6">
        {loading ? (
          <p className="text-gray-600">Loading returns...</p>
        ) : error ? (
          <p className="text-[#ef4444]">{error}</p>
        ) : groupedReturns.length === 0 ? (
          <p className="text-gray-600">No returns found.</p>
        ) : (
          <div className="space-y-6">
            {groupedReturns.map(g => (
              <CustomCard key={g.sale_id}>
                <div className="w-full">

                  <div className="p-3 bg-[#ffe1e1] rounded-t-lg flex justify-between">
                    <p className="font-semibold text-[#ef4444]">
                      Sale #{g.sale_id} — {g.supplier_name}
                    </p>
                    <span className="text-gray-600 text-sm">
                      {new Date(g.date).toLocaleDateString()} • {g.status || "Pending"}
                    </span>
                  </div>

                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-[#ef4444] text-white text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">Qty</th>
                        <th className="px-3 py-2 text-left">Price</th>
                        <th className="px-3 py-2 text-left">Amount</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                        <th className="px-3 py-2 text-left">Comment</th>
                        <th className="px-3 py-2 text-left">Seller</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map(r => {
                        const p = productsMap[r.product_id] || {};
                        return (
                          <tr key={r.id} className="border-b hover:bg-[#fff1f1]">
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
              </CustomCard>
            ))}
          </div>
        )}
      </div>

    </div>
  </div>
);






};

export default ReturnsPage;
