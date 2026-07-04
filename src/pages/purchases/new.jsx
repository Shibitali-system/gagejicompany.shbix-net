// src/pages/purchases/NewPurchase.jsx
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from '../../../supabaseClient';
import { sendNotification } from "../utils/sendNotification";
import { useNavigate, Link } from "react-router-dom";
import { FaArrowLeft, FaTimes, FaPlus } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

const CHUNK_SIZE = 500; // chunk size for paginated fetching
const DEFAULT_DISPLAY_COUNT = 10; // show 10 products by default

const NewPurchase = () => {
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // suppliers/products
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]); // full fetched products (chunked)
  const [displayedProducts, setDisplayedProducts] = useState([]); // products shown in UI (<= DEFAULT_DISPLAY_COUNT)
  const [productsLoading, setProductsLoading] = useState(false);
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  // selection
  const [selectedProducts, setSelectedProducts] = useState([]); // { id, name, quantity, unit_price }

  // form
  const [formData, setFormData] = useState({ supplier_id: "", invoice_number: "" });
  const [submitting, setSubmitting] = useState(false);

  // search
  const [productSearch, setProductSearch] = useState("");

  // general error
  const [error, setError] = useState(null);

const [manualItem, setManualItem] = useState({
  name: "",
  category: "",
  quantity: 1,
  unit_price: 0,
});

  // --- Fetch logged-in user (systems_users OR employees) ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadingUser(true);
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        if (!authUser?.id) throw new Error("Not authenticated");

        // Try systems_users table first
        const { data: sysUser, error: sysErr } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();
        if (sysErr) throw sysErr;
        if (sysUser) {
          // Map fields (adjust if your systems_users column names differ)
          setUserInfo({
            id: sysUser.id, // your systems_users PK
            auth_user_id: authUser.id,
            name: sysUser.customer_name || sysUser.customer_name,
            role: "system",
            office_id: sysUser.office_id || sysUser.customer_registration_no || sysUser.customer_registration_no,
            office_name: sysUser.office_name || sysUser.customer_name || sysUser.customer_name,
          });
          return;
        }

        // Try employees
        const { data: emp, error: empErr } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();
        if (empErr) throw empErr;
        if (emp) {
          // try to fetch office info from systems_users using emp.office_id as key
          const { data: office } = await supabase
            .from("systems_users")
            .select("office_id, office_name, customer_registration_no, customer_name")
            .eq("office_id", emp.office_id)
            .maybeSingle();

          setUserInfo({
            id: emp.id, // employee id (likely bigint)
            auth_user_id: authUser.id,
            name: emp.name || emp.full_name || "Employee",
            role: "employee",
            office_id: emp.office_id,
            office_name: office?.office_name || office?.customer_name || emp.office_id,
          });
          return;
        }

        throw new Error("No system/employee record found for this authenticated user");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user info: " + (err.message || err));
        setError(err.message || String(err));
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // --- Chunked suppliers fetch filtered by office_id ---
  useEffect(() => {
    if (!userInfo?.office_id) return;

    const fetchSuppliersChunked = async () => {
      setSuppliersLoading(true);
      setError(null);
      try {
        let all = [];
        let offset = 0;

        while (true) {
          const { data, error } = await supabase
            .from("suppliers")
            .select("*")
            .eq("office_id", userInfo.office_id)
            .order("name", { ascending: true })
            .range(offset, offset + CHUNK_SIZE - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;

          all = [...all, ...data];
          offset += CHUNK_SIZE;
        }

        setSuppliers(all);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch suppliers: " + (err.message || err));
        toast.error("Failed to fetch suppliers");
      } finally {
        setSuppliersLoading(false);
      }
    };

    fetchSuppliersChunked();
  }, [userInfo?.office_id]);

  // --- Chunked products fetch filtered by office_id ---
  // We fetch all products in chunks (to avoid 1000 row limit). Then we manage displayedProducts (<= DEFAULT_DISPLAY_COUNT)
  useEffect(() => {
    if (!userInfo?.office_id) return;

    const fetchProductsChunked = async () => {
      setProductsLoading(true);
      setError(null);
      try {
        let all = [];
        let offset = 0;
        while (true) {
          const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("office_id", userInfo.office_id)
            .order("name", { ascending: true })
            .range(offset, offset + CHUNK_SIZE - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;

          all = [...all, ...data];
          offset += CHUNK_SIZE;
        }
        setProducts(all);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch products: " + (err.message || err));
        toast.error("Failed to fetch products");
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProductsChunked();
  }, [userInfo?.office_id]);

  // --- Determine displayedProducts (priority to search matches) ---
  useEffect(() => {
    // If no products loaded yet, nothing to display
    if (!products || products.length === 0) {
      setDisplayedProducts([]);
      return;
    }

    const normalizedSearch = (productSearch || "").trim().toLowerCase();

    if (!normalizedSearch) {
      // default: first DEFAULT_DISPLAY_COUNT products (already ordered by name)
      setDisplayedProducts(products.slice(0, DEFAULT_DISPLAY_COUNT));
      return;
    }

    // find matches (by name). Put matches first (sorted by how early they match), then fill with non-matching to reach DEFAULT_DISPLAY_COUNT
    const matches = [];
    const nonMatches = [];

    for (const p of products) {
      const name = (p.name || "").toLowerCase();
      if (name.includes(normalizedSearch)) matches.push(p);
      else nonMatches.push(p);
      if (matches.length >= DEFAULT_DISPLAY_COUNT) break; // enough matches
    }

    // build final list: take up to DEFAULT_DISPLAY_COUNT from matches, then fill with nonMatches
    const final = matches.slice(0, DEFAULT_DISPLAY_COUNT);
    if (final.length < DEFAULT_DISPLAY_COUNT) {
      // append from nonMatches (but keep overall order stable)
      const needed = DEFAULT_DISPLAY_COUNT - final.length;
      final.push(...nonMatches.slice(0, needed));
    }

    setDisplayedProducts(final);
  }, [products, productSearch]);

  // --- Selection handlers (checkbox) ---
  const toggleSelectProduct = (product) => {
    setSelectedProducts((prev) => {
      const found = prev.find((p) => p.id === product.id);
      if (found) {
        // remove
        return prev.filter((p) => p.id !== product.id);
      } else {
        // add with defaults
        return [...prev, { id: product.id, name: product.name, quantity: 1, unit_price: Number(product.price || product.purchase_price || 0) }];
      }
    });
  };

const addManualItem = () => {
  if (!manualItem.name.trim()) {
    toast.error("Weka jina la item");
    return;
  }

  setSelectedProducts((prev) => [
    ...prev,
    {
      id: `manual-${Date.now()}`,
      product_id: null,
      item_source: "manual",
      name: manualItem.name,
      category: manualItem.category,
      quantity: Number(manualItem.quantity),
      unit_price: Number(manualItem.unit_price),
    },
  ]);

  setManualItem({
    name: "",
    category: "",
    quantity: 1,
    unit_price: 0,
  });

  toast.success("Item imeongezwa");
};

  const updateQuantity = (prodId, qty) => {
    setSelectedProducts((prev) => prev.map((p) => (p.id === prodId ? { ...p, quantity: Number(qty) } : p)));
  };

  const updateUnitPrice = (prodId, price) => {
    setSelectedProducts((prev) => prev.map((p) => (p.id === prodId ? { ...p, unit_price: Number(price) } : p)));
  };

  const removeSelected = (prodId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== prodId));
  };

 // --- Form submit (create purchase + items) with notifications ---
const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);

  if (!formData.supplier_id) {
    toast.error("Supplier is required");
    return;
  }
  if (!formData.invoice_number) {
    toast.error("Invoice number is required");
    return;
  }
  if (!selectedProducts || selectedProducts.length === 0) {
    toast.error("Please select at least one product");
    return;
  }
  if (!userInfo) {
    toast.error("User info not loaded");
    return;
  }

  setSubmitting(true);
  try {
    const total_amount = selectedProducts.reduce(
      (sum, p) => sum + (Number(p.quantity) * Number(p.unit_price || 0)),
      0
    );

    // 1️⃣ Insert purchase
    const { data: purchaseData, error: purchaseError } = await supabase
      .from("purchases")
      .insert([{
        supplier_id: Number(formData.supplier_id),
        invoice_number: formData.invoice_number,
        total_amount,
        created_by: userInfo.id,
        office_id: userInfo.office_id,
        office_name: userInfo.office_name,
      }])
      .select()
      .maybeSingle();

    if (purchaseError) throw purchaseError;
    if (!purchaseData?.id) throw new Error("Purchase insert failed");

    const itemsPayload = selectedProducts.map((p) => ({
  purchase_id: purchaseData.id,

  product_id:
    p.item_source === "manual"
      ? null
      : p.id,

  item_source:
    p.item_source || "product",

  manual_item_name:
    p.item_source === "manual"
      ? p.name
      : null,

  manual_item_category:
    p.item_source === "manual"
      ? p.category
      : null,

  quantity: p.quantity,
  unit_price: p.unit_price,
}));

    const { error: itemsError } = await supabase
      .from("purchase_items")
      .insert(itemsPayload);

    if (itemsError) throw itemsError;

   

    toast.success("Purchase created successfully!");
    // reset form
    setFormData({ supplier_id: "", invoice_number: "" });
    setSelectedProducts([]);

  } catch (err) {
    console.error(err);
    toast.error("Failed to create purchase: " + (err.message || err));
    setError(err.message || String(err));
  } finally {
    setSubmitting(false);
  }
};

