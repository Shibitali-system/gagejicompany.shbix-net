import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useNotification } from '../../hooks/useNotification'; // adjust path kama ni tofauti
import { sendNotification } from "../utils/sendNotification";
import { FaArrowLeft, FaPlus, FaHistory, FaWarehouse, FaDollarSign } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

const ProductAddStock = () => {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const notify = useNotification();
  const [batchHistory, setBatchHistory] = useState([]);
  const [currentUser, setCurrentUser] = useState({
    name: "Unknown",
    office_name: "Unknown",
    office_id: null,
  });

  // 🔹 Fetch current user (system user or employee)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) throw new Error("User not logged in");

        // Try system user first
        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser) {
          setCurrentUser({
            name: systemUser.customer_name,
            office_name: systemUser.office_name,
            office_id: systemUser.office_id,
          });
          return;
        }

        // Then try employee
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

          setCurrentUser({
            name: employeeUser.name,
            office_name: officeData?.office_name || "Unknown Office",
            office_id: officeData?.office_id || employeeUser.office_id,
          });
          return;
        }

        toast.error("User information not found.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch current user info.");
      }
    };

    fetchCurrentUser();
  }, []);

  // 🔹 Fetch product details and batch history
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        setProduct(data);
      } catch (err) {
        setError("Failed to load product: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchBatchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("products_batches")
          .select("*")
          .eq("product_id", id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setBatchHistory(data || []);
      } catch (err) {
        console.log("Batch history error:", err.message);
      }
    };

    fetchProduct();
    fetchBatchHistory();
  }, [id]);

 // 🔹 Handle adding new stock
const handleAddStock = async (e) => {
  e.preventDefault();

  if (!quantity || !expiryDate) {
    toast.error("Please enter quantity and expiry date");
    return;
  }

  setSaving(true);

  try {
    // 🔐 Get access token for Edge Function
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("User not authenticated");

    const qty = parseInt(quantity);

    // 1️⃣ Add new batch
    const { error: batchError } = await supabase.from("products_batches").insert([
      {
        product_id: id,
        quantity: qty,
        expiry_date: expiryDate,
        entered_by: currentUser.name,
        office_name: currentUser.office_name,
      },
    ]);
    if (batchError) throw batchError;

    // 2️⃣ Update product stock and earliest expiry
    const newStock = (product.stock || 0) + qty;
    const allExpiryDates = [...batchHistory.map((b) => b.expiry_date), expiryDate];
    const earliestExpiry = allExpiryDates.reduce((earliest, date) => {
      if (!date) return earliest;
      return new Date(date) < new Date(earliest) ? date : earliest;
    }, allExpiryDates[0]);

    const { error: productError } = await supabase
      .from("products")
      .update({ stock: newStock, expiry_date: earliestExpiry })
      .eq("id", id);
    if (productError) throw productError;

    // 3️⃣ Send push notification via Edge Function
    try {
      await fetch(
        "https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/quick-handler",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`, // JWT ya user
          },
          body: JSON.stringify({
            auth_user_id: currentUser.auth_user_id,
            office_id: currentUser.office_id,
            title: "Stock Updated",
            message: `${currentUser.name} added ${qty} units to ${product.name}`,
            url: `/dashboard/products/${id}`,
          }),
        }
      );
    } catch (pushErr) {
      console.warn("🔕 Push notification failed:", pushErr);
    }

    // 4️⃣ Local / PWA notification
    notify("Stock Updated", {
      body: `${currentUser.name} added ${qty} units to ${product.name}`,
      icon: "/pwa-192.png",
      badge: "/badge-72.png",
    });

    toast.success(`✅ Added ${quantity} units successfully!`);
    setQuantity("");
    setExpiryDate("");
    setProduct({ ...product, stock: newStock, expiry_date: earliestExpiry });

    // 5️⃣ Refresh batch history
    const { data } = await supabase
      .from("products_batches")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false });
    setBatchHistory(data || []);

  } catch (err) {
    toast.error("❌ Failed to add stock: " + err.message);
    console.error(err);
  } finally {
    setSaving(false);
  }
};


// 🔴 Modern Info Card - SAME SHAPE as SummaryCard
const InfoCard = ({ title, value, icon: Icon }) => (
  <div
    className="
      bg-white border border-[#e5e7eb] rounded-[14px] 
      px-5 py-6 flex flex-col items-center justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_2px_4px_rgba(0,0,0,0.05)]
      font-sans w-full text-center
      min-h-[120px]
    "
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[12px] md:text-sm tracking-wide flex items-center gap-1">
      {Icon && <Icon className="text-[#2563EB] text-lg" />} {title}
    </p>

    <p className="text-gray-900 font-bold text-xl mt-1">{value || "-"}</p>
  </div>
);


  if (loading) return <p className="text-gray-600">Loading product...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!product) return <p className="text-gray-600">Product not found.</p>;

  return (
  <div className="min-h-screen bg-gray-50 p-6">
    <Toaster position="top-right" />

    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#2563EB] flex items-center gap-2">
          <FaPlus /> Ongeza Stoo - {product.name}
        </h1>
        <Link
          to="/dashboard/products"
          className="flex items-center gap-2 text-[#2563EB] hover:text-red-700 font-medium"
        >
          <FaArrowLeft /> Rudi kwenye Bidhaa
        </Link>
      </div>

      {/* Product Info Summary */}
      <div className="bg-red-50 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 shadow">
        <div>
          <span className="text-gray-700 font-medium">Stoo ya Sasa:</span>
          <p className="text-gray-900 font-bold">{product.stock || 0}</p>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Kundi:</span>
          <p className="text-gray-900">{product.category || "-"}</p>
        </div>
        <div>
          <span className="text-gray-700 font-medium">Kifungashio:</span>
          <p className="text-gray-900">{product.package_type || "-"}</p>
        </div>
      </div>

      {/* Add Stock Form */}
      <form
        className="bg-white p-6 rounded-2xl shadow space-y-4"
        onSubmit={handleAddStock}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-700 font-medium">Kiasi*</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="text-gray-700 font-medium">Tarehe ya Kuisha*</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2 rounded-xl hover:bg-red-600 transition ${
            saving ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <FaPlus />
          {saving ? "Inaongeza..." : "Ongeza Stoo"}
        </button>
      </form>

      {/* Batch History */}
      <div className="bg-red-50 rounded-2xl p-4 shadow">
        <h2 className="text-xl font-semibold text-red-700 mb-4 flex items-center gap-2">
          <FaHistory /> Historia ya Mafungu (Batch)
        </h2>

        {batchHistory.length === 0 ? (
          <p className="text-gray-600">Hakuna mafungu bado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#2563EB] text-white text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Namba ya Fungu</th>
                  <th className="px-3 py-2 text-left">Kiasi</th>
                  <th className="px-3 py-2 text-left">Kuisha</th>
                  <th className="px-3 py-2 text-left">Tarehe ya Kuingiza</th>
                  <th className="px-3 py-2 text-left">Aliyeingiza</th>
                  <th className="px-3 py-2 text-left">Ofisi</th>
                </tr>
              </thead>

              <tbody>
                {batchHistory.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-gray-100">
                    <td className="px-3 py-2">{b.id}</td>
                    <td className="px-3 py-2 font-semibold">{b.quantity}</td>
                    <td className="px-3 py-2">
                      {b.expiry_date
                        ? new Date(b.expiry_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {b.created_at
                        ? new Date(b.created_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2">{b.entered_by || "-"}</td>
                    <td className="px-3 py-2">{b.office_name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
);


};

export default ProductAddStock;
