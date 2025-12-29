import React, { useEffect, useState } from "react";
import { FaFileExcel, FaSearch, FaMoneyBillWave, FaShoppingCart, FaBoxes, FaExclamationTriangle, FaWallet, FaChartLine } from "react-icons/fa";
import { supabase } from "../../supabaseClient";

// Import components
import SalesReport from "./components/SalesReport";
import PurchasesReport from "./components/PurchasesReport";
import ExpensesReport from "./components/ExpensesReport";
import LowStockReport from "./components/LowStockReport";
import BillingReport from "./components/BillingReport";

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


const ReportsPage = () => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [totals, setTotals] = useState({
    totalSales: 0,
    totalPurchaseForSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    profit: 0,
    lowStockCount: 0,
    overdueCount: 0,
  });

  const exportAllExcel = () => {
    console.log("Exporting all reports...");
  };

  // ================= Helper: Safe Fetch =================
  const safeFetch = async (table, queryBuilder) => {
    try {
      let query = supabase.from(table).select("*");
      if (queryBuilder) query = queryBuilder(query);
      const { data, error } = await query;
      if (error) {
        console.warn(`Supabase fetch error on ${table}:`, error.message);
        return [];
      }
      return data ?? [];
    } catch (err) {
      console.error(`Unexpected error on ${table}:`, err);
      return [];
    }
  };

  // ================= Helper: Date Range =================
  const getDateRange = () => {
    const today = new Date();
    let fromDate = new Date(today);
    let toDate = new Date(today);

    switch (filterType) {
      case "today":
        break;
      case "week":
        fromDate.setDate(today.getDate() - 7);
        break;
      case "month":
        fromDate.setMonth(today.getMonth() - 1);
        break;
      case "year":
        fromDate.setFullYear(today.getFullYear() - 1);
        break;
      case "custom":
        if (customFrom) fromDate = new Date(customFrom);
        if (customTo) toDate = new Date(customTo);
        break;
      default:
        break;
    }

    if (!(fromDate instanceof Date) || isNaN(fromDate)) fromDate = new Date(today);
    if (!(toDate instanceof Date) || isNaN(toDate)) toDate = new Date(today);

    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    return { fromDate, toDate }; // always Date objects
  };

  // ================= Fetch Data =================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return setLoading(false);

        // Fetch system user or employee
        let systemUser =
          (await safeFetch("systems_users", (q) => q.eq("auth_user_id", userId)).then((d) => d[0])) || null;

        if (!systemUser) {
          systemUser =
            (await safeFetch("employees", (q) => q.eq("auth_user_id", userId)).then((d) => d[0])) || null;
          if (systemUser) {
            systemUser = {
              id: systemUser.id,
              customer_name: systemUser.name,
              office_id: systemUser.office_id,
              office_name: systemUser.office_name,
            };
          }
        }

        if (!systemUser) return setLoading(false);

        setSellerInfo({
          id: systemUser.id,
          name: systemUser.customer_name,
          office_id: systemUser.office_id,
          office_name: systemUser.office_name,
        });

        const { fromDate, toDate } = getDateRange();

        // ================= Total Sales =================
        const salesData = await safeFetch("sales", (q) =>
          q.eq("office_id", systemUser.office_id)
            .gte("created_at", fromDate.toISOString())
            .lte("created_at", toDate.toISOString())
        );
        const totalSales = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

        // ================= Total Purchase for Sold Products =================
        let totalPurchaseForSales = 0;
        const saleIds = salesData.map((s) => s.id);

        if (saleIds.length > 0) {
          const saleItems = await safeFetch("sale_items", (q) => q.in("sale_id", saleIds));
          if (saleItems.length > 0) {
            const productIds = saleItems.map((item) => item.product_id);
            const productsData = await safeFetch("products", (q) => q.in("id", productIds));

            totalPurchaseForSales = saleItems.reduce((sum, item) => {
              const product = productsData.find((p) => p.id === item.product_id);
              return sum + ((product?.purchase_price || 0) * item.quantity);
            }, 0);
          }
        }

        // ================= Total Expenses =================
        const expensesData = await safeFetch("systems_expenses", (q) =>
          q.eq("office_id", systemUser.office_id)
            .gte("created_at", fromDate.toISOString())
            .lte("created_at", toDate.toISOString())
        );
        const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount || 0), 0);

       // fetch all purchases for the office
const purchasesAll = await safeFetch("purchases", (q) =>
  q.eq("office_id", systemUser.office_id)
);

// filter client-side kulingana na date range
const purchasesData = purchasesAll.filter(p => {
  const purchaseDate = new Date(p.date);
  return purchaseDate >= fromDate && purchaseDate <= toDate;
});

