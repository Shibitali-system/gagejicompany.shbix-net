import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "../../../../supabaseClient";
import { FaArrowLeft, FaBoxOpen, FaSave, FaSearch } from "react-icons/fa";
import { Toaster, toast } from "react-hot-toast";

const RecordReturnPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const saleIdFromQuery = params.get("saleId");

  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState(saleIdFromQuery || "");
  const [products, setProducts] = useState([]);
  const [returnData, setReturnData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sellerInfo, setSellerInfo] = useState(null);

  // 🔹 Fetch seller info (Admin or Employee via Auth)
useEffect(() => {
  const fetchSellerInfo = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;

      // 1️⃣ System user (Admin)
      const { data: systemUser } = await supabase
        .from("systems_users")
        .select("*")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (systemUser) {
        setSellerInfo({
          id: systemUser.id,
          name: systemUser.customer_name,
          office_id: systemUser.customer_registration_no,
          office_name: systemUser.customer_name,
          type: "system",
          role: "admin",
          permissions: ["dashboard", "sales", "view_all_sales"],
        });
        return;
      }

      // 2️⃣ Employee
      const { data: employeeUser } = await supabase
        .from("employees")
        .select("*, systems_users(customer_registration_no, customer_name)")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (employeeUser) {
        setSellerInfo({
          id: employeeUser.id,
          name: employeeUser.name,
          office_id: employeeUser.systems_users?.customer_registration_no,
          office_name: employeeUser.systems_users?.customer_name,
          type: "employee",
          role: employeeUser.role || "employee",
          permissions: employeeUser.permissions || ["sales"],
        });
        return;
      }

      toast.error("Seller information not found.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch seller info.");
    }
  };
  fetchSellerInfo();
}, []);

