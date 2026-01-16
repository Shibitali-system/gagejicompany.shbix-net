import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from '../../../supabaseClient';
import { useNotification } from '../../hooks/useNotification'; // adjust path kama ni tofauti
import { sendNotification } from "../utils/sendNotification";
import { FaPlus, FaTimes, FaSearch, FaUserPlus, FaUserSlash, FaArrowLeft } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import { DateTime } from "luxon"; // optional library kwa timezone

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

const NewSale = () => {
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
  const [newCustomerData, setNewCustomerData] = useState({ name: "", email: "", phone: "", address: "", type: "Biashara" });
  const [saleDateTime, setSaleDateTime] = useState(
  DateTime.now().setZone("Africa/Nairobi").toFormat("yyyy-MM-dd'T'HH:mm")
);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [loanAmount, setLoanAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [loanPaymentDate, setLoanPaymentDate] = useState("");
  const notify = useNotification();

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

  // --- Helper to fetch all data in chunks ---
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
    } while(fetched.length === batchSize);
    return results;
  };

  // --- Fetch customers and products using chunking & filter by office_id ---
useEffect(() => {
  const fetchData = async () => {
    try {
      // --- Helper to fetch all data in batches ---
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

      // --- Fetch all customers & products in parallel ---
      const [allCustomers, allProducts] = await Promise.all([
        fetchAllFromTable("customers"),
        fetchAllFromTable("products")
      ]);

      // ✅ Filter customers by seller's office_id
      let officeCustomers = allCustomers;
      if (sellerInfo?.office_id) {
        officeCustomers = allCustomers.filter(c => c.office_id === sellerInfo.office_id);
      }
      setCustomers(officeCustomers);

      // ✅ Filter products by seller's office_id
      let officeProducts = allProducts;
      if (sellerInfo?.office_id) {
        officeProducts = allProducts.filter(p => p.office_id === sellerInfo.office_id);
      }
      setProducts(officeProducts);

      // ✅ Extract unique categories from filtered products
      setCategories(Array.from(new Set(officeProducts.map(p => p.category))).filter(Boolean));

    } catch (err) {
      toast.error("Failed to fetch initial data: " + err.message);
      console.error(err);
    }
  };

  // Only fetch after sellerInfo is loaded
  if (sellerInfo) fetchData();
}, [sellerInfo]);


  const generateCustomerID = () => `SHBI${Math.floor(100000000 + Math.random() * 900000000)}`;
  const handleSelectCustomer = (c) => { setSelectedCustomer(c); if(c) setCustomerSearch(c.name); };
  const handleAddProduct = (product) => {
    if(selectedProducts.find(p=>p.id===product.id)) return toast.error("Product already selected");
    setSelectedProducts([...selectedProducts, {...product, quantity:1, discount:0}]);
  };
  const handleRemoveProduct = (id) => setSelectedProducts(selectedProducts.filter(p=>p.id!==id));
  const handleQuantityChange = (id, qty) => {
    setSelectedProducts(selectedProducts.map(p=>p.id===id ? {...p, quantity: qty>p.stock?p.stock:qty} : p));
  };
  const handleProductDiscountChange = (id, discount) => setSelectedProducts(selectedProducts.map(p=>p.id===id ? {...p, discount} : p));

  // --- Filter products by search & category, limit to 3 ---
