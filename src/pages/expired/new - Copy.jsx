import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from '../../../supabaseClient';
import { FaPlus, FaTimes, FaArrowLeft, FaSave } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

const EnterExpiredProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sellerInfo, setSellerInfo] = useState(null);

  // --- Fetch seller info ---
  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser) {
          setSellerInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            type: "system",
            office_id: systemUser.office_id,
            office_name: systemUser.office_name
          });
          return;
        }

        const { data: employeeUser } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (employeeUser) {
          const { data: officeData } = await supabase
            .from("systems_users")
            .select("office_name, office_id")
            .eq("office_id", employeeUser.office_id)
            .maybeSingle();

          setSellerInfo({
            id: employeeUser.id,
            name: employeeUser.name,
            type: "employee",
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office"
          });
          return;
        }

        toast.error("Seller information not found.");
      } catch (err) {
        toast.error("Failed to fetch seller information.");
        console.error(err);
      }
    };
    fetchSellerInfo();
  }, []);

  // --- Fetch products in chunks ---
  useEffect(() => {
    const fetchProducts = async () => {
      if (!sellerInfo) return;
      setLoading(true);
      try {
        let allProducts = [];
        const limit = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from("products")
            .select("*")
            .order("name", { ascending: true })
            .range(from, from + limit - 1);

          if (sellerInfo.office_id) {
            query = query.eq("office_id", sellerInfo.office_id);
          }

          const { data, error } = await query;
          if (error) throw error;

          allProducts = allProducts.concat(data || []);
          from += limit;
          hasMore = data && data.length === limit;
        }

        setProducts(allProducts);
        setCategories(Array.from(new Set(allProducts.map(p => p.category))).filter(Boolean));

      } catch (err) {
        toast.error("Failed to fetch products: " + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [sellerInfo]);

  // --- Filter products ---
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
        (selectedCategory ? p.category === selectedCategory : true)
      )
      .slice(0, 5); // limit UI preview
  }, [products, productSearch, selectedCategory]);

  // --- Handlers ---
  const handleAddProduct = (product) => {
    if(selectedProducts.find(p=>p.id===product.id)) return toast.error("Product already selected");
    setSelectedProducts([...selectedProducts, { ...product, quantity:1, expired_date: "" }]);
  };

  const handleRemoveProduct = (id) => setSelectedProducts(selectedProducts.filter(p=>p.id!==id));
  const handleQuantityChange = (id, qty) => setSelectedProducts(selectedProducts.map(p=>p.id===id ? {...p, quantity: qty} : p));
  const handleExpiryDateChange = (id, date) => setSelectedProducts(selectedProducts.map(p=>p.id===id ? {...p, expired_date: date} : p));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProducts.length) return toast.error("Select at least one product");
    if (!sellerInfo) return toast.error("Seller info not loaded");

    setLoading(true);
    try {
      const expiredData = selectedProducts.map(p => ({
        product_id: p.id,
        quantity: p.quantity,
        expired_date: p.expired_date || new Date().toISOString().slice(0,10),
        office_id: sellerInfo.office_id,
        office_name: sellerInfo.office_name,
        entered_by: sellerInfo.id
      }));

      // 1️⃣ Insert into expired_products
      const { error: insertError } = await supabase.from("expired_products").insert(expiredData);
      if (insertError) throw insertError;

      // 2️⃣ Update products stock
      for (let p of selectedProducts) {
        const newStock = (p.stock || 0) - (p.quantity || 0);
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: newStock < 0 ? 0 : newStock })
          .eq("id", p.id);

        if (updateError) console.error(`Failed to update stock for ${p.name}:`, updateError);
      }

      toast.success("Expired products recorded and stock updated successfully");
      setSelectedProducts([]);

      // Update UI
      const updatedProducts = products.map(p => {
        const selected = selectedProducts.find(sp => sp.id === p.id);
        if (selected) return { ...p, stock: (p.stock || 0) - selected.quantity };
        return p;
      });
      setProducts(updatedProducts);

    } catch(err) {
      toast.error("Failed to record expired products: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right"/>
      <div className="max-w-5xl mx-auto bg-white p-4 sm:p-6 rounded-2xl shadow">
        <Link to="../expired" className="flex items-center gap-2 font-bold text-green-700 hover:underline"><FaArrowLeft /> Back to Products</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4 sm:mb-6">Enter Expired Products</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search and Category */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={e=>setProductSearch(e.target.value)}
              className="flex-1 border px-3 py-2 rounded-xl"
            />
            <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="border px-3 py-2 rounded-xl">
              <option value="">All Categories</option>
              {categories.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Products List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border p-2 rounded">
            {loading ? (
              <div className="p-2 text-gray-500">Loading products...</div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-red-50" onClick={()=>handleAddProduct(p)}>
                  {p.name} - {p.price.toLocaleString()} TZS (Stock: {p.stock})
                  <FaPlus className="text-red-600"/>
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500">No matching product found</div>
            )}
          </div>

          {/* Selected Products */}
          {selectedProducts.length>0 && (
            <div className="space-y-2">
              <h2 className="font-semibold text-lg text-red-600">Selected Products</h2>
              {selectedProducts.map(p => (
                <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border p-2 rounded gap-2 sm:gap-0">
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-gray-500">Stock: {p.stock}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" max={p.stock} value={p.quantity} onChange={e=>handleQuantityChange(p.id, parseInt(e.target.value))} className="w-20 border rounded px-2 py-1"/>
                    <input type="date" value={p.expired_date} onChange={e=>handleExpiryDateChange(p.id, e.target.value)} className="border rounded px-2 py-1"/>
                    <button type="button" onClick={()=>handleRemoveProduct(p.id)} className="text-red-600"><FaTimes/></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
  type="submit"
  disabled={loading}
  className="bg-red-600 text-white px-6 py-2 rounded-xl hover:bg-red-700 flex items-center gap-2 transition-all duration-200"
>
  {loading ? (
    <>
      <svg
        className="animate-spin h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8z"
        ></path>
      </svg>
      Recording...
    </>
  ) : (
    <>
      <FaSave className="h-5 w-5"/>
      Record Expired Products
    </>
  )}
</button>
        </form>
      </div>
    </div>
  );
};

export default EnterExpiredProducts;
