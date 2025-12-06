import { useEffect, useState } from "react";
import PosLayout from "./layouts/PosLayout";
import { supabase } from "../../supabaseClient";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      setError("Imeshindikana kupakua categories.");
    } else {
      setCategories(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Add new category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name: newCategory.trim() }])
      .select();

    if (error) {
      console.error("Error adding category:", error);
      setError("Imeshindikana kuongeza category mpya.");
    } else {
      setCategories((prev) => [...prev, ...data]);
      setNewCategory("");
    }
  };

  // Delete category
  const handleDelete = async (id) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      console.error("Error deleting category:", error);
      setError("Imeshindikana kufuta category.");
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <PosLayout>
      <h2 className="text-2xl font-bold mb-4">Aina za Bidhaa (Categories)</h2>

      {/* Form for adding new category */}
      <form onSubmit={handleAddCategory} className="flex gap-2 mb-6 max-w-md">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Andika jina la category..."
          className="input input-bordered w-full"
        />
        <button type="submit" className="btn btn-primary">
          Ongeza
        </button>
      </form>

      {error && (
        <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>
      )}

      {/* Categories list */}
      {loading ? (
        <p>Inapakia...</p>
      ) : categories.length === 0 ? (
        <p>Hakuna category yoyote bado.</p>
      ) : (
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">#</th>
              <th className="p-2 border">Jina la Category</th>
              <th className="p-2 border text-center">Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, index) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="p-2 border">{index + 1}</td>
                <td className="p-2 border">{cat.name}</td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-red-600 hover:underline"
                  >
                    Futa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PosLayout>
  );
}
