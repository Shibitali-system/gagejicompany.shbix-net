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
import { Mail, Phone, User, Lock, Briefcase, Calendar } from "lucide-react";

const CHUNK_SIZE = 500;

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


const EmployeeProfile = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [todaySales, setTodaySales] = useState(0);
  const [todayCustomers, setTodayCustomers] = useState(0);
  const [weekSales, setWeekSales] = useState(0);
  const [weekCustomers, setWeekCustomers] = useState(0);
  const [monthSales, setMonthSales] = useState(0);
  const [monthCustomers, setMonthCustomers] = useState(0);

  // Fetch employee
  const fetchEmployee = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  };

  // Fetch sales with customer & product names
  const fetchSalesInChunks = async (empId) => {
    let allSales = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("sales")
        .select(
          `id, total_amount, discount_value, paid_amount, loan_amount, loan_payment_date, created_at, payment_method, discount_type, payment_status, comment,
           customer_id, customers(name),
           sale_items(id, quantity, price, discount, product_id, products(name))`
        )
        .eq("seller_id", empId)
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1)
        .gte(fromDate ? "created_at" : "created_at", fromDate || "1970-01-01")
        .lte(toDate ? "created_at" : "created_at", toDate || new Date().toISOString());

      if (error) throw error;
      if (!data || data.length === 0) break;

      allSales = [...allSales, ...data];
      offset += CHUNK_SIZE;
    }
    return allSales;
  };

  const fetchEmployeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const emp = await fetchEmployee();
      const empSales = await fetchSalesInChunks(emp.id);

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayData = empSales.filter(
        (s) => new Date(s.created_at).toDateString() === now.toDateString()
      );
      const weekData = empSales.filter((s) => new Date(s.created_at) >= startOfWeek);
      const monthData = empSales.filter((s) => new Date(s.created_at) >= startOfMonth);

      setTodaySales(todayData.reduce((a, s) => a + parseFloat(s.total_amount), 0));
      setTodayCustomers(new Set(todayData.map((s) => s.customer_id)).size);

      setWeekSales(weekData.reduce((a, s) => a + parseFloat(s.total_amount), 0));
      setWeekCustomers(new Set(weekData.map((s) => s.customer_id)).size);

      setMonthSales(monthData.reduce((a, s) => a + parseFloat(s.total_amount), 0));
      setMonthCustomers(new Set(monthData.map((s) => s.customer_id)).size);

      setEmployee(emp);
      setSales(empSales);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchEmployeeData();
  }, [id, fromDate, toDate]);

  if (loading)
    return <p className="p-6 text-gray-600 animate-pulse text-center text-lg">Loading employee data...</p>;
  if (error)
    return <p className="p-6 text-red-600 font-semibold text-center text-lg">{error}</p>;
  if (!employee)
    return <p className="p-6 text-gray-600 text-center text-lg">No employee data found.</p>;

  const aggregateMonthly = (records, valueKey, dateKey = "created_at") => {
    return records?.reduce((acc, rec) => {
      const month = new Date(rec[dateKey]).toLocaleString("default", { month: "short" });
      const found = acc.find((m) => m.month === month);
      if (found) found.total += parseFloat(rec[valueKey]);
      else acc.push({ month, total: parseFloat(rec[valueKey]) });
      return acc;
    }, []) || [];
  };

  const monthlySales = aggregateMonthly(sales, "total_amount");

  return (
  <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
    {/* Kichwa */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">{employee.name}</h1>
      <Link to="../employees">
        <button className="bg-white border border-[#e5e7eb] text-[#2563EB] px-5 py-2 rounded-xl hover:bg-[#fdfdfd] transition-all shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]">← Rudi</button>
      </Link>
    </div>

    {/* Vichujio */}
    <CustomCard>
      <div className="flex flex-col md:flex-row gap-4 items-center overflow-x-auto">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="text-[#2563EB]" />
          <label>Kuanzia:</label>
          <input type="date" className="border border-[#e5e7eb] rounded px-2 py-1" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="text-[#2563EB]" />
          <label>Hadi:</label>
          <input type="date" className="border border-[#e5e7eb] rounded px-2 py-1" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button onClick={fetchEmployeeData} className="bg-[#2563EB] hover:bg-red-600 text-white px-4 py-1 rounded-xl shadow whitespace-nowrap">Tumia</button>
      </div>
    </CustomCard>

    {/* Muhtasari wa Uchanganuzi */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FormCard title="Leo">
        <p className="text-[#2563EB] font-bold">Uuzaji: {todaySales.toLocaleString()} TZS</p>
        <p className="text-[#2563EB] font-bold">Wateja: {todayCustomers}</p>
      </FormCard>
      <FormCard title="Wiki Hii">
        <p className="text-[#2563EB] font-bold">Uuzaji: {weekSales.toLocaleString()} TZS</p>
        <p className="text-[#2563EB] font-bold">Wateja: {weekCustomers}</p>
      </FormCard>
      <FormCard title="Mwezi Huu">
        <p className="text-[#2563EB] font-bold">Uuzaji: {monthSales.toLocaleString()} TZS</p>
        <p className="text-[#2563EB] font-bold">Wateja: {monthCustomers}</p>
      </FormCard>
    </div>

    {/* Muhtasari wa Profaili */}
    <CustomCard>
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
        <div className="flex-shrink-0 bg-[#2563EB]/20 rounded-full p-4 w-20 h-20 md:w-28 md:h-28 flex items-center justify-center text-[#2563EB] text-3xl font-bold uppercase shadow-inner">
          {employee.name?.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800">{employee.name}</h2>
          <p className="text-gray-500">{employee.email}</p>
          <p className="text-sm text-[#2563EB] font-medium mt-1">{employee.active ? "🟢 Hai" : "🔴 Haitaendi"} </p>
        </div>
      </div>
    </CustomCard>

    {/* Taarifa za Msingi */}
    <FormCard title="Taarifa za Msingi">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3"><Mail className="text-[#2563EB]" /> <span>{employee.email}</span></div>
        <div className="flex items-center gap-3"><Phone className="text-[#2563EB]" /> <span>{employee.phone || "-"}</span></div>
        <div className="flex items-center gap-3"><User className="text-[#2563EB]" /> <span>{employee.role === "admin" ? "Msimamizi" : "Mfanyakazi"}</span></div>
        <div className="flex items-center gap-3"><Briefcase className="text-[#2563EB]" /> <span>{employee.position || "Haijawekwa"}</span></div>
        <div className="flex items-center gap-3"><Lock className="text-[#2563EB]" /> <span>{employee.active ? "Hai" : "Haitaendi"}</span></div>
      </div>
    </FormCard>

    {/* Jedwali la Historia ya Mauzo */}
    <FormCard title="Historia ya Mauzo">
      <div className="overflow-x-auto">
        <table className="min-w-full border border-[#e5e7eb] text-sm text-left">
          <thead className="bg-[#f9f9f9]">
            <tr>
              {["Tarehe","Mteja","Jumla","Imepagwa","Deni","Hali ya Malipo","Punguzo","Mbinu ya Malipo","Bidhaa"].map((th, idx) => (
                <th key={idx} className="px-3 py-2 border">{th}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.length ? sales.map(s => (
              <tr key={s.id} className="border-b align-top">
                <td className="px-3 py-2">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">{s.customers?.name || s.customer_id}</td>
                <td className="px-3 py-2">{parseFloat(s.total_amount).toLocaleString()} TZS</td>
                <td className="px-3 py-2">{parseFloat(s.paid_amount || 0).toLocaleString()} TZS</td>
                <td className="px-3 py-2">{parseFloat(s.loan_amount || 0).toLocaleString()} TZS</td>
                <td className="px-3 py-2">{s.payment_status}</td>
                <td className="px-3 py-2">{parseFloat(s.discount_value || 0).toLocaleString()} ({s.discount_type})</td>
                <td className="px-3 py-2">{s.payment_method}</td>
                <td className="px-3 py-2">
                  {s.sale_items?.map(item => (
                    <div key={item.id}>{item.products?.name || `Bidhaa ${item.product_id}`} x {item.quantity} @ {parseFloat(item.price).toLocaleString()} TZS (Punguzo: {parseFloat(item.discount || 0)})</div>
                  ))}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="text-center px-3 py-2 text-gray-500">Hakuna mauzo yaliyopatikana.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </FormCard>

    {/* Chati ya Mauzo ya Kila Mwezi */}
    <FormCard title="Muhtasari wa Mauzo Kila Mwezi">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={monthlySales}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Bar dataKey="total" fill="#2563EB" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </FormCard>
  </div>
);


};

export default EmployeeProfile;
