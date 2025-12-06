import { useEffect, useState } from "react";
import PosLayout from "../layouts/PosLayout";
import { supabase } from "../../../supabaseClient";
import InventoryTable from "../components/InventoryTable";

export default function InventoryReport() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) console.error(error);
    else setItems(data);
  };

  const lowStockItems = items.filter(item => item.stock <= 5);

  return (
    <PosLayout>
      <h2 className="text-2xl font-bold mb-4">Inventory Report</h2>
      <InventoryTable items={items} />
      {lowStockItems.length > 0 && (
        <div className="mt-4 p-4 bg-red-100 rounded">
          <h3 className="font-bold text-red-600">Low Stock Alerts</h3>
          <ul className="list-disc list-inside">
            {lowStockItems.map(item => (
              <li key={item.id}>
                {item.name} - Stock: {item.stock}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PosLayout>
  );
}
