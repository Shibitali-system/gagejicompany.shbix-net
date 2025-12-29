import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../../supabaseClient";
import { sendNotification } from "../../utils/sendNotification";
import { FaPlus, FaTimes, FaSearch, FaUserPlus, FaUserSlash, FaArrowLeft } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

const NewProformer = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [discountType, setDiscountType] = useState("none");
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: "", email: "", phone: "", address: "", type: "hospital" });
  const [proformerDateTime, setProformerDateTime] = useState(new Date().toISOString().slice(0, 16));

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
            id: systemUser.id, // UUID
            name: systemUser.customer_name,
            type: "system",
            office_id: systemUser.office_id, // text
            office_name: systemUser.office_name,
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
            id: employeeUser.id, // UUID
            name: employeeUser.name,
            type: "employee",
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
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

  // --- Fetch all data in batches ---
  const fetchAllFromTable = async (table) => {
    const batchSize = 1000;
    let results = [];
    let offset = 0;
    let fetched;
    do {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      fetched = data || [];
      results = [...results, ...fetched];
      offset += batchSize;
    } while (fetched.length === batchSize);
    return results;
  };

  useEffect(() => {
  const fetchData = async () => {
    try {
      const [allCustomers, allProducts] = await Promise.all([
        fetchAllFromTable("customers"),
        fetchAllFromTable("products"),
      ]);

      // Filter customers by seller's office
      const officeCustomers = sellerInfo?.office_id
        ? allCustomers.filter(c => c.office_id === sellerInfo.office_id)
        : allCustomers;
      setCustomers(officeCustomers);

      // Filter products by seller's office
      const officeProducts = sellerInfo?.office_id
        ? allProducts.filter(p => p.office_id === sellerInfo.office_id)
        : allProducts;
      setProducts(officeProducts);

      // Extract categories from filtered products
      setCategories(Array.from(new Set(officeProducts.map(p => p.category))).filter(Boolean));
    } catch (err) {
      toast.error("Failed to fetch data: " + err.message);
    }
  };

  if (sellerInfo) fetchData();
}, [sellerInfo]);


  // --- Customer actions ---
  const generateCustomerID = () => `SHBI${Math.floor(100000000 + Math.random() * 900000000)}`;
  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    if (c) setCustomerSearch(c.name);
  };

  const handleCreateCustomer = async (autoName = false) => {
  try {
    const nameToUse = autoName ? generateCustomerID() : newCustomerData.name;
    if (!nameToUse) return toast.error("Customer name is required");

    const newCustomer = {
      ...newCustomerData,
      name: nameToUse,
      office_id: sellerInfo?.office_id || null,
      office_name: sellerInfo?.office_name || null,
      created_by: sellerInfo?.id || null, // ✅ UUID ya seller
    };

    const { data, error } = await supabase
      .from("customers")
      .insert([newCustomer])
      .select()
      .maybeSingle();

    if (error) return toast.error("Failed to create customer: " + error.message);

    setSelectedCustomer(data);
    setCustomerSearch(data.name);
    setCustomers((prev) => [...prev, data]);
    setShowCustomerForm(false);
    setNewCustomerData({ name: "", email: "", phone: "", address: "", type: "Biashara" });
    toast.success("Customer created successfully");
  } catch (err) {
    toast.error(err.message);
  }
};



  // --- Product actions ---
  const handleAddProduct = (product) => {
    if (selectedProducts.find((p) => p.id === product.id))
      return toast.error("Product already selected");
    setSelectedProducts([...selectedProducts, { ...product, quantity: 1, discount: 0 }]);
  };

  const handleRemoveProduct = (id) =>
    setSelectedProducts(selectedProducts.filter((p) => p.id !== id));

  const handleQuantityChange = (id, qty) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id === id ? { ...p, quantity: qty > p.stock ? p.stock : qty } : p
      )
    );
  };

  const handleProductDiscountChange = (id, discount) =>
    setSelectedProducts(
      selectedProducts.map((p) => (p.id === id ? { ...p, discount } : p))
    );

  // --- Filters ---
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
          (selectedCategory ? p.category === selectedCategory : true)
      )
      .slice(0, 3);
  }, [products, productSearch, selectedCategory]);

  const filteredCustomers = useMemo(
  () =>
    customers
      .filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
      .slice(0, 5), // maybe show more
  [customers, customerSearch]
);


  // --- Totals ---
  const subtotal = useMemo(
    () => selectedProducts.reduce((sum, p) => sum + p.price * (p.quantity || 0), 0),
    [selectedProducts]
  );
  const productDiscountTotal = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, p) =>
          sum + (p.price * (p.quantity || 0) * (p.discount || 0)) / 100,
        0
      ),
    [selectedProducts]
  );
  const grandTotal = useMemo(() => {
    let total = subtotal;
    if (discountType === "product") total -= productDiscountTotal;
    if (discountType === "total") total -= totalDiscount;
    return total;
  }, [subtotal, discountType, productDiscountTotal, totalDiscount]);

  // --- Submit Proformer with notifications ---
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!selectedCustomer) return toast.error("Please select or create a customer");
  if (selectedProducts.length === 0) return toast.error("Please select at least one product");
  if (!sellerInfo) return toast.error("Seller info not loaded");

  for (const p of selectedProducts)
    if (p.quantity > p.stock) return toast.error(`Stock insufficient for ${p.name}`);

  setLoading(true);
  try {
    // 1️⃣ Insert proformer
    const { data: proformerData, error: proformerError } = await supabase
      .from("proformer")
      .insert([
        {
          customer_id: selectedCustomer.id,
          seller_id: sellerInfo.id,
          seller_type: sellerInfo.type,
          office_id: String(sellerInfo.office_id),
          office_name: sellerInfo.office_name,
          total_amount: grandTotal,
          discount_type: discountType,
          discount_value: discountType === "total" ? totalDiscount : productDiscountTotal,
          comment,
          created_at: new Date(proformerDateTime).toISOString(),
        },
      ])
      .select()
      .maybeSingle();

    if (proformerError) throw proformerError;

    // 2️⃣ Insert proformer items
    const itemsData = selectedProducts.map((p) => ({
      proformer_id: proformerData.id,
      product_id: p.id,
      quantity: p.quantity,
      price: p.price,
      discount: discountType === "product" ? p.discount : 0,
    }));

    const { error: itemsError } = await supabase
      .from("proformer_items")
      .insert(itemsData);
    if (itemsError) throw itemsError;

    // 3️⃣ Send notifications
    const productList = selectedProducts.map(p => `${p.quantity} x ${p.name}`).join(", ");

    await sendNotification({
      auth_user_id: sellerInfo.id,
      office_id: sellerInfo.office_id,
      title: "New Proformer Recorded",
      message: `${sellerInfo.name} recorded a new proformer for ${selectedCustomer.name}: ${productList}`,
      link: "/pharmacy/dashboard/proformers", // link to proformers page
      type: "both", // in-app + push
    });

    // 4️⃣ Browser notification
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("New Proformer Recorded", {
          body: `${sellerInfo.name} recorded a new proformer for ${selectedCustomer.name}`,
        });
      } else if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }

    toast.success("Proformer recorded successfully 🎉");

    // Reset form
    setSelectedCustomer(null);
    setCustomerSearch("");
    setSelectedProducts([]);
    setDiscountType("none");
    setTotalDiscount(0);
    setComment("");
    setShowCustomerForm(false);
    setNewCustomerData({ name: "", email: "", phone: "", address: "", type: "hospital" });
    setProformerDateTime(new Date().toISOString().slice(0, 16));

  } catch (err) {
    toast.error("Failed to record proformer: " + err.message);
    console.error(err);
  } finally {
    setLoading(false);
  }
};