const filteredProducts = useMemo(() => {
  if (!products) return [];
  return products
    .filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      (selectedCategory ? p.category === selectedCategory : true)
    )
    .slice(0, 3); // limit to 3 products
}, [products, productSearch, selectedCategory]);

  const filteredCustomers = useMemo(() => 
  customers
    .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
    .slice(0, 2),
  [customers, customerSearch]
);


  const subtotal = useMemo(() => selectedProducts.reduce((sum,p)=>sum+(p.price*(p.quantity||0)),0), [selectedProducts]);
  const productDiscountTotal = useMemo(() => selectedProducts.reduce((sum,p)=>sum+((p.price*(p.quantity||0))*(p.discount||0)/100),0), [selectedProducts]);
  const grandTotal = useMemo(() => {
    let total = subtotal;
    if(discountType==="product") total -= productDiscountTotal;
    if(discountType==="total") total -= totalDiscount;
    return total;
  }, [subtotal, discountType, productDiscountTotal, totalDiscount]);

  const handleCreateCustomer = async (autoName = false) => {
  try {
    if (!sellerInfo) return toast.error("Seller info not loaded");

    const nameToUse = autoName ? generateCustomerID() : newCustomerData.name;
    if (!nameToUse) return toast.error("Customer name is required");

    const newCustomer = {
      ...newCustomerData,
      name: nameToUse,
      office_id: sellerInfo.office_id,       // ✅ Seller's office id
      office_name: sellerInfo.office_name,   // ✅ Seller's office name
      created_by: sellerInfo.id              // ✅ Seller's UUID
    };

    const { data, error } = await supabase
      .from("customers")
      .insert([newCustomer])
      .select()
      .maybeSingle();

    if (error) return toast.error("Failed to create customer: " + error.message);

    setSelectedCustomer(data);
    setCustomerSearch(data.name);
    setCustomers(prev => [...prev, data]);

    setShowCustomerForm(false);
    setNewCustomerData({ name: "", email: "", phone: "", address: "", type: "Biashara" });
    toast.success("Customer created successfully");
  } catch (err) {
    toast.error(err.message);
  }
};



  // --- Submit Sale ---
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!selectedCustomer)
    return toast.error("Please select or create a customer");

  if (selectedProducts.length === 0)
    return toast.error("Please select at least one product");

  if (!sellerInfo)
    return toast.error("Seller info not loaded");

  for (const p of selectedProducts)
    if (p.quantity > p.stock)
      return toast.error(`Stock insufficient for ${p.name}`);

  if (paymentStatus === "Loan") {
    if (!loanPaymentDate)
      return toast.error("Please select Loan Payment Date");
    if (loanAmount <= 0)
      return toast.error("Loan Amount must be greater than 0");
  }

  let paid = 0,
    remainingLoan = 0,
    finalLoanPaymentDate = null;

  if (paymentStatus === "Paid") {
    paid = grandTotal;
    remainingLoan = 0;
    finalLoanPaymentDate = new Date(saleDateTime).toISOString();
  } else if (paymentStatus === "Loan") {
    paid = paidAmount || (grandTotal - loanAmount);
    remainingLoan = loanAmount;
    finalLoanPaymentDate = new Date(loanPaymentDate).toISOString();
  }

  setLoading(true);

  try {
    // 🔐 Get access token
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) throw new Error("User not authenticated");

    // 1️⃣ Insert sale
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([{
        customer_id: selectedCustomer.id,
        seller_id: sellerInfo.id,
        seller_type: sellerInfo.type,
        office_id: sellerInfo.office_id,
        office_name: sellerInfo.office_name,
        total_amount: grandTotal,
        discount_type: discountType,
        discount_value:
          discountType === "total" ? totalDiscount : productDiscountTotal,
        comment,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        paid_amount: paid,
        loan_amount: remainingLoan,
        loan_payment_date: finalLoanPaymentDate,
        created_at: saleDateTime,
      }])
      .select()
      .maybeSingle();

    if (saleError) throw saleError;

    // 2️⃣ Insert sale items
    const saleItemsData = selectedProducts.map((p) => ({
      sale_id: saleData.id,
      product_id: p.id,
      quantity: p.quantity,
      price: p.price,
      discount: discountType === "product" ? p.discount : 0,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItemsData);

    if (itemsError) throw itemsError;

    // 3️⃣ Update stock
    for (const p of selectedProducts) {
      await supabase
        .from("products")
        .update({ stock: p.stock - p.quantity })
        .eq("id", p.id);
    }

    // 4️⃣ PUSH NOTIFICATION (Edge Function)
    try {
      await fetch(
        "https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/quick-handler",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            auth_user_id: sellerInfo.id,
            office_id: sellerInfo.office_id,
            title: "New Sale Recorded",
            message: `Sale of ${selectedProducts.length} products was recorded by ${sellerInfo.name} for ${selectedCustomer.name}.`,
            url: "/dashboard/sales",
          }),
        }
      );
    } catch (pushErr) {
      console.warn("🔕 Push notification failed:", pushErr);
    }

    // 5️⃣ LOCAL / PWA notification
    notify("New Sale Recorded", {
      body: `Sale of ${selectedProducts.length} products recorded by ${sellerInfo.name}`,
      icon: "/pwa-192.png",
      badge: "/badge-72.png",
    });

    toast.success("✅ Sale recorded successfully!");

