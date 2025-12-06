import { useState, useEffect } from "react";
import PosLayout from "../layouts/PosLayout";
import { supabase } from "../../../supabaseClient";

export default function RestockProduct() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: "", quantity: "" });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("id, name");
    if (error) console.error(error);
    else setProducts(data);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const quantity = parseInt(form.quantity);
    if (!form.product_id || quantity <= 0) {
      alert("Please enter valid values");
      return;
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: supabase.raw("stock + ?", [quantity]) })
      .eq("id", form.product_id);

    // Insert into stock history
    const { error: historyError } = await supabase.from("stock_history").insert([
      {
        product_id: form.product_id,
        quantity,
        type: "restock",
        created_at: new Date(),
      },
    ]);

    if (updateError || historyError) {
      alert("Error updating stock");
      console.error(updateError || historyError);
    } else {
      alert("Stock updated successfully");
      // tumia DOM routing badala ya Next.js router
      window.location.href = "/pos/pages/inventory";
    }
  };

  return (
    <PosLayout>
      <h2 className="text-2xl font-bold mb-4">Restock Product</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow max-w-md"
      >
        <div className="mb-2">
          <label className="block mb-1">Product</label>
          <select
            name="product_id"
            value={form.product_id}
            onChange={handleChange}
            className="input input-bordered w-full"
            required
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2">
          <label className="block mb-1">Quantity</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className="input input-bordered w-full"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full mt-2">
          Restock
        </button>
      </form>
    </PosLayout>
  );
}
