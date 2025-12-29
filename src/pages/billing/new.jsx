import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../../../supabaseClient';

const BillingNew = () => {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [status, setStatus] = useState("paid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!customerName || !amount) {
      setError("Tafadhali jaza majedwali yote muhimu.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.from("billing").insert([
        {
          customer_name: customerName,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          status,
        },
      ]);

      if (error) throw error;

      navigate("/dashboard/billing");
    } catch (err) {
      setError("Imeshindikana kurekodi malipo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-3xl font-bold mb-6">Record New Payment</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g Hospital, Client Name"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Amount (TZS)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10000"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank">Bank Transfer</option>
            <option value="mobile">Mobile Money</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Inarekodi..." : "Record Payment"}
        </button>
      </form>
    </div>
  );
};

export default BillingNew;