// 🔹 Fetch all sales filtered by office / seller
useEffect(() => {
  const fetchAllSales = async () => {
    if (!sellerInfo) return;
    setLoading(true);

    const chunkSize = 1000;
    let from = 0;
    let allSales = [];

    try {
      let baseQuery = supabase
        .from("sales")
        .select(`
          id,
          seller_id,
          office_id,
          created_at,
          customer:customer_id(name),
          sale_items(id, quantity, product_id, product:product_id(name))
        `)
        .order("created_at", { ascending: false });

      // 🔹 Filter based on seller type / role
      if (
        sellerInfo.type === "system" && 
        sellerInfo.role === "admin"
      ) {
        // Admin sees sales only for their office
        baseQuery = baseQuery.eq("office_id", sellerInfo.office_id);
      } else if (
        sellerInfo.role === "employee" &&
        sellerInfo.permissions.includes("view_all_sales")
      ) {
        // Employee with view_all_sales permission sees office sales
        baseQuery = baseQuery.eq("office_id", sellerInfo.office_id);
      } else {
        // Regular employee sees only their sales
        baseQuery = baseQuery.eq("seller_id", sellerInfo.id);
      }

      // 🔹 Fetch in chunks to avoid large dataset issues
      while (true) {
        const { data, error } = await baseQuery.range(from, from + chunkSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;

        allSales = [...allSales, ...data];

        if (data.length < chunkSize) break; // no more records
        from += chunkSize;
      }

      setSales(allSales);
      setFilteredSales(allSales.slice(0, 3));
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch sales records.");
    } finally {
      setLoading(false);
    }
  };

  fetchAllSales();
}, [sellerInfo]);


  // Auto-select sale from query
  useEffect(() => {
    if (saleIdFromQuery) setSelectedSale(saleIdFromQuery);
  }, [saleIdFromQuery]);

  // Load sale products
  useEffect(() => {
    if (!selectedSale) return;
    const sale = sales.find((s) => String(s.id) === String(selectedSale));
    setProducts(sale?.sale_items || []);
    setReturnData({});
  }, [selectedSale, sales]);

  // Handle change
  const handleChange = (productId, field, value) => {
    setReturnData((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  // Search sales
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSales(sales.slice(0, 3));
    } else {
      const filtered = sales.filter(
        (s) =>
          s.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(s.id).includes(searchTerm)
      );
      setFilteredSales(filtered);
    }
  }, [searchTerm, sales]);

  // 🧾 Submit returns
const handleSubmit = async () => {
  if (!selectedSale) return toast.error("Please select a sale first");
  if (!sellerInfo) return toast.error("Seller info not loaded");

  const items = Object.entries(returnData)
    .filter(([_, v]) => parseInt(v.quantity) > 0)
    .map(([product_id, v]) => ({
      sale_id: selectedSale,
      product_id,
      quantity: parseInt(v.quantity),
      reason: v.reason || "-",
      comment: v.comment || "",
      status: "Pending",
      seller_id: sellerInfo.id,
      seller_type: sellerInfo.type,
      office_id: sellerInfo.office_id,
      office_name: sellerInfo.office_name,
      seller_name: sellerInfo.name,
    }));

  if (items.length === 0)
    return toast.error("Please enter at least one return item");

  setSubmitting(true);
  const { error } = await supabase.from("sales_returns").insert(items);

  if (error) {
    console.error(error);
    toast.error("Failed to record return");
  } else {
    toast.success("Return recorded successfully!");

    // Reset form
    setReturnData(prev => {
      const cleared = { ...prev };
      Object.keys(cleared).forEach(k => {
        cleared[k].quantity = "";
        cleared[k].reason = "";
        cleared[k].comment = "";
      });
      return cleared;
    });

    // Optional: reset selected sale if needed
    // setSelectedSale(null);

    // Re-fetch returns if you want to update the list immediately
    if (typeof fetchReturns === "function") fetchReturns();
  }

  setSubmitting(false);
};


  const totalReturnQty = Object.values(returnData).reduce(
    (sum, i) => sum + (parseInt(i.quantity) || 0),
    0
  );

  // ---------------------- InfoCard Component ----------------------
const InfoCard = ({ title, value, valueColor }) => (
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
    style={{ willChange: "transform" }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
  </div>
);

return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header Card with Tips */}
      <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] flex items-center gap-2">
            <FaBoxOpen /> Record Returned Products
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="../sales/returns"
              className="text-[#2563EB] hover:underline flex items-center gap-1 font-bold"
            >
              <FaArrowLeft /> Back to Returns List
            </Link>
          </div>
        </div>
        {/* Tips below header */}
        <p className="text-gray-500 text-sm mt-2">
          Use the search box to find a sale. Select a sale to view and record returned products.
        </p>
      </div>

      {/* Selected Sale Card */}
      {selectedSale && (
        <div className="bg-white rounded-2xl shadow p-4 space-y-4">
          <label className="block font-semibold mb-1 text-gray-700">Selected Sale</label>
          <input
            type="text"
            value={
              selectedSale
                ? `#${selectedSale} — ${
                    sales.find((s) => String(s.id) === String(selectedSale))
                      ?.customer?.name || "No Customer"
                  }`
                : ""
            }
            readOnly
            className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
          />

          {/* Summary InfoCard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <InfoCard title="Total Return Quantity" value={totalReturnQty} />
          </div>
        </div>
      )}

      {/* Searchable Sale Selector Card */}
      <div className="bg-white rounded-2xl shadow p-4">
        <label className="block font-semibold mb-1 text-gray-700">Search Sale</label>
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search sale by ID or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>

        {!loading && (
          <div className="mt-2 border border-gray-200 rounded-xl divide-y max-h-48 overflow-y-auto bg-white shadow-sm">
            {filteredSales.length > 0 ? (
              filteredSales.map((s) => (
                <div
                  key={s.id}
                  className={`p-3 cursor-pointer hover:bg-gray-100 ${
                    String(selectedSale) === String(s.id)
                      ? "bg-gray-200 font-semibold"
                      : ""
                  }`}
                  onClick={() => setSelectedSale(s.id)}
                >
                  <p className="text-sm">
                    <span className="font-bold text-[#2563EB]">#{s.id}</span> — {s.customer?.name || "No Customer"}
                  </p>
                </div>
              ))
            ) : (
              <p className="p-3 text-gray-500 text-sm">No sales found.</p>
            )}
          </div>
        )}
      </div>

      {/* Products Table Card */}
      {selectedSale && (
        <div className="bg-white rounded-2xl shadow p-4">
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Sold Qty</th>
                    <th className="px-3 py-2 text-left">Return Qty</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-[#fdeaea]">
                      <td className="px-3 py-2">{p.product?.name || "-"}</td>
                      <td className="px-3 py-2">{p.quantity}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max={p.quantity}
                          value={returnData[p.product_id]?.quantity || ""}
                          onChange={(e) =>
                            handleChange(p.product_id, "quantity", e.target.value)
                          }
                          className="w-20 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={returnData[p.product_id]?.reason || ""}
                          onChange={(e) =>
                            handleChange(p.product_id, "reason", e.target.value)
                          }
                          placeholder="Reason"
                          className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={returnData[p.product_id]?.comment || ""}
                          onChange={(e) =>
                            handleChange(p.product_id, "comment", e.target.value)
                          }
                          placeholder="Comment"
                          className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No products found for this sale.</p>
          )}

          {/* Submit Button */}
          <div className="text-right mt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`bg-[#2563EB] text-white px-6 py-2 rounded-xl shadow flex items-center gap-2 justify-center ml-auto transition ${
                submitting ? "opacity-70 cursor-not-allowed" : "hover:bg-[#e3342f]"
              }`}
            >
              <FaSave /> {submitting ? "Submitting..." : "Record Return"}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

};

export default RecordReturnPage;