const totalPurchases = purchasesData.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);



        // ================= Low Stock =================
        const lowStock = await safeFetch("products", (q) =>
          q.eq("office_id", systemUser.office_id).lte("stock", 5)
        );

        // ================= Overdue Billing =================
        const now = new Date().toISOString();
        const billingData = await safeFetch("billing", (q) =>
          q.eq("office_id", systemUser.office_id)
            .lt("due_date", now)
            .eq("status", "pending")
        );

        const profit = totalSales - (totalPurchaseForSales + totalExpenses);

        setTotals({
          totalSales,
          totalPurchaseForSales,
          totalPurchases,
          totalExpenses,
          profit,
          lowStockCount: lowStock.length,
          overdueCount: billingData.length,
        });
      } catch (err) {
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filterType, customFrom, customTo]);

  if (loading) return <div className="p-6">Loading reports...</div>;

  // ================= Summary Card Component =================
  const SummaryCard = ({ title, value, icon: Icon, color }) => (
    <div className={`rounded-2xl shadow p-4 text-white ${color} flex items-center gap-4`}>
      <div className="text-3xl"><Icon /></div>
      <div>
        <p className="text-sm opacity-80">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );

  return (
  <div className="min-h-screen bg-gray-100 p-6 space-y-6">
    {/* Kichwa */}
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-[#2563EB]">Ripoti Zinazoendelea</h1>
        <p className="text-sm text-gray-600">
          Ofisi: <span className="font-semibold">{sellerInfo?.office_name || sellerInfo?.office_id}</span>
        </p>
      </div>
      <button
        onClick={exportAllExcel}
        className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl shadow hover:bg-red-600 transition"
      >
        <FaFileExcel /> Hamisha Zote
      </button>
    </header>

    {/* Vichujio */}
    <CustomCard title="Vichujio">
      <div className="flex flex-wrap gap-2 items-center">
        {['today', 'week', 'month', 'year', 'custom'].map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-3 py-1 rounded-xl capitalize font-medium transition ${
              filterType === f
                ? 'bg-[#2563EB] text-white'
                : 'bg-white border border-[#e5e7eb] text-gray-700 hover:bg-[#ffe5e5]'
            }`}
          >
            {f === 'today' ? 'Leo' : f === 'week' ? 'Wiki Hii' : f === 'month' ? 'Mwezi Huu' : f === 'year' ? 'Mwaka Huu' : 'Maalum'}
          </button>
        ))}

        {filterType === 'custom' && (
          <div className="flex items-center gap-2 ml-4">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="border border-[#e5e7eb] px-2 py-1 rounded focus:ring-2 focus:ring-[#2563EB]"
            />
            <span>hadi</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="border border-[#e5e7eb] px-2 py-1 rounded focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center border rounded px-2 bg-gray-50">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tafuta..."
              className="outline-none px-2 py-1 bg-transparent"
            />
          </div>
        </div>
      </div>
    </CustomCard>

    {/* Kadi za Muhtasari */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { title: "Jumla ya Mauzo", value: totals.totalSales.toLocaleString(), icon: FaMoneyBillWave },
        { title: "Gharama za Manunuzi (Yauzwa)", value: totals.totalPurchaseForSales.toLocaleString(), icon: FaShoppingCart },
        { title: "Jumla ya Matumizi", value: totals.totalExpenses.toLocaleString(), icon: FaWallet },
        { title: "Faida", value: totals.profit.toLocaleString(), icon: FaChartLine },
        { title: "Jumla ya Manunuzi", value: totals.totalPurchases.toLocaleString(), icon: FaBoxes },
        { title: "Bidhaa Zenye Stock Chini", value: totals.lowStockCount, icon: FaExclamationTriangle },
        { title: "Malipo Yanayochelewa", value: totals.overdueCount, icon: FaExclamationTriangle },
      ].map((card, idx) => (
        <CustomCard key={idx} title={card.title}>
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-[#2563EB]">{card.value}</div>
            <card.icon className="text-[#2563EB] text-2xl" />
          </div>
        </CustomCard>
      ))}
    </div>

    {/* Vipengele vya Ripoti */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <CustomCard title="Ripoti ya Mauzo">
        <SalesReport
          officeId={sellerInfo.office_id}
          filterType={filterType}
          customFrom={customFrom}
          customTo={customTo}
          searchTerm={searchTerm}
        />
      </CustomCard>
      <CustomCard title="Ripoti ya Manunuzi">
        <PurchasesReport
          officeId={sellerInfo.office_id}
          filterType={filterType}
          customFrom={customFrom}
          customTo={customTo}
          searchTerm={searchTerm}
        />
      </CustomCard>
      <CustomCard title="Ripoti ya Matumizi">
        <ExpensesReport
          officeId={sellerInfo.office_id}
          filterType={filterType}
          customFrom={customFrom}
          customTo={customTo}
          searchTerm={searchTerm}
        />
      </CustomCard>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
      <CustomCard title="Ripoti ya Bidhaa Zenye Stock Chini">
        <LowStockReport officeId={sellerInfo.office_id} />
      </CustomCard>
      <CustomCard title="Ripoti ya Malipo">
        <BillingReport
          officeId={sellerInfo.office_id}
          filterType={filterType}
          customFrom={customFrom}
          customTo={customTo}
        />
      </CustomCard>
    </div>
  </div>
);


};

export default ReportsPage;
