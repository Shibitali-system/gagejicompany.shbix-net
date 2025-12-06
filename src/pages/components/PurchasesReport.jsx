import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";

const PurchasesReport = ({ officeId, filterType, customFrom, customTo, searchTerm }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalAmount: 0,
    totalPrice: 0,
    totalReturned: 0,
  });

  // ================= Helper: Date Range =================
  const getDateRange = () => {
    const today = new Date();
    let fromDate = new Date();
    let toDate = today;

    switch (filterType) {
      case "today": break;
      case "week": fromDate.setDate(today.getDate() - 7); break;
      case "month": fromDate.setMonth(today.getMonth() - 1); break;
      case "year": fromDate.setFullYear(today.getFullYear() - 1); break;
      case "custom":
        if (customFrom) fromDate = new Date(customFrom);
        if (customTo) toDate = new Date(customTo);
        break;
      default: break;
    }

    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = toDate.toISOString().split("T")[0];
    return { fromStr, toStr };
  };

  // ================= Fetch Purchases =================
  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { fromStr, toStr } = getDateRange();

      // Fetch purchases within date range
      let { data: purchasesData, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("office_id", officeId)
        .gte("date", fromStr)
        .lte("date", toStr);

      if (error) throw error;
      if (!purchasesData) purchasesData = [];

      // ================= Fetch Suppliers =================
      const supplierIds = purchasesData.map((p) => p.supplier_id).filter((id) => id != null);
      let suppliersData = [];
      if (supplierIds.length > 0) {
        const { data, error: suppliersErr } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", supplierIds);
        if (!suppliersErr && data) suppliersData = data;
      }

      // ================= Fetch Users (systems_users & employees) =================
      const userIds = purchasesData.map((p) => p.created_by).filter((id) => id != null);
      let usersData = [];
      let employeesData = [];

      if (userIds.length > 0) {
        const { data: suData } = await supabase
          .from("systems_users")
          .select("id, customer_name")
          .in("id", userIds);
        usersData = suData || [];

        const { data: empData } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", userIds);
        employeesData = empData || [];
      }

      // ================= Merge Supplier and Created By Names =================
      const merged = purchasesData.map((p) => {
        const supplier = suppliersData.find((s) => s.id === p.supplier_id);
        const user = usersData.find((u) => u.id === p.created_by);
        const employee = employeesData.find((e) => e.id === p.created_by);
        const createdByName = user?.customer_name || employee?.name || p.created_by_name || "-";

        return {
          ...p,
          supplierName: supplier?.name || "-",
          createdByName,
        };
      });

      // ================= Totals =================
      const totalAmount = merged.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const totalPrice = merged.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
      const totalReturned = merged.reduce((sum, p) => sum + Number(p.total_returned || 0), 0);

      // ================= Search Filter =================
      let filtered = merged;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = merged.filter(
          (p) =>
            (p.invoice_number || "").toLowerCase().includes(term) ||
            (p.createdByName || "").toLowerCase().includes(term) ||
            String(p.id).includes(term)
        );
      }

      setPurchases(filtered);
      setTotals({ totalAmount, totalPrice, totalReturned });
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [officeId, filterType, customFrom, customTo, searchTerm]);

  if (loading) return <div>Loading purchases report...</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto max-h-96">
      <h4 className="font-semibold mb-2">Purchases Report</h4>
      <div className="mb-2 text-sm text-gray-600">
        Total Amount: {totals.totalAmount.toLocaleString()} | Total Price: {totals.totalPrice.toLocaleString()} | Returned: {totals.totalReturned.toLocaleString()}
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-red-600 text-white text-xs">
          <tr>
            <th className="px-2 py-1">ID</th>
            <th className="px-2 py-1">Invoice</th>
            <th className="px-2 py-1">Supplier</th>
            <th className="px-2 py-1">Total Amount</th>
            <th className="px-2 py-1">Total Price</th>
            <th className="px-2 py-1">Returned</th>
            <th className="px-2 py-1">Created By</th>
            <th className="px-2 py-1">Date</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-1">{p.id}</td>
              <td className="px-2 py-1">{p.invoice_number || "-"}</td>
              <td className="px-2 py-1">{p.supplierName}</td>
              <td className="px-2 py-1">{Number(p.total_amount || 0).toLocaleString()}</td>
              <td className="px-2 py-1">{Number(p.total_price || 0).toLocaleString()}</td>
              <td className="px-2 py-1">{Number(p.total_returned || 0).toLocaleString()}</td>
              <td className="px-2 py-1">{p.createdByName}</td>
              <td className="px-2 py-1">{p.date ? new Date(p.date).toLocaleDateString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PurchasesReport;