// ---------------------- Summary Card Component ----------------------
const SummaryCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-center justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
  </div>
);


  // small helper to see if product is selected
  const isProductSelected = (prodId) => selectedProducts.some((p) => p.id === prodId);

  // --- UI ---
  if (loadingUser) {
    return <p className="p-6 text-gray-600">Loading user info...</p>;
  }

 return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-4xl mx-auto flex flex-col gap-3">

      {/* ⭐️ ANZA FORM */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        {/* ---------------- Kadi 1: Kichwa, Maelezo, Rudi Nyuma ---------------- */}
        <div className="bg-white border border-[#e5e7eb] rounded-md shadow p-4 flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#2563EB]">Ongeza Manunuzi Mpya</h1>
          <p className="text-gray-700 text-sm">
            Jaza supplier, namba ya vocha (Invoice), na chagua bidhaa. Rekebisha idadi na bei kabla ya kuhifadhi.
          </p>
          <Link to="../purchases" className="flex items-center gap-2 text-[#2563EB] hover:underline font-medium mt-1 text-sm">
            <FaArrowLeft /> Rudi kwenye Manunuzi
          </Link>
        </div>

        {/* ---------------- Kadi 2: Supplier & Invoice ---------------- */}
        <div className="bg-white border border-[#e5e7eb] rounded-md shadow p-4 flex flex-col gap-2">
          <div>
            <label className="block font-medium mb-1 text-sm">Supplier *</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full border border-gray-300 px-2 py-1 rounded text-sm"
            >
              <option value="">-- Chagua supplier --</option>
              {suppliersLoading ? (
                <option>Inapakia suppliers...</option>
              ) : (
                suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
              )}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1 text-sm">Namba ya Invoice *</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              className="w-full border border-gray-300 px-2 py-1 rounded text-sm"
            />
          </div>
        </div>

        {/* ---------------- Kadi 3: Kutafuta Bidhaa & Maelezo ---------------- */}
        <div className="bg-white border border-[#e5e7eb] rounded-md shadow p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between mb-1">
            <label className="block font-medium text-sm">Bidhaa</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Tafuta bidhaa..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="border px-2 py-1 rounded text-sm w-60"
              />
              <span className="text-xs text-gray-500">{products.length} zipo</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {productsLoading ? (
              <div className="p-2 text-gray-500 text-sm">Inapakia bidhaa...</div>
            ) : displayedProducts.length === 0 ? (
              <div className="p-2 text-gray-500 text-sm">Hakuna bidhaa zilizopatikana.</div>
            ) : (
              displayedProducts.map((p) => {
                const selected = isProductSelected(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 border rounded-md px-2 py-1 hover:bg-gray-50 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelectProduct(p)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        Bei: {(p.price || p.purchase_price || 0).toLocaleString()} — Hali ya Hifadhi: {p.stock ?? 0}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">{p.package_type || ""}</div>
                  </label>
                );
              })
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Kidokezo: Tumia search kupata bidhaa haraka.</p>
        </div>

<div className="bg-white border border-[#e5e7eb] rounded-md shadow p-4">
  <h3 className="font-semibold mb-3">
    Ongeza Manunuzi hapa ambayo hayapo kwenye Orodha ya bidhaa hapo juu
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

    {/* Jina la Item */}
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        Jina la Item *
      </label>
      <input
        type="text"
        placeholder="Mfano: Citric Acid"
        value={manualItem.name}
        onChange={(e) =>
          setManualItem({
            ...manualItem,
            name: e.target.value,
          })
        }
        className="border rounded px-2 py-2 text-sm"
      />
    </div>

    {/* Category */}
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        Kundi (Category)
      </label>
      <input
        type="text"
        placeholder="Mfano: Chemicals"
        value={manualItem.category}
        onChange={(e) =>
          setManualItem({
            ...manualItem,
            category: e.target.value,
          })
        }
        className="border rounded px-2 py-2 text-sm"
      />
    </div>

    {/* Quantity */}
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        Idadi *
      </label>
      <input
        type="number"
        min="1"
        placeholder="0"
        value={manualItem.quantity}
        onChange={(e) =>
          setManualItem({
            ...manualItem,
            quantity: e.target.value,
          })
        }
        className="border rounded px-2 py-2 text-sm"
      />
    </div>

    {/* Unit Price */}
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        Bei ya Kimoja *
      </label>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={manualItem.unit_price}
        onChange={(e) =>
          setManualItem({
            ...manualItem,
            unit_price: e.target.value,
          })
        }
        className="border rounded px-2 py-2 text-sm"
      />
    </div>

  </div>

  <button
    type="button"
    onClick={addManualItem}
    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
  >
    Ongeza Item
  </button>
</div>

        {/* ---------------- Kadi 4: Jedwali la Bidhaa Zilizochaguliwa ---------------- */}
        {selectedProducts.length > 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-md shadow p-2 overflow-x-auto text-sm">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-1 border text-left">Bidhaa</th>
                  <th className="px-3 py-1 border">Idadi</th>
                  <th className="px-3 py-1 border">Bei ya Kila Moja</th>
                  <th className="px-3 py-1 border">Jumla</th>
                  <th className="px-3 py-1 border">Ondoa</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-1 border">{s.name}</td>
                    <td className="px-3 py-1 border text-center">
                      <input
                        type="number"
                        min="1"
                        value={s.quantity}
                        onChange={(e) => updateQuantity(s.id, e.target.value)}
                        className="w-16 border px-1 py-1 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-1 border text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={s.unit_price}
                        onChange={(e) => updateUnitPrice(s.id, e.target.value)}
                        className="w-20 border px-1 py-1 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-1 border text-right">
                      {(s.quantity * s.unit_price).toLocaleString()}
                    </td>
                    <td className="px-3 py-1 border text-center">
                      <button
                        type="button"
                        onClick={() => removeSelected(s.id)}
                        className="text-[#2563EB] hover:underline text-sm"
                      >
                        Ondoa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-3 py-1 border text-right" colSpan={3}>
                    Jumla Kuu
                  </td>
                  <td className="px-3 py-1 border text-right">
                    {selectedProducts
                      .reduce((a, p) => a + p.quantity * p.unit_price, 0)
                      .toLocaleString()}
                  </td>
                  <td className="px-3 py-1 border"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ---------------- Kadi 5: Info ya Ofisi & Vitendo ---------------- */}
        <div className="bg-white border border-[#e5e7eb] rounded-md shadow p-3 flex flex-col gap-2">
          {userInfo && (
            <div className="text-sm text-gray-700">
              <p><strong>Ofisi:</strong> {userInfo.office_name}</p>
              <p><strong>Imeingizwa na:</strong> {userInfo.name}</p>
            </div>
          )}

          <div className="flex gap-2">
            {/* BUTTON YA KUHIFADHI */}
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#2563EB] text-white rounded-md shadow px-4 py-2 hover:bg-red-600 flex items-center gap-2 text-sm font-medium"
            >
              <FaPlus /> {submitting ? "Inahifadhi..." : "Hifadhi Manunuzi"}
            </button>

            <Link
              to="/dashboard/purchases"
              className="bg-white border border-[#e5e7eb] rounded-md shadow px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <FaTimes /> Ghairi
            </Link>
          </div>
        </div>

        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
      </form>
      {/* ⭐️ MWISHO FORM */}

    </div>
  </div>
);


};

export default NewPurchase;
