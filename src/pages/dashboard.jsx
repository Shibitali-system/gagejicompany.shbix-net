import React, { useEffect, useState } from "react";
import { FaUser } from "react-icons/fa";
import { supabase } from "../../supabaseClient";

const Dashboard = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
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
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

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

        const { data: subs } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("office_id", systemUser.office_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subs) {
          setSubscription(subs);
          if (subs.usagedays <= 0) setShowExpiredModal(true);
        }

        const today = new Date();
        const fromDate = new Date(today); fromDate.setHours(0,0,0,0);
        const toDate = new Date(today); toDate.setHours(23,59,59,999);

        const salesData = await safeFetch("sales", q =>
          q.eq("office_id", systemUser.office_id)
            .gte("created_at", fromDate.toISOString())
            .lte("created_at", toDate.toISOString())
        );
        const totalSales = salesData.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

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

        const expensesData = await safeFetch("systems_expenses", q =>
          q.eq("office_id", systemUser.office_id)
            .gte("created_at", fromDate.toISOString())
            .lte("created_at", toDate.toISOString())
        );
        const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const purchasesAll = await safeFetch("purchases", q => q.eq("office_id", systemUser.office_id));
        const purchasesData = purchasesAll.filter(p => {
          const purchaseDate = new Date(p.date);
          return purchaseDate >= fromDate && purchaseDate <= toDate;
        });
        const totalPurchases = purchasesData.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

        const lowStock = await safeFetch("products", q => q.eq("office_id", systemUser.office_id).lte("stock", 5));

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
    window.location.href = "/subscriptions";
  };

  const SummaryCard = ({ title, value }) => (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 flex flex-col items-center justify-center transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] font-sans w-full">
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
      <p className="text-xl font-semibold mt-1" style={{ color: "#2563EB" }}>{value}</p>
    </div>
  );

  return (
    <div className="min-h-full p-6 space-y-6 relative">

      {showExpiredModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#2563EB" }}>Your subscription has expired!</h2>
            <p className="mb-6 text-gray-700">Please contact the admin or make a payment to continue using the system.</p>
            <div className="flex flex-col gap-4">
              <a href="https://wa.me/255774737736" target="_blank" rel="noopener noreferrer" className="bg-[#2563EB] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#1e40af] transition">
                Contact Admin
              </a>
              <button onClick={handleMakePayment} className="bg-[#2563EB] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#1e40af] transition">
                Make Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative">
        <div>
          <h2 className="text-xl flex items-center gap-2" style={{ color: "#2563EB" }}><FaUser style={{ color: "#2563EB" }} /> Welcome, <span className="font-semibold">{userInfo?.customer_name || "User"}</span></h2>
          <h1 className="text-3xl font-bold relative z-10" style={{ color: "#2563EB" }}>Dashboard Overview - {userInfo?.office_name || "Office"}</h1>
        </div>

        {subscription && (
          <div className="absolute -top-10 right-0 md:right-4 w-full max-w-xs mx-auto md:mx-0 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] rounded-[12px] p-6 flex items-center justify-between bg-gray-100" style={{ color: "#2563EB" }}>
            <div className="flex flex-col">
              <p className="text-sm font-bold">Subscription Days Remaining</p>
              <p className="text-2xl font-bold">{subscription.usagedays}</p>
            </div>
            <FaUser className="text-4xl opacity-80" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 text-sm">
        <SummaryCard title="Total Sales" value={totals.totalSales.toLocaleString()} />
        <SummaryCard title="Purchase Cost (Sold)" value={totals.totalPurchaseForSales.toLocaleString()} />
        <SummaryCard title="Total Expenses" value={totals.totalExpenses.toLocaleString()} />
        <SummaryCard title="Profit" value={totals.profit.toLocaleString()} />
        <SummaryCard title="Total Purchases" value={totals.totalPurchases.toLocaleString()} />
        <SummaryCard title="Low Stock Items" value={totals.lowStockCount} />
        <SummaryCard title="Overdue Billing" value={totals.overdueCount} />
      </div>
    </div>
  );
};

export default Dashboard;
