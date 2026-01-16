// src/pages/purchases/EditPurchase.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaArrowLeft, FaSave, FaTimes } from "react-icons/fa";

// -----------------------------
  // Card components
  // -----------------------------
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
      <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#ef4444]"}`}>{value}</p>
    </div>
  );

  const CustomCard = ({ title, children }) => (
    <div className={`
        bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
        flex flex-col items-start justify-center
        transition-all duration-200
        hover:bg-[#fdfdfd]
        transform hover:-translate-y-[2px] active:translate-y-[1px]
        shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
        font-sans
        w-full
    `}>
      {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
      {children}
    </div>
  );


const DEFAULT_DISPLAY_COUNT = 10;

const EditPurchase = () => {
  const { id } = useParams(); // purchase ID

  const [purchase, setPurchase] = useState(null);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [formData, setFormData] = useState({ supplier_id: "", invoice_number: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [sellerInfo, setSellerInfo] = useState(null);

  // -----------------------------
  // Fetch logged-in user
  // -----------------------------
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authUser?.id) throw new Error("Not authenticated");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) {
          setSellerInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            role: "system",
            office_id: systemUser.office_id,
            office_name: systemUser.office_name,
          });
          return;
        }

        const { data: employeeUser } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employeeUser) {
          const { data: officeData } = await supabase
            .from("systems_users")
            .select("office_id, office_name")
            .eq("office_id", employeeUser.office_id)
            .maybeSingle();

          setSellerInfo({
            id: employeeUser.id,
            name: employeeUser.name,
            role: "employee",
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
          return;
        }

        toast.error("Seller information not found");
      } catch (err) {
        console.error("Fetch user error:", err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  // -----------------------------
  // Fetch purchase, items, suppliers, products
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);

      try {
        console.log("Fetching purchase for id:", id);

        // Fetch purchase
        const { data: purchaseData, error: purchaseError } = await supabase
          .from("purchases")
          .select(`*, suppliers(name, contact_person, phone, email)`)
          .eq("id", id)
          .single();

        if (purchaseError) throw purchaseError;
        if (!purchaseData) throw new Error("Purchase not found");

        setPurchase(purchaseData);
        setFormData({
          supplier_id: purchaseData.supplier_id,
          invoice_number: purchaseData.invoice_number,
        });

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from("purchase_items")
          .select(`*, products(name)`)
          .eq("purchase_id", id);

        if (itemsError) throw itemsError;

        setItems(itemsData || []);

        // Preselect products
        const preselected = (itemsData || []).map((i) => ({
          id: i.product_id,
          name: i.products?.name || "-",
          quantity: i.quantity,
          unit_price: i.unit_price,
        }));
        setSelectedProducts(preselected);

        // Fetch suppliers
        const { data: suppliersData } = await supabase
          .from("suppliers")
          .select("*")
          .order("name", { ascending: true });
        setSuppliers(suppliersData || []);

        // Fetch products
        const { data: productsData } = await supabase
          .from("products")
          .select("*")
          .order("name", { ascending: true });
        setProducts(productsData || []);
        setDisplayedProducts((productsData || []).slice(0, DEFAULT_DISPLAY_COUNT));

      } catch (err) {
        console.error("FetchData error:", err);
        toast.error("Failed to load purchase: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // -----------------------------
  // Product search/filter
  // -----------------------------
  useEffect(() => {
    if (!products) return;
    const normalizedSearch = (productSearch || "").trim().toLowerCase();
    if (!normalizedSearch) {
      setDisplayedProducts(products.slice(0, DEFAULT_DISPLAY_COUNT));
      return;
    }
    const matches = products.filter((p) => (p.name || "").toLowerCase().includes(normalizedSearch));
    setDisplayedProducts(matches.slice(0, DEFAULT_DISPLAY_COUNT));
  }, [productSearch, products]);

  // -----------------------------
  // Product selection handlers
  // -----------------------------
  const toggleSelectProduct = (product) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      return [...prev, { id: product.id, name: product.name, quantity: 1, unit_price: Number(product.purchase_price || 0) }];
    });
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
  const isProductSelected = (prodId) => selectedProducts.some((p) => p.id === prodId);

  // -----------------------------
  // Submit handler
  // -----------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier_id || !formData.invoice_number || selectedProducts.length === 0) {
      toast.error("Supplier, Invoice and at least one product are required.");
      return;
    }

    if (!sellerInfo?.id) {
      toast.error("User info not loaded yet.");
      return;
    }

    setSubmitting(true);

    try {
      const total_amount = selectedProducts.reduce(
        (sum, p) => sum + p.quantity * p.unit_price,
        0
      );

      // Fetch current purchase + items
      const { data: currentPurchase } = await supabase
        .from("purchases")
        .select("*")
        .eq("id", id)
        .single();

      const { data: currentItems } = await supabase
        .from("purchase_items")
        .select("*")
        .eq("purchase_id", id);

      // Save history
      await supabase.from("purchase_history").insert([{
        purchase_id: id,
        supplier_id: currentPurchase.supplier_id,
        invoice_number: currentPurchase.invoice_number,
        total_amount: currentPurchase.total_amount ?? 0,
        items: JSON.stringify(currentItems),
        edited_by: sellerInfo.id,
        edited_by_name: sellerInfo.name || sellerInfo.email,
        edited_at: new Date().toISOString(),
      }]);

      // Update purchase
      await supabase
        .from("purchases")
        .update({
          supplier_id: formData.supplier_id,
          invoice_number: formData.invoice_number,
          total_amount,
        })
        .eq("id", id);

      // Delete old items
      await supabase
        .from("purchase_items")
        .delete()
        .eq("purchase_id", id);

      // Insert updated items
      const itemsPayload = selectedProducts.map((p) => ({
        purchase_id: id,
        product_id: p.id,
        quantity: p.quantity,
        unit_price: p.unit_price,
      }));
      await supabase.from("purchase_items").insert(itemsPayload);

      toast.success("Purchase updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update purchase: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = selectedProducts.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);

  // -----------------------------
  // Loading or not found UI
  // -----------------------------
  if (loading) return <p className="p-6 text-gray-600 animate-pulse">Loading purchase...</p>;
  if (!purchase) return <p className="p-6 text-red-600">Purchase not found.</p>;

  
  return (
  <div className="min-h-screen p-3 sm:p-6 bg-gray-50 font-sans">
    <Toaster position="top-right" />

    <div className="max-w-4xl mx-auto flex flex-col gap-4">

      {/* HEADER CARD */}
      <CustomCard>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Link
            to={`../purchases/${id}`}
            className="flex items-center gap-2 text-[#2563EB] font-semibold hover:underline"
          >
            <FaArrowLeft /> Rudi
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2563EB]">
            Hariri Manunuzi
          </h1>
        </div>
      </CustomCard>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* SUPPLIER & INVOICE */}
        <CustomCard title="Muuzaji na Ankara">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Muuzaji *</label>
              <select
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_id: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">-- Chagua muuzaji --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Namba ya Ankara *</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_number: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>
        </CustomCard>

        {/* PRODUCTS */}
        <CustomCard title="Chagua Bidhaa">
          <input
            type="text"
            placeholder="Tafuta bidhaa..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="border px-3 py-2 rounded w-full sm:w-64 mb-3"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayedProducts.map((p) => (
              <label
                key={p.id}
                className="flex gap-3 border rounded px-3 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={isProductSelected(p.id)}
                  onChange={() => toggleSelectProduct(p)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    Bei: {(p.price || p.purchase_price || 0).toLocaleString()} —
                    Stoo: {p.stock ?? 0}
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  {p.package_type || ""}
                </div>
              </label>
            ))}
          </div>
        </CustomCard>

        {/* SELECTED PRODUCTS */}
        {selectedProducts.length > 0 && (
          <CustomCard title="Bidhaa Zilizochaguliwa">
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-2 text-left">Bidhaa</th>
                    <th className="border px-2 py-2">Kiasi</th>
                    <th className="border px-2 py-2">Bei ya Kipimo</th>
                    <th className="border px-2 py-2">Jumla</th>
                    <th className="border px-2 py-2">Ondoa</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map((s) => (
                    <tr key={s.id}>
                      <td className="border px-2 py-2">{s.name}</td>

                      <td className="border px-2 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={s.quantity}
                          onChange={(e) =>
                            updateQuantity(s.id, e.target.value)
                          }
                          className="w-20 border rounded px-2 py-1"
                        />
                      </td>

                      <td className="border px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={s.unit_price}
                          onChange={(e) =>
                            updateUnitPrice(s.id, e.target.value)
                          }
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>

                      <td className="border px-2 py-2 text-right">
                        {(s.quantity * s.unit_price).toLocaleString()}
                      </td>

                      <td className="border px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeSelected(s.id)}
                          className="text-red-600 hover:underline"
                        >
                          Ondoa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={3} className="border px-2 py-2 text-right">
                      Jumla Kuu
                    </td>
                    <td className="border px-2 py-2 text-right">
                      {totalAmount.toLocaleString()}
                    </td>
                    <td className="border px-2 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CustomCard>
        )}

        {/* ACTIONS */}
        <CustomCard>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#2563EB] text-white px-6 py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700"
            >
              <FaSave />
              {submitting ? "Inahifadhi..." : "Hifadhi Mabadiliko"}
            </button>

            <Link
              to={`../purchases/${id}`}
              className="bg-gray-200 px-6 py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-300"
            >
              <FaTimes /> Ghairi
            </Link>
          </div>
        </CustomCard>

      </form>
    </div>
  </div>
);

};

export default EditPurchase;