// ---------------------- Summary Card Component ----------------------
const SummaryCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4
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

return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 font-sans">
    <Toaster position="top-right" />
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Kadi ya Kichwa */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      flex flex-col md:flex-row justify-between items-start md:items-center gap-4
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB]">Unda Proformer Mpya</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tumia fomu hii kuunda proformer mpya. Jaza taarifa za mteja, ongeza bidhaa, tumia punguzo, na weka maelezo ya malipo kabla ya kuhifadhi.
          </p>
        </div>
        <Link to="../sales/proformer" className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline">
          <FaArrowLeft /> Rudi kwenye Orodha ya Proformers
        </Link>
      </div>

      {/* Kadi ya Fomu ya Proformer */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-5 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Tarehe */}
          <div>
            <label className="block font-semibold mb-1">Tarehe & Saa</label>
            <input
              type="datetime-local"
              value={proformerDateTime}
              onChange={(e) => setProformerDateTime(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded w-full focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          {/* Utafutaji & Vitendo vya Mteja */}
          <div className="flex flex-col gap-2">
            <label className="block font-semibold mb-1">Mteja</label>
            <input
              type="text"
              placeholder="Tafuta au andika mteja mpya..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setSelectedCustomer(null);
              }}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB]"
            />

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold"
                onClick={() => setShowCustomerForm(true)}
              >
                <FaUserPlus /> Unda Mteja
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-gray-200 text-[#2563EB] hover:bg-gray-300 px-4 py-2 rounded-xl font-semibold"
                onClick={() => handleCreateCustomer(true)}
              >
                <FaUserSlash /> Hakuna Jina la Mteja
              </button>
            </div>

            {customerSearch && (
              <div className="border rounded mt-1 max-h-32 overflow-y-auto bg-white">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 cursor-pointer hover:bg-[#ffe5e5]"
                    onClick={() => handleSelectCustomer(c)}
                  >
                    {c.name}
                  </div>
                ))}
                {!filteredCustomers.length && (
                  <div className="p-2 text-gray-500">Hakuna mteja anayefanana</div>
                )}
              </div>
            )}
          </div>

          {/* Fomu ya Mteja Mpya */}
          {showCustomerForm && (
            <div className="border p-3 rounded bg-gray-50 space-y-2 mt-2">
              <div>
                <label className="block font-medium mb-1">Jina *</label>
                <input
                  type="text"
                  value={newCustomerData.name}
                  onChange={(e) =>
                    setNewCustomerData({ ...newCustomerData, name: e.target.value })
                  }
                  className="w-full border px-2 py-1 rounded focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Ingiza jina la mteja"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Email <span className="text-gray-500">(hiari)</span></label>
                <input
                  type="email"
                  value={newCustomerData.email}
                  onChange={(e) =>
                    setNewCustomerData({ ...newCustomerData, email: e.target.value })
                  }
                  className="w-full border px-2 py-1 rounded focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Ingiza email"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Simu <span className="text-gray-500">(hiari)</span></label>
                <input
                  type="text"
                  value={newCustomerData.phone}
                  onChange={(e) =>
                    setNewCustomerData({ ...newCustomerData, phone: e.target.value })
                  }
                  className="w-full border px-2 py-1 rounded focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Ingiza simu"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Anwani <span className="text-gray-500">(hiari)</span></label>
                <textarea
                  value={newCustomerData.address}
                  onChange={(e) =>
                    setNewCustomerData({ ...newCustomerData, address: e.target.value })
                  }
                  className="w-full border px-2 py-1 rounded focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Ingiza anwani"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold w-full sm:w-auto"
                  onClick={() => handleCreateCustomer(false)}
                >
                  <FaUserPlus /> Unda Mteja
                </button>
                <button
                  type="button"
                  className="bg-gray-200 text-[#2563EB] px-4 py-2 rounded-xl w-full sm:w-auto"
                  onClick={() => setShowCustomerForm(false)}
                >
                  Ghairi
                </button>
              </div>
            </div>
          )}

          {/* Uchaguzi wa Bidhaa */}
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Tafuta bidhaa..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB]"
              />
              <FaSearch className="absolute right-3 top-3 text-gray-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB] w-full sm:w-auto"
            >
              <option value="">Kategori Zote</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border p-2 rounded">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-[#ffe5e5]"
                onClick={() => handleAddProduct(p)}
              >
                {p.name} - {p.price.toLocaleString()} TZS (Hisa: {p.stock})
                <FaPlus className="text-[#2563EB]" />
              </div>
            ))}
            {!filteredProducts.length && (
              <div className="p-2 text-gray-500">Hakuna bidhaa inayofanana</div>
            )}
          </div>

          {/* Bidhaa Zilizochaguliwa */}
          {selectedProducts.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold text-lg text-[#2563EB]">Bidhaa Zilizochaguliwa</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#ffe5e5]">
                      <th className="p-2 text-left">Bidhaa</th>
                      <th className="p-2 text-center">Kiasi</th>
                      <th className="p-2 text-center">Bei</th>
                      {discountType === "product" && (
                        <th className="p-2 text-center">Punguzo %</th>
                      )}
                      <th className="p-2 text-right">Jumla Ndogo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={p.quantity}
                            onChange={(e) =>
                              handleQuantityChange(p.id, parseInt(e.target.value))
                            }
                            className="w-16 text-center border rounded focus:ring-2 focus:ring-[#2563EB]"
                          />
                        </td>
                        <td className="p-2 text-center">{p.price.toLocaleString()}</td>
                        {discountType === "product" && (
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={p.discount}
                              onChange={(e) =>
                                handleProductDiscountChange(p.id, parseInt(e.target.value))
                              }
                              className="w-16 text-center border rounded focus:ring-2 focus:ring-[#2563EB]"
                            />
                          </td>
                        )}
                        <td className="p-2 text-right">{(p.price * p.quantity).toLocaleString()}</td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(p.id)}
                            className="text-[#2563EB] hover:text-red-700"
                          >
                            <FaTimes />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Punguzo & Maoni */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block font-semibold mb-1">Aina ya Punguzo</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="border rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="none">Hakuna</option>
                <option value="product">Kwa Bidhaa</option>
                <option value="total">Punguzo la Jumla</option>
              </select>
            </div>

            {discountType === "total" && (
              <div>
                <label className="block font-semibold mb-1">Jumla ya Punguzo (TZS)</label>
                <input
                  type="number"
                  value={totalDiscount}
                  onChange={(e) => setTotalDiscount(parseFloat(e.target.value))}
                  className="border rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">Maoni</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-[#2563EB]"
                placeholder="Maoni hiari"
              />
            </div>
          </div>

          {/* Jumla */}
          <div className="mt-6 border-t pt-4 space-y-1">
            <p>Jumla Ndogo: <strong>{subtotal.toLocaleString()} TZS</strong></p>
            {discountType === "product" && (
              <p>Punguzo: <strong>{productDiscountTotal.toLocaleString()} TZS</strong></p>
            )}
            {discountType === "total" && (
              <p>Punguzo la Jumla: <strong>{totalDiscount.toLocaleString()} TZS</strong></p>
            )}
            <p className="text-xl font-bold mt-2 text-[#2563EB]">
              Jumla Kuu: {grandTotal.toLocaleString()} TZS
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563EB] text-white py-3 rounded-xl font-semibold hover:bg-red-700 flex items-center justify-center gap-2"
          >
            {loading ? "Inahifadhi..." : "Hifadhi Proformer"}
          </button>
        </form>
      </div>
    </div>
  </div>
);

};

export default NewProformer;
