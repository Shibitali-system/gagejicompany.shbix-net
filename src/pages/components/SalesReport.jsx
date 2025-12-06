import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";

const SalesReport = ({ officeId, filterType, customFrom, customTo, searchTerm }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalAmount: 0,
    totalPurchasePrice: 0
  });

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

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { fromDate, toDate } = getDateRange();

      // 1. Fetch sales
      let { data: salesData = [] } = await supabase
        .from("sales")
        .select("*")
        .eq("office_id", officeId)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      if (!salesData.length) {
        setSales([]);
        setTotals({ totalAmount: 0, totalPurchasePrice: 0 });
        return;
      }

      const saleIds = salesData.map(s => s.id);

      // 2. Sale items
      const { data: saleItems = [] } = await supabase
        .from("sale_items")
        .select("sale_id, product_id, quantity")
        .in("sale_id", saleIds);

      // 3. Products for purchase price
      const productIds = saleItems.map(sp => sp.product_id);
      const { data: productsData = [] } = await supabase
        .from("products")
        .select("id, purchase_price")
        .in("id", productIds);

      // 4. Customers
      const customerIds = salesData.map(s => s.customer_id);
      const { data: customersData = [] } = await supabase
        .from("customers")
        .select("id, name, phone")
        .in("id", customerIds);

      // 5. Combine data
      const finalSales = salesData.map(s => {
        const items = saleItems.filter(sp => sp.sale_id === s.id);

        const totalPurchasePrice = items.reduce((sum, sp) => {
          const prod = productsData.find(p => p.id === sp.product_id);
          return sum + ((prod?.purchase_price || 0) * sp.quantity);
        }, 0);

        const customer = customersData.find(c => c.id === s.customer_id);

        return {
          ...s,
          totalPurchasePrice,
          customerName: customer?.name || "-",
        };
      });

      // 6. Search filter
      let filtered = finalSales;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = finalSales.filter(s =>
          s.customerName.toLowerCase().includes(term) ||
          s.seller_name?.toLowerCase().includes(term) ||
          s.id.toString().includes(term)
        );
      }

      // 7. Totals
      const totalAmount = filtered.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalPurchasePrice = filtered.reduce((sum, s) => sum + s.totalPurchasePrice, 0);

      setSales(filtered);
      setTotals({ totalAmount, totalPurchasePrice });

    } catch (err) {
      console.error("Error fetching sales:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [officeId, filterType, customFrom, customTo, searchTerm]);

  if (loading) return <div>Loading sales report...</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto max-h-96">
      <h4 className="font-semibold mb-2">Sales Report</h4>
      <div className="mb-2 text-sm text-gray-600">
        Total Sales Amount: {totals.totalAmount.toLocaleString()} | 
        Total Purchase for Sold Products: {totals.totalPurchasePrice.toLocaleString()}
      </div>

      <table className="min-w-full text-sm">
        <thead className="bg-green-600 text-white text-xs">
          <tr>
            <th className="px-2 py-1">ID</th>
            <th className="px-2 py-1">Customer</th>
            <th className="px-2 py-1">Seller</th>
            <th className="px-2 py-1">Total Amount</th>
            <th className="px-2 py-1">Total Purchase</th>
            <th className="px-2 py-1">Status</th>
            <th className="px-2 py-1">Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map(s => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-1">{s.id}</td>
              <td className="px-2 py-1">{s.customerName}</td>
              <td className="px-2 py-1">{s.seller_name}</td>
              <td className="px-2 py-1">{Number(s.total_amount).toLocaleString()}</td>
              <td className="px-2 py-1">{Number(s.totalPurchasePrice).toLocaleString()}</td>
              <td className="px-2 py-1">{s.payment_status}</td>
              <td className="px-2 py-1">{new Date(s.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesReport;
