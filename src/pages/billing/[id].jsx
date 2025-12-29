import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from '../../../supabaseClient';

const BillingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchBilling = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("billing")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        setBilling(data);
      } catch (err) {
        setError("Imeshindikana kupata taarifa za malipo: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, [id]);

  if (loading) return <p className="p-6 text-gray-600">Inapakia malipo...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!billing) return <p className="p-6 text-gray-600">Hakuna malipo haya.</p>;

  const { customer_name, amount, payment_method, status, created_at } = billing;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow mt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Billing Details</h1>
        <Link to="/dashboard/billing" className="text-blue-600 hover:underline">
          Rudi Billing
        </Link>
      </div>

      <div className="space-y-4 text-gray-800">
        <div>
          <h2 className="font-semibold text-lg">Customer</h2>
          <p>{customer_name}</p>
        </div>

        <div>
          <h2 className="font-semibold text-lg">Amount</h2>
          <p className="text-xl font-bold text-green-700">{amount.toLocaleString()} TZS</p>
        </div>

        <div>
          <h2 className="font-semibold text-lg">Payment Method</h2>
          <p className="capitalize">{payment_method}</p>
        </div>

        <div>
          <h2 className="font-semibold text-lg">Status</h2>
          <p className={`capitalize font-semibold ${status === "paid" ? "text-green-600" : "text-red-600"}`}>
            {status}
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-lg">Date</h2>
          <p>{new Date(created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default BillingDetails;
