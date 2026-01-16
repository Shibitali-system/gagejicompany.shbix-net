import React, { useEffect, useState } from "react";
import { 
  FaMoneyBillWave, FaWallet, FaChartLine, FaBoxes, FaShoppingCart, 
  FaExclamationTriangle, FaUser 
} from "react-icons/fa";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";


const Dashboard = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const navigate = useNavigate();
  const [totals, setTotals] = useState({
    totalSales: 0,
    totalPurchaseForSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    profit: 0,
    lowStockCount: 0,
    overdueCount: 0,
  });

  const safeFetch = async (table, queryBuilder) => {
    try {
      let query = supabase.from(table).select("*");
      if (queryBuilder) query = queryBuilder(query);
      const { data, error } = await query;
      if (error) return [];
      return data ?? [];
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // ====== Auth ======
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        // ====== Fetch system user or employee ======
        let systemUser =
          (await safeFetch("systems_users", q => q.eq("auth_user_id", userId)).then(d => d[0])) || null;

        if (!systemUser) {
          const emp = await safeFetch("employees", q => q.eq("auth_user_id", userId)).then(d => d[0]) || null;
          if (emp) {
            const officeData = await safeFetch("systems_users", q => q.eq("office_id", emp.office_id)).then(d => d[0]) || {};
            systemUser = {
              id: emp.id,
              customer_name: emp.name,
              office_id: emp.office_id,
              office_name: officeData.office_name || "Unknown Office",
            };
          }
        }

        if (!systemUser) return setLoading(false);

        setUserInfo({
          id: systemUser.id,
          name: systemUser.customer_name,
          office_id: systemUser.office_id,
          office_name: systemUser.office_name,
        });

        // ====== Subscription ======
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("office_id", systemUser.office_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subs) {
          setSubscription(subs);

          // Show modal if expired or payment pending
          const isExpired = subs.usagedays <= 0;
          const isPending = subs.status === "pending";
          if (isExpired || isPending) {
            setShowExpiredModal(true);
          }
        }

        // ====== Date Range ======
        const today = new Date();
        const fromDate = new Date(today);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(today);
        toDate.setHours(23, 59, 59, 999);

        // ====== Total Sales ======
        const salesData = await safeFetch("sales", q =>
          q.eq("office_id", systemUser.office_id)
            .gte("created_at", fromDate.toISOString())
            .lte("created_at", toDate.toISOString())
        );
        const totalSales = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

        // ====== Total Purchase for Sold Products ======
        let totalPurchaseForSales = 0;
        const saleIds = salesData.map(s => s.id);
        if (saleIds.length > 0) {
          const saleItems = await safeFetch("sale_items", q => q.in("sale_id", saleIds));
          if (saleItems.length > 0) {
            const productIds = saleItems.map(i => i.product_id);
            const productsData = await safeFetch("products", q => q.in("id", productIds));
            totalPurchaseForSales = saleItems.reduce((sum, item) => {
              const product = productsData.find(p => p.id === item.product_id);
              return sum + ((product?.purchase_price || 0) * item.quantity);
            }, 0);
          }
        }

        // ====== Total Expenses ======
        const expensesData = await safeFetch("systems_expenses", q =>
          q.eq("office_id", systemUser.office_id)
            .gte("created_at", fromDate.toISOString())
            .lte("created_at", toDate.toISOString())
        );
        const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        // ====== Total Purchases ======
        const purchasesAll = await safeFetch("purchases", q => q.eq("office_id", systemUser.office_id));
        const purchasesData = purchasesAll.filter(p => {
          const purchaseDate = new Date(p.date);
          return purchaseDate >= fromDate && purchaseDate <= toDate;
        });
        const totalPurchases = purchasesData.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

        // ====== Low Stock ======
        const lowStock = await safeFetch("products", q => q.eq("office_id", systemUser.office_id).lte("stock", 5));

        // ====== Overdue Billing ======
        const now = new Date().toISOString();
        const billingData = await safeFetch("billing", q =>
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
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-600">Loading dashboard...</div>;

  const handleMakePayment = () => {
    window.location.href = "/dashboard/subscription";
  };

  // ====== Summary Card ======
  const SummaryCard = ({ title, value, valueColor, icon: Icon }) => (
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
      style={{ willChange: "transform" }}
    >
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
      <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
    </div>
  );

  
return (
  <div className="min-h-full p-4 sm:p-6 space-y-6 relative">

    {/* Inline animation style (ukurasa huu tu) */}
    <style>{`
      @keyframes gradient-x {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .animate-gradient-x {
        background-size: 300% 300%;
        animation: gradient-x 3s ease infinite;
      }
    `}</style>

    {/* Modal: Muda wa Usajili Umekwisha / Malipo Bado */}
    {showExpiredModal && subscription && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-[#2563EB]">
            {subscription.usagedays <= 0
              ? "Usajili wako umeisha!"
              : "Malipo Bado!"}
          </h2>
          <p className="mb-6 text-gray-700 text-sm sm:text-base">
            {subscription.usagedays <= 0
              ? "Tafadhali fanya upya usajili wako ili uendelee kutumia mfumo."
              : "Tafadhali kamilisha malipo ili kuhuisha usajili wako."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/255774737736"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#2563EB] text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Wasiliana na Msimamizi
            </a>
            <button
              onClick={handleMakePayment}
              className="bg-[#2563EB] text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Fanya Malipo
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Kichwa cha Dashibodi */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative">

      <div className="flex-1">
        <h2 className="text-xl sm:text-2xl text-[#2563EB] flex items-center gap-2 flex-wrap">
          <FaUser className="text-[#2563EB]" />
          Karibu, <span className="font-semibold">{userInfo?.customer_name || "Mtumiaji"}</span>
        </h2>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] mt-1">
          Muhtasari wa Dashibodi – {userInfo?.office_name || "Ofisi"}
        </h1>
      </div>

      {/* Kadi ya Usajili */}
      {subscription && (
        <div className="relative w-full sm:w-auto max-w-xs rounded-xl p-4 sm:p-6 flex flex-col items-center bg-gray-100 text-[#2563EB] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]">

          {/* Kitufe cha Kuweka App */}
          <button
            onClick={() => navigate("/dashboard/install/installinstructions")}
            className="
              fixed bottom-6 right-6 z-50
              px-6 py-4
              text-sm sm:text-base font-extrabold
              rounded-full
              text-black
              bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500
              shadow-[0_0_25px_rgba(250,204,21,0.9)]
              animate-pulse
              hover:scale-110
              transition-all duration-300
              focus:outline-none
            "
          >
            ✨ Install App
          </button>

          <p className="text-sm font-bold">Siku Zilizobaki za Matumizi</p>
          <p className="text-2xl sm:text-3xl font-bold">
            {subscription.usagedays}
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              subscription.status === "completed"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            Hali: {subscription.status === "completed" ? "Imekamilika" : "Haijakamilika"}
          </p>
        </div>
      )}
    </div>

    {/* Kadi za Muhtasari */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 text-sm">
      <SummaryCard title="Jumla ya Mauzo" value={totals.totalSales.toLocaleString()} />
      <SummaryCard title="Gharama ya Manunuzi (Yaliyouzwa)" value={totals.totalPurchaseForSales.toLocaleString()} />
      <SummaryCard title="Jumla ya Matumizi" value={totals.totalExpenses.toLocaleString()} />
      <SummaryCard title="Faida" value={totals.profit.toLocaleString()} />
      <SummaryCard title="Jumla ya Manunuzi" value={totals.totalPurchases.toLocaleString()} />
      <SummaryCard title="Bidhaa Zenye Stoo Ndogo" value={totals.lowStockCount} />
      <SummaryCard title="Madai Yaliyochelewa" value={totals.overdueCount} />
    </div>

  </div>
);



};

export default Dashboard;
