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
import { User, Mail, Phone, Calendar } from "lucide-react";

const CHUNK_SIZE = 500;

const CustomerProfile = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Analytics
  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [weekSales, setWeekSales] = useState(0);
  const [weekOrders, setWeekOrders] = useState(0);
  const [monthSales, setMonthSales] = useState(0);
  const [monthOrders, setMonthOrders] = useState(0);

  // Fetch customer info
  const fetchCustomer = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) throw new Error("Customer not found");
    return data;
  };

  // Fetch sales in chunks and include sale_items with product names
const fetchSalesWithItems = async () => {
  let allSales = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from("sales")
      .select(
        `id, total_amount, discount_value, paid_amount, loan_amount, loan_payment_date, created_at, payment_method, discount_type, payment_status, comment,
         sale_items(id, quantity, price, discount, product_id, products(name))`
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + CHUNK_SIZE - 1);

    if (fromDate) query = query.gte("created_at", fromDate);
    if (toDate) query = query.lte("created_at", toDate);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    allSales = [...allSales, ...data];
    offset += CHUNK_SIZE;
  }

  return allSales;
};


  const fetchCustomerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const cust = await fetchCustomer();
      const custSales = await fetchSalesWithItems();

      // Analytics
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayData = custSales.filter(
        (s) => new Date(s.created_at).toDateString() === now.toDateString()
      );
      const weekData = custSales.filter((s) => new Date(s.created_at) >= startOfWeek);
      const monthData = custSales.filter((s) => new Date(s.created_at) >= startOfMonth);

      setTodaySales(todayData.reduce((a, s) => a + parseFloat(s.total_amount), 0));
      setTodayOrders(todayData.length);

      setWeekSales(weekData.reduce((a, s) => a + parseFloat(s.total_amount), 0));
      setWeekOrders(weekData.length);

      setMonthSales(monthData.reduce((a, s) => a + parseFloat(s.total_amount), 0));
      setMonthOrders(monthData.length);

      setCustomer(cust);
      setSales(custSales);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchCustomerData();
  }, [id, fromDate, toDate]);

  if (loading)
    return (
      <p className="p-6 text-gray-600 animate-pulse text-center text-lg">
        Loading customer data...
      </p>
    );
  if (error)
    return (
      <p className="p-6 text-red-600 font-semibold text-center text-lg">{error}</p>
    );
  if (!customer)
    return (
      <p className="p-6 text-gray-600 text-center text-lg">No customer data found.</p>
    );

  const aggregateMonthly = (records, valueKey, dateKey = "created_at") => {
    return (
      records?.reduce((acc, rec) => {
        const month = new Date(rec[dateKey]).toLocaleString("default", {
          month: "short",
        });
        const found = acc.find((m) => m.month === month);
        if (found) found.total += parseFloat(rec[valueKey]);
        else acc.push({ month, total: parseFloat(rec[valueKey]) });
        return acc;
      }, []) || []
    );
  };

  const monthlySales = aggregateMonthly(sales, "total_amount");

  const CustomCard = ({ title, children }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-start justify-start
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
  >
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);

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

return (
  <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

    {/* Header */}
    <CustomCard>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">{customer.name}</h1>
        <Link to="../customers">
          <button className="bg-gray-100 border border-gray-300 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200 transition-all">
            ← Back
          </button>
        </Link>
      </div>
    </CustomCard>

    {/* Filters */}
    <CustomCard title="Filter Purchases">
      <div className="flex flex-col md:flex-row gap-4 items-center overflow-x-auto">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="text-[#ef4444]" />
          <label>From:</label>
          <input
            type="date"
            className="border border-gray-300 rounded px-2 py-1"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="text-[#ef4444]" />
          <label>To:</label>
          <input
            type="date"
            className="border border-gray-300 rounded px-2 py-1"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          onClick={fetchCustomerData}
          className="bg-[#ef4444] hover:bg-[#d63a3a] text-white px-4 py-1 rounded-xl shadow whitespace-nowrap"
        >
          Apply
        </button>
      </div>
    </CustomCard>

    {/* Analytics Summary */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard title="Today" value={`Sales: ${todaySales.toLocaleString()} TZS | Orders: ${todayOrders}`} />
      <SummaryCard title="This Week" value={`Sales: ${weekSales.toLocaleString()} TZS | Orders: ${weekOrders}`} />
      <SummaryCard title="This Month" value={`Sales: ${monthSales.toLocaleString()} TZS | Orders: ${monthOrders}`} />
    </div>

    {/* Purchase History */}
    <CustomCard title="Purchase History">
      <div className="overflow-x-auto w-full">
        <table className="min-w-full border border-gray-200 text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              {["Date","Total","Paid","Loan","Payment Status","Discount","Payment Method","Comment","Products"].map(th => (
                <th key={th} className="px-3 py-2 border">{th}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center px-3 py-2 text-gray-500">
                  No purchases found.
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">{parseFloat(s.total_amount).toLocaleString()} TZS</td>
                <td className="px-3 py-2">{parseFloat(s.paid_amount || 0).toLocaleString()} TZS</td>
                <td className="px-3 py-2">{parseFloat(s.loan_amount || 0).toLocaleString()} TZS</td>
                <td className="px-3 py-2">{s.payment_status}</td>
                <td className="px-3 py-2">{parseFloat(s.discount_value || 0).toLocaleString()} ({s.discount_type})</td>
                <td className="px-3 py-2">{s.payment_method}</td>
                <td className="px-3 py-2">{s.comment || "-"}</td>
                <td className="px-3 py-2">
                  {s.sale_items?.map((item) => (
                    <div key={item.id} className="mb-1">
                      {item.products?.name || `Product ${item.product_id}`} x {item.quantity} @ {parseFloat(item.price).toLocaleString()} TZS (Disc: {parseFloat(item.discount || 0)})
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CustomCard>

    {/* Monthly Sales Chart */}
    <CustomCard title="Monthly Sales Overview">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={monthlySales}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Bar dataKey="total" fill="#ef4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CustomCard>

  </div>
);

};

export default CustomerProfile;
