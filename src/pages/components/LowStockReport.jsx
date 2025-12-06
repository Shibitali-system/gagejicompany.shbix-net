import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";

const LowStockReport = ({ officeId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowStockCount, setLowStockCount] = useState(0);

  const fetchLowStockProducts = async () => {
    try {
      setLoading(true);

      let { data: productsData, error } = await supabase
        .from("products")
        .select("*")
        .eq("office_id", officeId)
        .lte("stock", 8) // low stock threshold
        .order("stock", { ascending: true });

      if (error) {
        console.error("Error fetching low stock:", error);
        productsData = [];
      }

      if (!productsData) productsData = [];

      setProducts(productsData);
      setLowStockCount(productsData.length);
    } catch (err) {
      console.error("Error fetching low stock products:", err);
      setProducts([]);
      setLowStockCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStockProducts();
  }, [officeId]);

  if (loading) return <div>Loading low stock products...</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow overflow-x-auto max-h-96">
      <h4 className="font-semibold mb-2">Low Stock Products</h4>

      <div className="mb-2 text-sm text-gray-600">
        Products with stock ≤ 8: {lowStockCount}
      </div>

      <table className="min-w-full text-sm">
        <thead className="bg-orange-600 text-white text-xs">
          <tr>
            <th className="px-2 py-1">ID</th>
            <th className="px-2 py-1">Name</th>
            <th className="px-2 py-1">Stock</th>
            <th className="px-2 py-1">Price</th>
            <th className="px-2 py-1">Purchase Price</th>
            <th className="px-2 py-1">Category</th>
            <th className="px-2 py-1">Office</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-1">{p.id}</td>
              <td className="px-2 py-1">{p.name}</td>
              <td className="px-2 py-1">{p.stock}</td>
              <td className="px-2 py-1">{Number(p.price || 0).toLocaleString()}</td>
              <td className="px-2 py-1">{Number(p.purchase_price || 0).toLocaleString()}</td>
              <td className="px-2 py-1">{p.category || "-"}</td>
              <td className="px-2 py-1">{p.office_name || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LowStockReport;
