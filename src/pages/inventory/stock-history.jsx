import { useEffect, useState } from "react";
import PosLayout from "../layouts/PosLayout";
import { supabase } from "../../../supabaseClient";

export default function StockHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("stock_history")
      .select("id, product_id, quantity, type, created_at, product(name)")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setHistory(data);
  };

  return (
    <PosLayout>
      <h2 className="text-2xl font-bold mb-4">Stock History</h2>
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Quantity</th>
            <th className="px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id} className="border-t">
              <td className="px-4 py-2">{h.product?.name}</td>
              <td className="px-4 py-2 capitalize">{h.type}</td>
              <td className="px-4 py-2">{h.quantity}</td>
              <td className="px-4 py-2">
                {new Date(h.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
          {history.length === 0 && (
            <tr>
              <td
                colSpan="4"
                className="text-center py-4 text-gray-500"
              >
                No stock history yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </PosLayout>
  );
}
