import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from '../../../supabaseClient';

const BillingIndex = () => {
  const navigate = useNavigate();
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBillings = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("billing")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBillings(data);
      } catch (err) {
        setError("Imeshindikana kupata billing records: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBillings();
  }, []);

  if (loading) return <p className="p-6 text-gray-600">Inapakia malipo...</p>;
  if (error) return <p className="p-6 text-red-600 font-semibold">{error}</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded shadow mt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Billing Records</h1>
        <Link to="/dashboard/billing/new">
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Add New Payment
          </button>
        </Link>
      </div>

      {billings.length === 0 ? (
        <p className="text-gray-600">Hakuna malipo yaliyorekodiwa.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">Invoice ID</th>
                <th className="border px-4 py-2 text-left">Mteja</th>
                <th className="border px-4 py-2 text-left">Kiasi</th>
                <th className="border px-4 py-2 text-left">Payment Method</th>
                <th className="border px-4 py-2 text-left">Status</th>
                <th className="border px-4 py-2 text-left">Tarehe</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {billings.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{bill.id}</td>
                  <td className="border px-4 py-2">{bill.customer_name || "Admin"}</td>
                  <td className="border px-4 py-2">{bill.amount.toLocaleString()} TZS</td>
                  <td className="border px-4 py-2">{bill.payment_method || "-"}</td>
                  <td
                    className={`border px-4 py-2 font-semibold ${
                      bill.status === "paid" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {bill.status}
                  </td>
                  <td className="border px-4 py-2">{new Date(bill.created_at).toLocaleString()}</td>
                  <td className="border px-4 py-2">
                    <Link to={`/dashboard/billing/${bill.id}`}>
                      <span className="text-blue-600 hover:underline">View</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BillingIndex;
