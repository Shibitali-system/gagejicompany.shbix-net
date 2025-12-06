import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";

const ExpensesReport = ({ officeId, filterType, customFrom, customTo, searchTerm }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // ============================
  // FIXED DATE RANGE FUNCTION
  // ============================
  const getDateRange = () => {
    const today = new Date();
    let fromDate = new Date(today);
    let toDate = new Date(today);

    switch (filterType) {
      case "today":
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;

      case "week":
        fromDate.setDate(today.getDate() - 7);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;

      case "month":
        fromDate.setMonth(today.getMonth() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;

      case "year":
        fromDate.setFullYear(today.getFullYear() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;

      case "custom":
        fromDate = customFrom ? new Date(customFrom) : today;
        toDate = customTo ? new Date(customTo) : today;
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;

      default:
        break;
    }

    return { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() };
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { fromDate, toDate } = getDateRange();

      // Fetch expenses
      let { data: expensesData = [] } = await supabase
        .from("systems_expenses")
        .select("*")
        .eq("office_id", officeId)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // If none found
      if (!expensesData.length) {
        setExpenses([]);
        setTotalExpenses(0);
        return;
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        expensesData = expensesData.filter(e =>
          e.name?.toLowerCase().includes(term) ||
          e.description?.toLowerCase().includes(term) ||
          e.category?.toLowerCase().includes(term)
        );
      }

      const total = expensesData.reduce(
        (sum, e) => sum + Number(e.amount || 0), 
        0
      );

      setExpenses(expensesData);
      setTotalExpenses(total);

    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [officeId, filterType, customFrom, customTo, searchTerm]);

  if (loading) return <div>Loading expenses report...</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto max-h-96">
      <h4 className="font-semibold mb-2">Expenses Report</h4>

      <div className="mb-2 text-sm text-gray-600">
        Total Expenses: {totalExpenses.toLocaleString()}
      </div>

      <table className="min-w-full text-sm">
        <thead className="bg-red-700 text-white text-xs">
          <tr>
            <th className="px-2 py-1">ID</th>
            <th className="px-2 py-1">Name</th>
            <th className="px-2 py-1">Amount</th>
            <th className="px-2 py-1">Description</th>
            <th className="px-2 py-1">Category</th>
            <th className="px-2 py-1">Office</th>
            <th className="px-2 py-1">Created At</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <tr key={e.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-1">{e.id}</td>
              <td className="px-2 py-1">{e.name}</td>
              <td className="px-2 py-1">{Number(e.amount || 0).toLocaleString()}</td>
              <td className="px-2 py-1">{e.description || "-"}</td>
              <td className="px-2 py-1">{e.category || "-"}</td>
              <td className="px-2 py-1">{e.office_name || "-"}</td>
              <td className="px-2 py-1">{new Date(e.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExpensesReport;
