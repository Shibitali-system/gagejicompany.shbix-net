import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from '../../../supabaseClient';
import { sendNotification } from "../utils/sendNotification";
import { FaPlus, FaTimes, FaArrowLeft, FaSave } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">
      {title}
    </p>
    <div className="w-full">{children}</div>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-2 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">
        {title}
      </p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

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
        expired_date: p.expired_date || new Date().toISOString().slice(0, 10),
        office_id: sellerInfo.office_id,
        office_name: sellerInfo.office_name,
        entered_by: sellerInfo.id
      }));

      // 1️⃣ Insert expired products
      const { error: insertError } = await supabase
        .from("expired_products")
        .insert(expiredData);

      if (insertError) throw insertError;

      // 2️⃣ Update stock
      for (let p of selectedProducts) {
        const newStock = (p.stock || 0) - (p.quantity || 0);
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: newStock < 0 ? 0 : newStock })
          .eq("id", p.id);
        if (updateError) console.error(`Failed to update stock for ${p.name}:`, updateError);
      }

      // 🌟 3️⃣ SEND NOTIFICATION (IN-APP + PUSH)
      await sendNotification({
        auth_user_id: sellerInfo.id,
        office_id: sellerInfo.office_id,
        title: "Expired Products Recorded",
        message: `${selectedProducts.length} expired products were recorded by ${sellerInfo.name}.`,
        link: "/pharmacy/dashboard/expired",
        type: "both" // in-app + push
      });

      // Browser notification (optional)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Expired Products Recorded", {
          body: `${selectedProducts.length} expired products recorded by ${sellerInfo.name}`,
        });
      } else if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
      }

      toast.success("Expired products saved ✔ Notifications sent!");

      // Clear selected products
      setSelectedProducts([]);

      // Update local products UI
      const updatedProducts = products.map(p => {
        const selected = selectedProducts.find(sp => sp.id === p.id);
        if (selected) return { ...p, stock: (p.stock || 0) - selected.quantity };
        return p;
      });
      setProducts(updatedProducts);

    } catch (err) {
      toast.error("Failed to record expired products: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

 return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right"/>
    <div className="max-w-5xl mx-auto space-y-4">
      
      {/* Kadi 1: Kichwa + Maelekezo */}
      <CustomCard>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
          <Link to="../expired" className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline">
            <FaArrowLeft /> Rudi kwenye Bidhaa
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] mt-2 sm:mt-0">Weka bidhaa zilioisha muda</h1>
        </div>
        <p className="text-gray-600 text-sm">
          Tafuta na chagua bidhaa hapo chini, kisha weka kiasi na tarehe ya kuisha ili kurekodi.
        </p>
      </CustomCard>

      {/* Kadi 2: Tafuta + Kategoria + Orodha ya Bidhaa */}
      <CustomCard title="Tafuta & Bidhaa">
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <input
            type="text"
            placeholder="Tafuta bidhaa..."
            value={productSearch}
            onChange={e=>setProductSearch(e.target.value)}
            className="flex-1 border border-[#e5e7eb] px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          <select
            value={selectedCategory}
            onChange={e=>setSelectedCategory(e.target.value)}
            className="border border-[#e5e7eb] px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="">Kategoria Zote</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-[#e5e7eb] p-2 rounded">
          {loading ? (
            <div className="p-2 text-gray-500">Inapakia bidhaa...</div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map(p => (
              <div
                key={p.id}
                className="flex justify-between items-center p-2 border border-[#e5e7eb] rounded cursor-pointer hover:bg-red-50"
                onClick={()=>handleAddProduct(p)}
              >
                {p.name} - {p.price.toLocaleString()} TZS (Hifadhi: {p.stock})
                <FaPlus className="text-[#2563EB]"/>
              </div>
            ))
          ) : (
            <div className="p-2 text-gray-500">Hakuna bidhaa inayofanana</div>
          )}
        </div>
      </CustomCard>

      {/* Kadi 3: Bidhaa Zilizochaguliwa + Weka Rekodi */}
      {selectedProducts.length > 0 && (
        <CustomCard title="Bidhaa Zilizochaguliwa">
          {selectedProducts.map(p => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center border border-[#e5e7eb] p-2 rounded gap-2 sm:gap-0 mb-2"
            >
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-gray-500">Hifadhi: {p.stock}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={p.stock}
                  value={p.quantity}
                  onChange={e=>handleQuantityChange(p.id, parseInt(e.target.value))}
                  className="w-20 border border-[#e5e7eb] rounded px-2 py-1"
                />
                <input
                  type="date"
                  value={p.expired_date}
                  onChange={e=>handleExpiryDateChange(p.id, e.target.value)}
                  className="border border-[#e5e7eb] rounded px-2 py-1"
                />
                <button
                  type="button"
                  onClick={()=>handleRemoveProduct(p.id)}
                  className="text-[#2563EB]"
                >
                  <FaTimes/>
                </button>
              </div>
            </div>
          ))}

          {/* Kitufe cha Weka Rekodi */}
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="bg-[#2563EB] text-white px-6 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2 transition-all duration-200 mt-2"
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
                Inarekodiwa...
              </>
            ) : (
              <>
                <FaSave className="h-5 w-5"/>
                Rekodi Bidhaa Zilizopotea Uhai
              </>
            )}
          </button>
        </CustomCard>
      )}

    </div>
  </div>
);

};

export default EnterExpiredProducts;