// --- 6️⃣ Fetch office owner first ---
    const { data: officeOwner } = await supabase
      .from("systems_users")
      .select("id, customer_phone, customer_name, office_name")
      .eq("office_id", sellerInfo.office_id)
      .maybeSingle();

    // --- 6a. SMS to customer ---
    if (selectedCustomer?.phone) {
      let cleanCustomerPhone = selectedCustomer.phone.replace(/\D/g, "");
      if (cleanCustomerPhone.startsWith("0") || cleanCustomerPhone.startsWith("7") || cleanCustomerPhone.startsWith("6")) {
        cleanCustomerPhone = "255" + cleanCustomerPhone.substring(cleanCustomerPhone.startsWith("0") ? 1 : 0);
      }

      const itemsText = selectedProducts
        .map(p => `${p.name} x${p.quantity} = ${((p.price * p.quantity) - ((p.discount||0)/100)*(p.price*p.quantity)).toLocaleString()} TZS`)
        .join("; ");

      const smsTextCustomer = `Karibu ${selectedCustomer.name}!\n` +
        `Umefanya malipo ofisi ya ${sellerInfo.office_name}.\n` +
        `Total: ${grandTotal.toLocaleString()} TZS\n` +
        `Products: ${itemsText}\n` +
        `Mawasiliano yetu ni ${officeOwner?.customer_phone || "N/A"}. Asanteh!`;

      const smsResCustomer = await fetch(
        "https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/sms-system",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            office_id: sellerInfo.office_id,
            to: cleanCustomerPhone,
            text: smsTextCustomer,
            reference: `SALE-${saleData.id}`,
          }),
        }
      );

      const smsDataCustomer = await smsResCustomer.json();
      if (smsResCustomer.ok) {
        console.log("✅ SMS sent to customer", smsDataCustomer);
      } else {
        console.warn("⚠️ Customer SMS failed", smsDataCustomer);
      }
    }

    // --- 6b. SMS to office owner ---
    if (officeOwner?.customer_phone) {
      let cleanOwnerPhone = officeOwner.customer_phone.replace(/\D/g, "");
      if (cleanOwnerPhone.startsWith("0") || cleanOwnerPhone.startsWith("7") || cleanOwnerPhone.startsWith("6")) {
        cleanOwnerPhone = "255" + cleanOwnerPhone.substring(cleanOwnerPhone.startsWith("0") ? 1 : 0);
      }

      const itemsText = selectedProducts
        .map(p => `${p.name} x${p.quantity} = ${((p.price * p.quantity) - ((p.discount||0)/100)*(p.price*p.quantity)).toLocaleString()} TZS`)
        .join("; ");

      const smsTextOwner = `Notification: ${selectedCustomer.name} amefanya malipo.\n` +
        `Ofisi: ${sellerInfo.office_name}\n` +
        `Total: ${grandTotal.toLocaleString()} TZS\n` +
        `Products: ${itemsText}`;

      const smsResOwner = await fetch(
        "https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/sms-system",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            office_id: sellerInfo.office_id,
            to: cleanOwnerPhone,
            text: smsTextOwner,
            reference: `SALE-${saleData.id}-OWNER`,
          }),
        }
      );

      const smsDataOwner = await smsResOwner.json();
      if (smsResOwner.ok) {
        console.log("✅ SMS sent to office owner", smsDataOwner);
        toast.success("✅ Office owner notified via SMS");
      } else {
        console.warn("⚠️ Owner SMS failed", smsDataOwner);
      }
    }

    // 6️⃣ Reset form & UI
    setSelectedCustomer(null);
    setCustomerSearch("");
    setSelectedProducts([]);
    setDiscountType("none");
    setTotalDiscount(0);
    setComment("");
    setShowCustomerForm(false);
    setNewCustomerData({
      name: "",
      email: "",
      phone: "",
      address: "",
      type: "pharmacy",
    });
    setSaleDateTime(new Date().toISOString().slice(0, 16));
    setPaymentStatus("Paid");
    setLoanAmount(0);
    setPaidAmount(0);
    setLoanPaymentDate("");

  } catch (err) {
    toast.error("❌ Failed to record sale: " + err.message);
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 font-sans">
    <Toaster position="top-right" />

    <div className="max-w-5xl mx-auto space-y-6">

      {/* Kadi ya Kichwa */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      flex flex-col md:flex-row justify-between items-start md:items-center gap-4
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB]">Rekodi Mauzo Mapya</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tumia fomu hii kurekodi mauzo mapya. Chagua mteja, ongeza bidhaa, weka punguzo, na weka maelezo ya malipo. Hakikisha sehemu zote muhimu zimejazwa kabla ya kutuma.
          </p>
        </div>
        <Link to="../sales" className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline">
          <FaArrowLeft /> Rudi kwenye Orodha ya Mauzo
        </Link>
      </div>

      {/* Kadi ya Fomu ya Mauzo */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-5 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Tarehe na Wakati wa Mauzo */}
          <div>
            <label className="block font-semibold mb-1">Tarehe na Wakati wa Mauzo</label>
            <input
              type="datetime-local"
              value={saleDateTime}
              onChange={e => setSaleDateTime(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded w-full focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          {/* Utafutaji na Hatua za Mteja */}
          <div className="flex flex-col gap-2">
            <label className="block font-semibold mb-1">Mteja</label>
            <input
              type="text"
              placeholder="Tafuta au andika mteja mpya..."
              value={customerSearch}
              onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB]"
            />

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold"
                onClick={() => setShowCustomerForm(true)}
              >
                <FaUserPlus /> Unda Mteja
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-[#2563EB] px-4 py-2 rounded-xl font-semibold"
                onClick={() => handleCreateCustomer(true)}
              >
                <FaUserSlash /> Hakuna Jina la Mteja
              </button>
            </div>

            {customerSearch && (
              <div className="border rounded mt-1 max-h-32 overflow-y-auto bg-white">
                {filteredCustomers.map(c => (
                  <div key={c.id} className="p-2 cursor-pointer hover:bg-[#ffe5e5]" onClick={() => handleSelectCustomer(c)}>
                    {c.name}
                  </div>
                ))}
                {!filteredCustomers.length && <div className="p-2 text-gray-500">Hakuna mteja anayefanana</div>}
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
                  onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                  placeholder="Weka jina la mteja"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Barua Pepe <span className="text-gray-500">(hiari)</span></label>
                <input
                  type="email"
                  value={newCustomerData.email}
                  onChange={e => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                  placeholder="Weka barua pepe (hiari)"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Simu <span className="text-gray-500">(hiari)</span></label>
                <input
                  type="text"
                  value={newCustomerData.phone}
                  onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                  placeholder="Weka nambari ya simu (hiari)"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Anuani <span className="text-gray-500">(hiari)</span></label>
                <textarea
                  value={newCustomerData.address}
                  onChange={e => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                  placeholder="Weka anuani (hiari)"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold w-full sm:w-auto"
                  onClick={() => handleCreateCustomer(false)}
                >
                  <FaUserPlus /> Unda Mteja
                </button>
                <button
                  type="button"
                  className="bg-gray-300 px-4 py-2 rounded-xl w-full sm:w-auto"
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
                onChange={e => setProductSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB]"
              />
              <FaSearch className="absolute right-3 top-3 text-gray-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB] w-full sm:w-auto"
            >
              <option value="">Kundi Zote</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border p-2 rounded">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-[#ffe5e5]"
                onClick={() => handleAddProduct(p)}
              >
                {p.name} - {p.price.toLocaleString()} TZS (Hisa: {p.stock})
                <FaPlus className="text-[#2563EB]" />
              </div>
            ))}
            {!filteredProducts.length && <div className="p-2 text-gray-500">Hakuna bidhaa inayofanana</div>}
          </div>

          {/* Bidhaa Zilizochaguliwa */}
          {selectedProducts.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold text-lg">Bidhaa Zilizochaguliwa</h2>
              <div className="space-y-2">
                {selectedProducts.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border p-2 rounded gap-2 sm:gap-0">
                    <div className="flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-gray-500">Bei: {p.price.toLocaleString()} TZS | Hisa: {p.stock}</p>
                      {discountType === "product" && (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Punguzo %"
                          value={p.discount || ""}
                          onChange={(e) => handleProductDiscountChange(p.id, parseFloat(e.target.value) || 0)}
                          className="border rounded px-2 py-1 mt-1 w-24"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={p.stock}
                        value={p.quantity}
                        onChange={(e) => handleQuantityChange(p.id, parseInt(e.target.value))}
                        className="w-20 border rounded px-2 py-1"
                      />
                      <button type="button" onClick={() => handleRemoveProduct(p.id)} className="text-red-600">
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Punguzo na Maoni */}
          <div className="flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-center">
            <div>
              <label className="block font-semibold mb-1">Aina ya Punguzo</label>
              <div className="flex flex-wrap gap-2">
                {["none", "product", "total"].map(type => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setDiscountType(type)}
                    className={`px-4 py-2 rounded-xl border font-medium ${
                      discountType === type
                        ? "bg-[#2563EB] text-white border-[#2563EB]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-[#ffe5e5]"
                    }`}
                  >
                    {type === "none" ? "Hakuna" : type === "product" ? "Kila Bidhaa" : "Jumla"}
                  </button>
                ))}
              </div>
            </div>

            {discountType === "total" && (
              <div className="flex-1 min-w-[150px]">
                <label className="block font-semibold mb-1">Jumla ya Punguzo (TZS)</label>
                <input
                  type="number"
                  min="0"
                  value={totalDiscount}
                  onChange={(e) => setTotalDiscount(parseFloat(e.target.value) || 0)}
                  className="border px-3 py-2 rounded w-full focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            )}

            <div className="flex-1 min-w-[150px]">
              <label className="block font-semibold mb-1">Maoni</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Maoni hiari kwa mauzo haya"
                className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          {/* Uchambuzi */}
          <div className="p-4 border rounded bg-gray-50 space-y-1">
            <p>Jumla Ndogo: {subtotal.toLocaleString()} TZS</p>
            <p>Jumla ya Punguzo la Bidhaa: {productDiscountTotal.toLocaleString()} TZS</p>
            <p>Jumla Kuu: {grandTotal.toLocaleString()} TZS</p>
            <p>Idadi ya Bidhaa: {selectedProducts.length}</p>
          </div>

          {/* Maelezo ya Malipo */}
          <div className="flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-center">
            <div className="flex-1 min-w-[150px]">
              <label className="block font-semibold mb-1">Njia ya Malipo</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="border px-3 py-2 rounded w-full focus:ring-2 focus:ring-[#2563EB]"
              >
                {["Cash", "Card", "Mobile Money", "Bank Transfer"].map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block font-semibold mb-1">Hali ya Malipo</label>
              <select
                value={paymentStatus}
                onChange={(e) => {
                  const value = e.target.value;
                  setPaymentStatus(value);
                  if (value === "Paid") {
                    setLoanPaymentDate(saleDateTime);
                    setPaidAmount(grandTotal);
                    setLoanAmount(0);
                  } else if (value === "Loan") {
                    setLoanPaymentDate("");
                    setPaidAmount(0);
                    setLoanAmount(grandTotal);
                  } else {
                    setLoanPaymentDate("");
                    setPaidAmount(0);
                    setLoanAmount(0);
                  }
                }}
                className="border px-3 py-2 rounded w-full focus:ring-2 focus:ring-[#2563EB]"
              >
                {["Paid", "Loan", "Not Paid", "Provided Free", "Sponsored"].map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {paymentStatus === "Loan" && (
            <div className="flex flex-col md:flex-row gap-4 mt-2">
              <div className="flex-1">
                <label className="block font-semibold mb-1">Kiasi cha Mkopo (TZS)</label>
                <input
                  type="number"
                  min="0"
                  value={loanAmount === 0 ? "" : loanAmount}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    setLoanAmount(val);
                    setPaidAmount(grandTotal - val);
                  }}
                  placeholder="Weka kiasi cha mkopo"
                  className="border px-3 py-2 rounded w-full focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex-1">
                <label className="block font-semibold mb-1">Tarehe ya Malipo ya Mkopo</label>
                <input
                  type="date"
                  value={loanPaymentDate}
                  onChange={(e) => setLoanPaymentDate(e.target.value)}
                  className="border px-3 py-2 rounded w-full focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex-1">
                <label className="block font-semibold mb-1">Kiasi Kilicholipwa (TZS)</label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    setPaidAmount(val);
                    setLoanAmount(grandTotal - val);
                  }}
                  placeholder="Weka kiasi kilicholipwa"
                  className="border px-3 py-2 rounded w-full focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#2563EB] text-white px-6 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2 w-full sm:w-auto"
          >
            {loading ? "Inarekodiwa..." : "Rekodi Mauzo"}
          </button>

        </form>
      </div>
    </div>
  </div>
);



};

export default NewSale;
