import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";

const BillingReport = ({ officeId, filterType, customFrom, customTo, searchTerm }) => {
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overdueCount, setOverdueCount] = useState(0);

  const fetchBilling = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("billing")
        .select("*")
        .eq("office_id", officeId);

      // today's date as YYYY-MM-DD
      const todayStr = new Date().toISOString().slice(0, 10);

      // Date filters
      if (filterType === "today") {
        query = query.eq("due_date", todayStr);
      } 
      else if (filterType === "week") {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startStr = startOfWeek.toISOString().slice(0, 10);
        query = query.gte("due_date", startStr).lte("due_date", todayStr);
      } 
      else if (filterType === "month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startStr = startOfMonth.toISOString().slice(0, 10);
        query = query.gte("due_date", startStr).lte("due_date", todayStr);
      } 
      else if (filterType === "year") {
        const startOfYear = new Date();
        startOfYear.setMonth(0, 1);
        const startStr = startOfYear.toISOString().slice(0, 10);
        query = query.gte("due_date", startStr).lte("due_date", todayStr);
      } 
      else if (filterType === "custom" && customFrom && customTo) {
        query = query.gte("due_date", customFrom).lte("due_date", customTo);
      }

      // Execute
      const { data, error } = await query.order("due_date", { ascending: true });

      if (error) {
        console.error("Error fetching billing:", error);
        setBilling([]);
        setOverdueCount(0);
        return;
      }

      const rows = data || [];

      // Search filter
      const filtered = rows.filter(b => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return b.customer_name?.toLowerCase().includes(term);
      });

      setBilling(filtered);

      // Overdue count
      const today = new Date();
      const overdue = filtered.filter(b => 
        b.status !== "paid" &&
        b.due_date &&
        new Date(b.due_date) < today
      ).length;

      setOverdueCount(overdue);

    } catch (err) {
      console.error("Error in fetchBilling:", err);
      setBilling([]);
      setOverdueCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, [officeId, filterType, customFrom, customTo, searchTerm]);

  if (loading) return <div>Loading billing data...</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto max-h-96">
      <h4 className="font-semibold mb-2">Billing</h4>

      <div className="mb-2 text-sm text-gray-600">
        Overdue bills: {overdueCount}
      </div>

      <table className="min-w-full text-sm">
        <thead className="bg-red-700 text-white text-xs">
          <tr>
            <th className="px-2 py-1">ID</th>
            <th className="px-2 py-1">Customer</th>
            <th className="px-2 py-1">Amount</th>
            <th className="px-2 py-1">Due Date</th>
            <th className="px-2 py-1">Status</th>
          </tr>
        </thead>

        <tbody>
          {billing.map(b => (
            <tr key={b.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-1">{b.id}</td>
              <td className="px-2 py-1">{b.customer_name || "-"}</td>
              <td className="px-2 py-1">{Number(b.amount || 0).toLocaleString()}</td>
              <td className="px-2 py-1">{b.due_date || "-"}</td>
              <td className="px-2 py-1">{b.status || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BillingReport;
