import { useEffect, useState } from "react";
import PosLayout from "../layouts/PosLayout";
import { supabase } from "../../../supabaseClient";
import SalesChart from "../components/SalesChart";

export default function SalesReport() {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setSales(data);
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <PosLayout>
      <h2 className="text-2xl font-bold mb-4">Sales Report</h2>
      <div className="mb-4">
        <p>
          <strong>Total Sales:</strong> {sales.length}
        </p>
        <p>
          <strong>Total Revenue:</strong> ${totalRevenue.toFixed(2)}
        </p>
      </div>
      <SalesChart data={sales} />
    </PosLayout>
  );
}
