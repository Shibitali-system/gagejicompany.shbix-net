import { useEffect, useState } from "react";
import PosLayout from "../layouts/PosLayout";
import { supabase } from "../../../supabaseClient";

export default function InventoryIndex() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, stock");

    if (error) console.error(error);
    else setProducts(data);
  };

  return (
    <PosLayout>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Inventory</h2>
        <a
          href="/pos/pages/inventory/restock"
          className="btn btn-primary"
        >
          Restock Product
        </a>
      </div>

      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2">Stock</th>
            <th className="px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-4 py-2">{p.name}</td>
              <td className="px-4 py-2">{p.stock}</td>
              <td className="px-4 py-2">
                <a
                  href={`/pos/pages/products/${p.id}`}
                  className="text-blue-500 hover:underline"
                >
                  View/Edit
                </a>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
                No products found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </PosLayout>
  );
}
