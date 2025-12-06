import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { Link } from "react-router-dom";

const SupplierPayments = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [paymentData, setPaymentData] = useState({
    amount: "",
    status: "pending",
    notes: "",
  });

  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [totalInvoicePaid, setTotalInvoicePaid] = useState(0);
  const [invoiceBalance, setInvoiceBalance] = useState(0);

  // --- Load user info ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        const { data: sysUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (sysUser) {
          setUser({ ...sysUser, name: sysUser.customer_name });
          return;
        }

        const { data: emp } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (emp) setUser(emp);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  // --- Fetch suppliers for the user's office ---
useEffect(() => {
  const fetchSuppliers = async () => {
    if (!user?.office_id) return; // ensure user and office_id are loaded

    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("office_id", user.office_id) // filter by user's office
        .order("name");

      if (error) throw error;

      setSuppliers(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch suppliers: " + err.message);
    }
  };

  fetchSuppliers();
}, [user?.office_id]); // re-run if user.office_id changes


  // --- Fetch invoices when supplier is selected ---
  useEffect(() => {
    if (!selectedSupplier) return setInvoices([]);
    const fetchInvoices = async () => {
      const supplier = suppliers.find(s => s.id === selectedSupplier);
      if (supplier) setSupplierName(supplier.name);

      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("supplier_id", selectedSupplier)
        .order("created_at", { ascending: false });
      if (error) return toast.error("Failed to fetch invoices");

      setInvoices(data || []);
      setSelectedInvoice("");
      setInvoiceNumber("");
      setInvoiceAmount(0);
      setTotalInvoicePaid(0);
      setInvoiceBalance(0);
    };
    fetchInvoices();
  }, [selectedSupplier, suppliers]);

  // --- Set invoice info and calculate total_invoice_paid ---
  useEffect(() => {
    if (!selectedInvoice) {
      setInvoiceNumber("");
      setInvoiceAmount(0);
      setTotalInvoicePaid(0);
      setInvoiceBalance(0);
      return;
    }

    const invoice = invoices.find(inv => inv.id === selectedInvoice);
    if (invoice) {
      setInvoiceNumber(invoice.invoice_number);
      setInvoiceAmount(invoice.total_amount);

      const fetchTotalPaid = async () => {
        const { data: payments, error } = await supabase
          .from("payment")
          .select("amount")
          .eq("purchase_id", selectedInvoice);
        if (error) return toast.error("Failed to fetch invoice payments");

        const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        setTotalInvoicePaid(totalPaid);
        setInvoiceBalance(invoice.total_amount - totalPaid);
      };
      fetchTotalPaid();
    }
  }, [selectedInvoice, invoices]);

  // --- Handle input change ---
  const handleChange = e => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  // --- Submit payment ---
  const handleSubmit = async e => {
    e.preventDefault();
    if (!selectedSupplier) return toast.error("Select a supplier");
    if (!paymentData.amount || isNaN(paymentData.amount))
      return toast.error("Enter a valid amount");
    if (!user) return toast.error("User info not loaded");

    setLoading(true);
    try {
      const { error } = await supabase.from("payment").insert([{
        supplier_id: selectedSupplier,
        supplier_name: supplierName || "",
        purchase_id: selectedInvoice || null,
        invoice_number: invoiceNumber || null,
        invoice_amount: invoiceAmount || 0,
        total_invoice_paid: totalInvoicePaid + parseFloat(paymentData.amount),
        amount: parseFloat(paymentData.amount),
        status: paymentData.status,
        notes: paymentData.notes,
        office_id: user.office_id,
        created_by: user.name,
      }]);
      if (error) throw error;
      toast.success("Payment added successfully!");

      // Reset form
      setPaymentData({ amount: "", status: "pending", notes: "" });
      setSelectedInvoice("");
      setSelectedSupplier("");
      setInvoices([]);
      setSupplierName("");
      setInvoiceNumber("");
      setInvoiceAmount(0);
      setTotalInvoicePaid(0);
      setInvoiceBalance(0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add payment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-4xl mx-auto">
      {/* Card Container */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] shadow-lg p-6 sm:p-8 space-y-6">
        
        {/* Back */}
        <Link
          to="../suppliers/paymentindex"
          className="flex items-center gap-2 text-[#ef4444] font-semibold hover:underline text-sm"
        >
          <FaArrowLeft /> Back to Supplier
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444]">Supplier Payments</h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Record payments for suppliers and track invoices easily.
            </p>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Select Supplier */}
          <div>
            <label className="block font-semibold mb-1">Select Supplier *</label>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="border border-gray-300 rounded-[4px] px-3 py-2 w-full focus:ring-2 focus:ring-[#ef4444]"
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Select Invoice */}
          <div>
            <label className="block font-semibold mb-1">Invoice (optional)</label>
            <select
              value={selectedInvoice}
              onChange={e => setSelectedInvoice(e.target.value)}
              className="border border-gray-300 rounded-[4px] px-3 py-2 w-full focus:ring-2 focus:ring-[#ef4444]"
              disabled={!invoices.length}
            >
              <option value="">-- Select Invoice --</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} | {inv.total_amount} TZS
                </option>
              ))}
            </select>
            {selectedInvoice && (
              <p className="text-sm mt-1 text-gray-600">
                Total Paid: {totalInvoicePaid.toLocaleString()} TZS | Balance: {invoiceBalance.toLocaleString()} TZS
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block font-semibold mb-1">Amount (TZS) *</label>
            <input
              type="number"
              name="amount"
              value={paymentData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
              className="border border-gray-300 rounded-[4px] px-3 py-2 w-full focus:ring-2 focus:ring-[#ef4444]"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select
              name="status"
              value={paymentData.status}
              onChange={handleChange}
              className="border border-gray-300 rounded-[4px] px-3 py-2 w-full focus:ring-2 focus:ring-[#ef4444]"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className="block font-semibold mb-1">Notes</label>
            <textarea
              name="notes"
              value={paymentData.notes}
              onChange={handleChange}
              placeholder="Additional notes"
              className="border border-gray-300 rounded-[4px] px-3 py-2 w-full focus:ring-2 focus:ring-[#ef4444]"
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <div className="col-span-2 flex justify-center mt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-[#ef4444] hover:bg-[#d63a3a] text-white font-semibold px-6 py-3 rounded-[4px] shadow-md transition-transform hover:scale-105"
            >
              <FaSave /> {loading ? "Saving..." : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);

};

export default SupplierPayments;
