import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Calendar, Mail, Phone } from "lucide-react";

const CHUNK_SIZE = 500;
const PAYMENTS_PER_PAGE = 10;

const SupplierDetails = ({ user }) => {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Fetch supplier info
  const fetchSupplier = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setSupplier(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load supplier: " + err.message);
    }
  };

  // Fetch purchases (frontend-only, no join)
  const fetchPurchases = async () => {
    let allPurchases = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("supplier_id", id)
        .order("created_at", { ascending: false })
        .gte("created_at", fromDate || "1970-01-01")
        .lte("created_at", toDate || new Date().toISOString())
        .range(offset, offset + CHUNK_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allPurchases = [...allPurchases, ...data];
      offset += CHUNK_SIZE;
    }
    setPurchases(allPurchases);
  };

  // Fetch payments with pagination
  const fetchPayments = async (page = 1) => {
    try {
      const start = (page - 1) * PAYMENTS_PER_PAGE;
      const end = start + PAYMENTS_PER_PAGE - 1;

      const { data, count, error } = await supabase
        .from("payment")
        .select("*", { count: "exact" })
        .eq("supplier_id", id)
        .order("created_at", { ascending: false })
        .gte("created_at", fromDate || "1970-01-01")
        .lte("created_at", toDate || new Date().toISOString())
        .range(start, end);

      if (error) throw error;

      setPayments(data || []);
      setTotalPayments(count || 0);
    } catch (err) {
      console.error(err);
      setError("Failed to load payments: " + err.message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchSupplier();
      await fetchPurchases();
      await fetchPayments(paymentsPage);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id, fromDate, toDate, paymentsPage]);

  // Analytics
  const totalPurchaseAmount = purchases.reduce(
    (sum, p) => sum + parseFloat(p.total_price || 0),
    0
  );

  const totalPaid = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0
  );

  const balance = totalPurchaseAmount - totalPaid;

  const monthlyPurchases = useMemo(() => {
    const data = [];
    purchases.forEach((p) => {
      const month = new Date(p.created_at).toLocaleString("default", {
        month: "short",
      });
      const found = data.find((m) => m.month === month);
      if (found) found.total += parseFloat(p.total_price || 0);
      else data.push({ month, total: parseFloat(p.total_price || 0) });
    });
    return data;
  }, [purchases]);

  // Conditional rendering
  if (loading)
    return (
      <p className="text-gray-600 p-6 animate-pulse text-center">
        Loading supplier data...
      </p>
    );
  if (error)
    return (
      <p className="text-red-600 p-6 text-center font-semibold">{error}</p>
    );
  if (!supplier)
    return (
      <p className="text-gray-600 p-6 text-center">Supplier not found.</p>
    );

  const totalPaymentsPages = Math.ceil(totalPayments / PAYMENTS_PER_PAGE);

  const InteractiveCard = ({ children }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] p-5
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
    {children}
  </div>
);



return (
  <div className="max-w-6xl mx-auto p-6 space-y-6">

  {/* Card 1: Supplier Title + Tips + Button */}
  <InteractiveCard>
    <h1 className="text-3xl md:text-4xl font-extrabold text-[#2563EB] tracking-tight text-center md:text-left">
      {supplier.name}
    </h1>
    <p className="text-gray-600 text-sm sm:text-base mt-2 text-center md:text-left">
      Simamia muuzaji: angalia maelezo ya mawasiliano, hali, ununuzi, malipo, na uchambuzi wa kila mwezi.
    </p>
    <Link
      to="../suppliers"
      className="mt-3 bg-[#2563EB] hover:bg-[#d63a3a] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow"
    >
      ← Rudi
    </Link>
  </InteractiveCard>

  {/* Card 2: Filters + Apply */}
  <InteractiveCard>
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center w-full justify-center">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Calendar className="text-[#2563EB]" />
        <label>Kutoka:</label>
        <input
          type="date"
          className="border border-gray-300 rounded px-2 py-1"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Calendar className="text-[#2563EB]" />
        <label>Hadi:</label>
        <input
          type="date"
          className="border border-gray-300 rounded px-2 py-1"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>
      <button
        onClick={() => {
          setPaymentsPage(1);
          fetchData();
        }}
        className="bg-[#2563EB] hover:bg-[#d63a3a] text-white px-4 py-1 rounded-xl shadow whitespace-nowrap"
      >
        Tumia
      </button>
    </div>
  </InteractiveCard>

  {/* Analytics Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <InteractiveCard>
      <h3 className="font-semibold text-gray-700">Jumla ya Ununuzi</h3>
      <p className="text-[#2563EB] font-bold">{totalPurchaseAmount.toLocaleString()} TZS</p>
    </InteractiveCard>
    <InteractiveCard>
      <h3 className="font-semibold text-gray-700">Jumla ya Malipo</h3>
      <p className="text-[#2563EB] font-bold">{totalPaid.toLocaleString()} TZS</p>
    </InteractiveCard>
    <InteractiveCard>
      <h3 className="font-semibold text-gray-700">Salio</h3>
      <p className="text-[#2563EB] font-bold">{balance.toLocaleString()} TZS</p>
    </InteractiveCard>
  </div>

  {/* Purchases Table */}
  <InteractiveCard>
    <h2 className="text-xl font-semibold text-gray-700 mb-3">Historia ya Ununuzi</h2>
    <div className="overflow-x-auto w-full">
      <table className="min-w-full border border-gray-200 text-sm text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 border">Tarehe</th>
            <th className="px-3 py-2 border">Ankara</th>
            <th className="px-3 py-2 border">Jumla ya Kiasi</th>
            <th className="px-3 py-2 border">Jumla ya Bei</th>
          </tr>
        </thead>
        <tbody>
          {purchases.length > 0 ? (
            purchases.map((p) => (
              <tr key={p.id} className="border-b hover:bg-[#fef6f6] transition-colors">
                <td className="px-3 py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">{p.invoice_number || "-"}</td>
                <td className="px-3 py-2">{parseFloat(p.total_amount || 0).toLocaleString()} TZS</td>
                <td className="px-3 py-2">{parseFloat(p.total_price || 0).toLocaleString()} TZS</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="text-center px-3 py-2 text-gray-500">Hakuna ununuzi uliopatikana.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </InteractiveCard>

  {/* Payments Table */}
  <InteractiveCard>
    <h2 className="text-xl font-semibold text-gray-700 mb-3">Malipo</h2>
    <div className="overflow-x-auto w-full">
      <table className="min-w-full border border-gray-200 text-sm text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 border">Tarehe</th>
            <th className="px-3 py-2 border">Kiasi</th>
            <th className="px-3 py-2 border">Hali</th>
          </tr>
        </thead>
        <tbody>
          {payments.length > 0 ? (
            payments.map((p) => (
              <tr key={p.id} className="border-b hover:bg-[#fef6f6] transition-colors">
                <td className="px-3 py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">{parseFloat(p.amount || 0).toLocaleString()} TZS</td>
                <td className="px-3 py-2 capitalize">{p.status || "-"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center px-3 py-2 text-gray-500">Hakuna malipo yaliyopatikana.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </InteractiveCard>

  {/* Chart */}
  <InteractiveCard>
    <h2 className="text-xl font-semibold text-gray-700 mb-3">Muhtasari wa Ununuzi wa Kila Mwezi</h2>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={monthlyPurchases}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(v) => v.toLocaleString()} />
        <Bar dataKey="total" fill="#2563EB" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </InteractiveCard>
</div>
);

};

export default SupplierDetails;
