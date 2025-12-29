import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Calendar } from "lucide-react";

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

const CHUNK_SIZE = 500;

const ExpenseProfile = () => {
  const { id } = useParams();
  const [expense, setExpense] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Analytics
  const [todayAmount, setTodayAmount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [weekAmount, setWeekAmount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [monthAmount, setMonthAmount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);

  // Fetch single expense info
  const fetchExpense = async () => {
    const { data, error } = await supabase
      .from("systems_expenses")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) throw new Error("Expense not found");
    return data;
  };

  // Fetch all expenses for analytics (filtered by date)
  const fetchExpenses = async () => {
    let allExpenses = [];
    let offset = 0;

    while (true) {
      let query = supabase
        .from("systems_expenses")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (fromDate) query = query.gte("created_at", fromDate);
      if (toDate) query = query.lte("created_at", toDate);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;

      allExpenses = [...allExpenses, ...data];
      offset += CHUNK_SIZE;
    }

    return allExpenses;
  };

  const fetchExpenseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const exp = await fetchExpense();
      const allExp = await fetchExpenses();

      // Fetch users for mapping
      const { data: systemUsers } = await supabase
        .from("systems_users")
        .select("id, customer_name");

      const { data: employees } = await supabase
        .from("employees")
        .select("id, name");

      const systemUsersMap = new Map(systemUsers.map(u => [u.id, u.customer_name]));
      const employeesMap = new Map(employees.map(e => [e.id, e.name]));

      // 🔹 Filter expenses by office_id and map created_by
      const expensesWithNames = allExp
        .filter(e => e.office_id === exp.office_id)
        .map(e => ({
          ...e,
          created_by_name: systemUsersMap.get(e.created_by) || employeesMap.get(e.created_by) || "-"
        }));

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayData = expensesWithNames.filter(
        (e) => new Date(e.created_at).toDateString() === now.toDateString()
      );
      const weekData = expensesWithNames.filter((e) => new Date(e.created_at) >= startOfWeek);
      const monthData = expensesWithNames.filter((e) => new Date(e.created_at) >= startOfMonth);

      setTodayAmount(todayData.reduce((a, e) => a + parseFloat(e.amount), 0));
      setTodayCount(todayData.length);

      setWeekAmount(weekData.reduce((a, e) => a + parseFloat(e.amount), 0));
      setWeekCount(weekData.length);

      setMonthAmount(monthData.reduce((a, e) => a + parseFloat(e.amount), 0));
      setMonthCount(monthData.length);

      setExpense(exp);
      setExpenses(expensesWithNames);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchExpenseData();
  }, [id, fromDate, toDate]);

  if (loading)
    return (
      <p className="p-6 text-gray-600 animate-pulse text-center text-lg">
        Loading expense data...
      </p>
    );
  if (error)
    return (
      <p className="p-6 text-red-600 font-semibold text-center text-lg">{error}</p>
    );
  if (!expense)
    return (
      <p className="p-6 text-gray-600 text-center text-lg">No expense data found.</p>
    );

  const aggregateMonthly = (records, valueKey, dateKey = "created_at") => {
    return (
      records?.reduce((acc, rec) => {
        const month = new Date(rec[dateKey]).toLocaleString("default", { month: "short" });
        const found = acc.find((m) => m.month === month);
        if (found) found.total += parseFloat(rec[valueKey]);
        else acc.push({ month, total: parseFloat(rec[valueKey]) });
        return acc;
      }, []) || []
    );
  };

  const monthlyExpenses = aggregateMonthly(expenses, "amount");

 return (
  <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
    {/* Kichwa */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <h1 className="text-3xl md:text-4xl font-extrabold text-[#2563EB] tracking-tight">{expense.name}</h1>
      <Link to="../expenses">
        <button className="bg-white border border-[#e5e7eb] text-[#2563EB] px-5 py-2 rounded-xl hover:bg-[#ffe5e5] transition-all">
          ← Rudi
        </button>
      </Link>
    </div>

    {/* Vichujio */}
    <CustomCard>
      <div className="flex flex-col md:flex-row gap-4 items-center overflow-x-auto">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="text-[#2563EB]" />
          <label>Tangu:</label>
          <input
            type="date"
            className="border border-[#e5e7eb] rounded px-2 py-1 focus:ring-2 focus:ring-[#2563EB]"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="text-[#2563EB]" />
          <label>Hadi:</label>
          <input
            type="date"
            className="border border-[#e5e7eb] rounded px-2 py-1 focus:ring-2 focus:ring-[#2563EB]"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          onClick={fetchExpenseData}
          className="bg-[#2563EB] hover:bg-red-600 text-white px-4 py-1 rounded-xl shadow whitespace-nowrap transition"
        >
          Weka
        </button>
      </div>
    </CustomCard>

    {/* Muhtasari wa Uchambuzi */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CustomCard title="Leo">
        <p className="text-[#2563EB] font-bold">Kiasi: {todayAmount.toLocaleString()} TZS</p>
        <p className="text-[#2563EB] font-bold">Matumizi: {todayCount}</p>
      </CustomCard>

      <CustomCard title="Wiki Hii">
        <p className="text-[#2563EB]/80 font-bold">Kiasi: {weekAmount.toLocaleString()} TZS</p>
        <p className="text-[#2563EB]/80 font-bold">Matumizi: {weekCount}</p>
      </CustomCard>

      <CustomCard title="Mwezi Huu">
        <p className="text-[#2563EB]/70 font-bold">Kiasi: {monthAmount.toLocaleString()} TZS</p>
        <p className="text-[#2563EB]/70 font-bold">Matumizi: {monthCount}</p>
      </CustomCard>
    </div>

    {/* Historia ya Matumizi */}
    <CustomCard title="Historia ya Matumizi">
      <div className="overflow-x-auto">
        <table className="min-w-full border border-[#e5e7eb] text-sm text-left">
          <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 border">Tarehe</th>
              <th className="px-3 py-2 border">Kiasi</th>
              <th className="px-3 py-2 border">Kategoria</th>
              <th className="px-3 py-2 border">Maelezo</th>
              <th className="px-3 py-2 border">Ofisi</th>
              <th className="px-3 py-2 border">Imeingizwa Na</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b hover:bg-[#ffe5e5]">
                <td className="px-3 py-2">{new Date(e.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">{parseFloat(e.amount).toLocaleString()} TZS</td>
                <td className="px-3 py-2">{e.category || "-"}</td>
                <td className="px-3 py-2">{e.description || "-"}</td>
                <td className="px-3 py-2">{e.office_name || "-"}</td>
                <td className="px-3 py-2">{e.created_by_name || "-"}</td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center px-3 py-2 text-gray-500">
                  Hakuna matumizi yaliyopatikana.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </CustomCard>

    {/* Chati ya Matumizi ya Kila Mwezi */}
    <CustomCard title="Muhtasari wa Matumizi ya Kila Mwezi">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={monthlyExpenses}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Bar dataKey="total" fill="#2563EB" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CustomCard>
  </div>
);

};

export default ExpenseProfile;
