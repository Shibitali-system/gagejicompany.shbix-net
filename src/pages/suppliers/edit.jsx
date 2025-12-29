import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { Calendar, ArrowLeft } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const CHUNK_SIZE = 500;

const SupplierEdit = ({ user }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  // ----------------- STATES -----------------
  const [supplier, setSupplier] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ----------------- FETCH SUPPLIER -----------------
  const fetchSupplier = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      setSupplier({
        name: data.name || "",
        contact_person: data.contact_person || "",
        phone: data.phone || "",
        email: data.email || "",
        notes: data.notes || "",
      });
    } catch (err) {
      setError("Failed to load supplier: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------- FETCH PURCHASES & PAYMENTS -----------------
  const fetchPurchasesPayments = async () => {
    try {
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

      const { data: payData, error: payError } = await supabase
        .from("payment")
        .select("*")
        .eq("supplier_id", id)
        .order("created_at", { ascending: false });

      if (payError) throw payError;

      setPayments(payData || []);
    } catch (err) {
      toast.error("Failed to fetch purchase/payment data: " + err.message);
    }
  };

  // ----------------- EFFECTS -----------------
  useEffect(() => {
    if (!id) return;
    fetchSupplier();
    fetchPurchasesPayments();
  }, [id, fromDate, toDate]);

  // ----------------- HANDLERS -----------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSupplier((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({ ...supplier })
        .eq("id", id);
      if (error) throw error;

      toast.success("Supplier updated successfully!");
    } catch (err) {
      toast.error("Failed to save supplier: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ----------------- ANALYTICS -----------------
  const totalPurchases = useMemo(
    () =>
      purchases.reduce((a, p) => a + parseFloat(p.total_price || 0), 0),
    [purchases]
  );

  const totalPayments = useMemo(
    () => payments.reduce((a, p) => a + parseFloat(p.amount || 0), 0),
    [payments]
  );

  const balance = useMemo(() => totalPurchases - totalPayments, [
    totalPurchases,
    totalPayments,
  ]);

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

  // ----------------- CONDITIONAL RENDER -----------------
  if (loading)
    return (
      <p className="p-6 text-gray-600 animate-pulse text-center">
        Loading supplier data...
      </p>
    );
  if (error) return <p className="p-6 text-red-600 text-center">{error}</p>;

  const SummaryCard = ({ title, value, valueColor, children }) => (
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
      style={{ willChange: "transform" }}
    >
      {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>}
      {value && <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>}
      {children}
    </div>
  );

  return (
  <div className="max-w-5xl mx-auto p-6 space-y-6 font-sans">
    <Toaster position="top-right" />

    {/* Header */}
    <div className="flex justify-between items-center mb-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#2563EB] hover:underline"
      >
        <ArrowLeft /> Rudi
      </button>
      <h1 className="text-3xl font-bold text-[#2563EB]">Hariri Muuzaji</h1>
    </div>

    {/* Analytics Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SummaryCard
        title="Jumla ya Ununuzi"
        value={`${totalPurchases.toLocaleString()} TZS`}
        valueColor="#10B981"
      />
      <SummaryCard
        title="Jumla ya Malipo"
        value={`${totalPayments.toLocaleString()} TZS`}
        valueColor="#3B82F6"
      />
      <SummaryCard
        title="Salio"
        value={`${balance.toLocaleString()} TZS`}
        valueColor="#2563EB"
      />
    </div>

    {/* Date Filters */}
    <SummaryCard>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full overflow-x-auto">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="text-[#2563EB]" /> <span>Kutoka:</span>
          <input
            type="date"
            className="border px-2 py-1 rounded"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Calendar className="text-[#2563EB]" /> <span>Hadi:</span>
          <input
            type="date"
            className="border px-2 py-1 rounded"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          onClick={fetchPurchasesPayments}
          className="px-4 py-1 bg-[#2563EB] text-white rounded hover:bg-[#d63a3a] shadow transition-all"
        >
          Tumia
        </button>
      </div>
    </SummaryCard>

    {/* Edit Supplier Form */}
    <SummaryCard>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        {["name", "contact_person", "phone", "email"].map((field) => (
          <div key={field}>
            <label className="block font-semibold mb-1">
              {field === "name" ? "Jina la Muuzaji" :
               field === "contact_person" ? "Mtu wa Kuwasiliana" :
               field === "phone" ? "Namba ya Simu" :
               "Barua Pepe"}
            </label>
            <input
              type={field === "email" ? "email" : "text"}
              name={field}
              value={supplier[field]}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#2563EB]"
              required={field === "name"}
            />
          </div>
        ))}
        <div>
          <label className="block font-semibold mb-1">Maelezo / Masharti</label>
          <textarea
            name="notes"
            value={supplier.notes}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 rounded bg-[#2563EB] text-white hover:bg-[#d63a3a] ${
              saving ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {saving ? "Inaendelea kuhifadhi..." : "Hifadhi Muuzaji"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded border hover:bg-gray-100"
          >
            Ghairi
          </button>
        </div>
      </form>
    </SummaryCard>

    {/* Purchases Table */}
    <SummaryCard>
      <h2 className="font-semibold text-gray-700 mb-3 w-full text-left">Historia ya Ununuzi</h2>
      <div className="overflow-x-auto w-full">
        <table className="min-w-[600px] border border-gray-200 text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              {["Tarehe", "Bidhaa", "Kiasi", "Jumla"].map((th) => (
                <th key={th} className="border px-3 py-2">{th}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {purchases.length > 0 ? (
              purchases.map((p) => (
                <tr key={p.id} className="hover:bg-[#fdfdfd] transition-colors">
                  <td className="border px-3 py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="border px-3 py-2">{p.product?.name || "-"}</td>
                  <td className="border px-3 py-2">{p.quantity || "-"}</td>
                  <td className="border px-3 py-2">{parseFloat(p.total_price || 0).toLocaleString()} TZS</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center p-2 text-gray-500">Hakuna ununuzi uliopatikana.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SummaryCard>

    {/* Payments Table */}
    <SummaryCard>
      <h2 className="font-semibold text-gray-700 mb-3 w-full text-left">Malipo</h2>
      <div className="overflow-x-auto w-full">
        <table className="min-w-[400px] border border-gray-200 text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              {["Tarehe", "Kiasi", "Hali"].map((th) => (
                <th key={th} className="border px-3 py-2">{th}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-[#fdfdfd] transition-colors">
                  <td className="border px-3 py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="border px-3 py-2">{parseFloat(p.amount || 0).toLocaleString()} TZS</td>
                  <td className="border px-3 py-2 capitalize">{p.status || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center p-2 text-gray-500">Hakuna malipo yaliyopatikana.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SummaryCard>

    {/* Monthly Purchases Chart */}
    <SummaryCard>
      <h2 className="font-semibold text-gray-700 mb-3 w-full text-left">Muhtasari wa Ununuzi wa Kila Mwezi</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={monthlyPurchases}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Bar dataKey="total" fill="#2563EB" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </SummaryCard>
  </div>
);

};

export default SupplierEdit;
