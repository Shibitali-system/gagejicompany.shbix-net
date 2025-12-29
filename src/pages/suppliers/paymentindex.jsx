import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaFileExcel, FaPlus, FaMoneyBillWave, FaArrowLeft } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

const CHUNK_SIZE = 500;

const PaymentsIndex = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [user, setUser] = useState(null);

  // --- Load current user ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("No authenticated user");

        const { data: sysUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (sysUser) {
          setUser({
            id: sysUser.id,
            name: sysUser.customer_name,
            office_id: sysUser.office_id,
            role: "admin",
          });
          return;
        }

        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) {
          setUser({
            id: employee.id,
            name: employee.name,
            office_id: employee.office_id,
            role: "employee",
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user.");
      }
    };
    fetchUser();
  }, []);

  // --- Fetch payments ---
  useEffect(() => {
    if (user?.office_id) fetchPayments();
  }, [user, filterType, customFrom, customTo, searchTerm]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      // --- Date filters ---
      let fromDate, toDate;
      const now = new Date();

      if (filterType !== "all") {
        switch (filterType) {
          case "today":
            fromDate = new Date(now.setHours(0, 0, 0, 0));
            toDate = new Date(now.setHours(23, 59, 59, 999));
            break;
          case "week":
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            fromDate = new Date(now.setDate(diff));
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date();
            break;
          case "month":
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            toDate = new Date();
            break;
          case "year":
            fromDate = new Date(now.getFullYear(), 0, 1);
            toDate = new Date();
            break;
          case "custom":
            if (customFrom && customTo) {
              fromDate = new Date(customFrom); fromDate.setHours(0,0,0,0);
              toDate = new Date(customTo); toDate.setHours(23,59,59,999);
            }
            break;
        }
      }

      // --- Fetch payments in chunks ---
      let allPayments = [];
      let page = 0;
      while (true) {
        let query = supabase
          .from("payment")
          .select("*")
          .eq("office_id", user.office_id)
          .order("created_at", { ascending: false })
          .range(page * CHUNK_SIZE, (page + 1) * CHUNK_SIZE - 1);

        if (filterType !== "all" && fromDate && toDate) {
          query = query.gte("created_at", fromDate.toISOString())
                       .lte("created_at", toDate.toISOString());
        }

        if (searchTerm.trim()) {
          const term = searchTerm.trim();
          query = query.or(
            `supplier_name.ilike.%${term}%,invoice_number.ilike.%${term}%,status.ilike.%${term}%,notes.ilike.%${term}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allPayments = [...allPayments, ...data];
        if (data.length < CHUNK_SIZE) break;
        page += 1;
      }

      // --- Fetch related suppliers ---
      const supplierIds = [...new Set(allPayments.map(p => p.supplier_id))].filter(Boolean);
      let suppliers = [];
      if (supplierIds.length > 0) {
        const { data: supplierData, error: supError } = await supabase
          .from("suppliers")
          .select("id,name")
          .in("id", supplierIds);
        if (supError) throw supError;
        suppliers = supplierData || [];
      }

      // --- Fetch related purchases ---
      const purchaseIds = [...new Set(allPayments.map(p => p.purchase_id))].filter(Boolean);
      let purchases = [];
      if (purchaseIds.length > 0) {
        const { data: purchaseData, error: purError } = await supabase
          .from("purchases")
          .select("id,invoice_number,total_amount")
          .in("id", purchaseIds);
        if (purError) throw purError;
        purchases = purchaseData || [];
      }

      // --- Map supplier_name & invoice info ---
      const mappedPayments = allPayments.map(p => ({
        ...p,
        supplier_name: suppliers.find(s => s.id === p.supplier_id)?.name || "-",
        invoice_number: purchases.find(i => i.id === p.purchase_id)?.invoice_number || "-",
        invoice_amount: purchases.find(i => i.id === p.purchase_id)?.total_amount || 0,
      }));

      setPayments(mappedPayments);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch payments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Totals ---
  const totals = useMemo(() => ({
    totalPayments: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    pending: payments.filter(p => p.status === "pending").length,
    completed: payments.filter(p => p.status === "completed").length,
  }), [payments]);

  // --- Export Excel ---
  const exportToExcel = () => {
    if (!payments.length) return toast.error("No payments to export");
    const worksheet = XLSX.utils.json_to_sheet(
      payments.map(p => ({
        "Supplier Name": p.supplier_name || "-",
        "Invoice Number": p.invoice_number || "-",
        "Invoice Amount": p.invoice_amount?.toLocaleString() || 0,
        "Total Invoice Paid": p.total_invoice_paid?.toLocaleString() || 0,
        Amount: p.amount?.toLocaleString() || 0,
        Status: p.status,
        Notes: p.notes || "-",
        "Created By": p.created_by || "-",
        "Date Added": new Date(p.created_at).toLocaleString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
    XLSX.writeFile(workbook, `payments_${new Date().toISOString()}.xlsx`);
  };

  if (!user) return <p className="p-6 text-gray-600">Loading user info...</p>;

  const SummaryCard = ({ title, value }) => (
    <div className="bg-white border rounded-[4px] px-5 py-4 flex flex-col items-center justify-center shadow w-full">
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
      <p className="text-xl font-semibold mt-1 text-[#2563EB]">{value}</p>
    </div>
  );

  const InteractiveCard = ({ children }) => (
    <div className="bg-white border rounded-[4px] p-5 flex flex-col items-center justify-center shadow w-full">
      {children}
    </div>
  );

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Back */}
      <Link
        to="../suppliers"
        className="flex items-center gap-2 text-[#2563EB] font-semibold hover:underline text-sm"
      >
        <FaArrowLeft /> Rudi kwa Muuzaji
      </Link>

      <InteractiveCard>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] flex items-center gap-2">
          <FaMoneyBillWave /> Malipo ya Muuzaji
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mt-2 text-center">
          Simamia malipo ya muuzaji: tafuta, chuja kwa tarehe au hali, na toa Excel.
        </p>
        <Link
          to="../suppliers/payments"
          className="mt-3 bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#d63a3a] flex items-center gap-2 shadow"
        >
          <FaPlus /> Ongeza Malipo
        </Link>
      </InteractiveCard>

      <InteractiveCard>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full items-center justify-center">
          {["all","today","week","month","year"].map(type => (
            <button
              key={type}
              className={`px-3 py-1 rounded-xl ${filterType === type ? "bg-[#2563EB] text-white" : "bg-white border"}`}
              onClick={() => setFilterType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="date"
              value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setFilterType("custom"); }}
              className="border px-2 py-1 rounded"
            />
            <span>hadi</span>
            <input
              type="date"
              value={customTo}
              onChange={e => { setCustomTo(e.target.value); setFilterType("custom"); }}
              className="border px-2 py-1 rounded"
            />
          </div>
          <button
            onClick={exportToExcel}
            className="bg-blue-600 text-white px-3 py-1 rounded-xl flex items-center gap-1 whitespace-nowrap"
          >
            <FaFileExcel /> Export Excel
          </button>
        </div>
      </InteractiveCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
        <SummaryCard title="Jumla ya Malipo" value={totals.totalPayments} />
        <SummaryCard title="Jumla ya Kiasi" value={totals.totalAmount.toLocaleString()} />
        <SummaryCard title="Inasubiri" value={totals.pending} />
        <SummaryCard title="Imekamilika" value={totals.completed} />
      </div>

      {loading ? (
        <p className="text-gray-600">Inaendelea kupakia malipo...</p>
      ) : error ? (
        <p className="text-red-600 font-semibold">{error}</p>
      ) : payments.length === 0 ? (
        <p className="text-gray-600">Hakuna malipo yaliyopatikana.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Jina la Muuzaji</th>
                <th className="px-3 py-2 text-left">Nambari ya Ankara</th>
                <th className="px-3 py-2 text-left">Kiasi cha Ankara</th>
                <th className="px-3 py-2 text-left">Jumla Iliyolipwa</th>
                <th className="px-3 py-2 text-left">Kiasi</th>
                <th className="px-3 py-2 text-left">Hali</th>
                <th className="px-3 py-2 text-left">Maelezo</th>
                <th className="px-3 py-2 text-left">Imeingizwa Na</th>
                <th className="px-3 py-2 text-left">Tarehe Imeongezwa</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b hover:bg-green-50 transition-colors">
                  <td className="px-3 py-2">{p.supplier_name || "-"}</td>
                  <td className="px-3 py-2">{p.invoice_number || "-"}</td>
                  <td className="px-3 py-2">{p.invoice_amount?.toLocaleString() || 0}</td>
                  <td className="px-3 py-2">{p.total_invoice_paid?.toLocaleString() || 0}</td>
                  <td className="px-3 py-2">{p.amount?.toLocaleString() || 0}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2 truncate max-w-xs" title={p.notes}>{p.notes || "-"}</td>
                  <td className="px-3 py-2">{p.created_by || "-"}</td>
                  <td className="px-3 py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  </div>
);

};

export default PaymentsIndex;
