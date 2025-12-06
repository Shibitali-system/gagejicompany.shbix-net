import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "../../../../supabaseClient";
import { FaArrowLeft, FaBoxOpen, FaSave, FaSearch } from "react-icons/fa";
import { Toaster, toast } from "react-hot-toast";

const RecordPurchaseReturnPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const purchaseIdFromQuery = params.get("purchaseId");

  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState(purchaseIdFromQuery || "");
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
            permissions: ["dashboard", "purchases", "view_all_purchases"],
          });
          return;
        }

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
            permissions: employeeUser.permissions || ["purchases"],
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

  // 🔹 Fetch all purchases in chunks (filtered by user access)
  useEffect(() => {
    const fetchAllPurchases = async () => {
      if (!sellerInfo) return;
      setLoading(true);
      const chunkSize = 1000;
      let from = 0;
      let allPurchases = [];
      let filters = supabase
        .from("purchases")
        .select(
          `
          id,
          supplier_id,
          office_id,
          supplier:supplier_id(name),
          purchase_items(id, quantity, product_id, product:product_id(name))
        `
        )
        .order("created_at", { ascending: false });

      if (sellerInfo.type === "system" || sellerInfo.role === "admin") {
        filters = filters.eq("office_id", sellerInfo.office_id);
      } else if (
        sellerInfo.role === "employee" &&
        sellerInfo.permissions.includes("view_all_purchases")
      ) {
        filters = filters.eq("office_id", sellerInfo.office_id);
      } else {
        filters = filters.eq("seller_id", sellerInfo.id);
      }

      try {
        while (true) {
          const { data, error } = await filters.range(from, from + chunkSize - 1);
          if (error) throw error;
          if (data.length === 0) break;
          allPurchases = [...allPurchases, ...data];
          if (data.length < chunkSize) break;
          from += chunkSize;
        }

        setPurchases(allPurchases);
        setFilteredPurchases(allPurchases.slice(0, 3));
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch purchase records.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllPurchases();
  }, [sellerInfo]);

  // Auto-select purchase from query
  useEffect(() => {
    if (purchaseIdFromQuery) setSelectedPurchase(purchaseIdFromQuery);
  }, [purchaseIdFromQuery]);

  // Load purchase products
  useEffect(() => {
    if (!selectedPurchase) return;
    const purchase = purchases.find((p) => String(p.id) === String(selectedPurchase));
    setProducts(purchase?.purchase_items || []);
    setReturnData({});
  }, [selectedPurchase, purchases]);

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

  // Search purchases
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPurchases(purchases.slice(0, 3));
    } else {
      const filtered = purchases.filter(
        (p) =>
          p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(p.id).includes(searchTerm)
      );
      setFilteredPurchases(filtered);
    }
  }, [searchTerm, purchases]);

  // 🧾 Submit returns
  const handleSubmit = async () => {
    if (!selectedPurchase) return toast.error("Please select a purchase first");
    if (!sellerInfo) return toast.error("Seller info not loaded");

    const items = Object.entries(returnData)
      .filter(([_, v]) => parseInt(v.quantity) > 0)
      .map(([product_id, v]) => ({
        purchase_id: selectedPurchase,
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
    const { error } = await supabase.from("purchases_returns").insert(items);

    if (error) {
      console.error(error);
      toast.error("Failed to record return");
    } else {
      toast.success("Return recorded successfully!");
      setReturnData({});
    }
    setSubmitting(false);
  };

  const totalReturnQty = Object.values(returnData).reduce(
    (sum, i) => sum + (parseInt(i.quantity) || 0),
    0
  );

  return (
  <div className="min-h-screen p-4 sm:p-6 font-sans">
    <Toaster position="top-right" />
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444] flex items-center gap-2">
          <FaBoxOpen /> Record Purchase Return
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to="../purchases/returns"
            className="text-[#ef4444] hover:underline flex items-center gap-1 font-bold"
          >
            <FaArrowLeft /> Back to Returns List
          </Link>
        </div>
      </div>

      {/* Selected Purchase Input */}
      {selectedPurchase && (
        <div className="mb-4">
          <label className="block font-semibold mb-1 text-gray-700">
            Selected Purchase
          </label>
          <input
            type="text"
            value={
              selectedPurchase
                ? `#${selectedPurchase} — ${
                    purchases.find((p) => String(p.id) === String(selectedPurchase))
                      ?.supplier?.name || "No Supplier"
                  }`
                : ""
            }
            readOnly
            className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
          />
        </div>
      )}

      {/* Searchable Purchase Selector */}
      <div className="mb-6">
        <label className="block font-semibold mb-1 text-gray-700">
          Search Purchase
        </label>
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search purchase by ID or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
          />
        </div>

        {!loading && (
          <div className="mt-2 border border-gray-200 rounded-xl divide-y max-h-48 overflow-y-auto bg-white shadow-sm">
            {filteredPurchases.length > 0 ? (
              filteredPurchases.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 cursor-pointer hover:bg-[#ffe5e5] ${
                    String(selectedPurchase) === String(p.id)
                      ? "bg-[#fdecea] font-semibold"
                      : ""
                  }`}
                  onClick={() => setSelectedPurchase(p.id)}
                >
                  <p className="text-sm">
                    <span className="font-bold text-[#ef4444]">#{p.id}</span> —{" "}
                    {p.supplier?.name || "No Supplier"}
                  </p>
                </div>
              ))
            ) : (
              <p className="p-3 text-gray-500 text-sm">No purchases found.</p>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedPurchase && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-[#fdecea] rounded-2xl p-4 text-center shadow">
            <p className="text-gray-500">Total Return Quantity</p>
            <p className="font-bold text-[#ef4444] text-lg">{totalReturnQty}</p>
          </div>
        </div>
      )}

      {/* Products Table */}
      {selectedPurchase && products.length > 0 ? (
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[#ef4444] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Purchased Qty</th>
                <th className="px-3 py-2 text-left">Return Qty</th>
                <th className="px-3 py-2 text-left">Reason</th>
                <th className="px-3 py-2 text-left">Comment</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-[#ffe5e5]">
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
                      className="w-20 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
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
                      className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
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
                      className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedPurchase ? (
        <p className="text-gray-500 italic mb-4">
          No products found for this purchase.
        </p>
      ) : null}

      {/* Submit Button */}
      {selectedPurchase && (
        <div className="text-right">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`bg-[#ef4444] text-white px-6 py-2 rounded-xl shadow flex items-center gap-2 justify-center ml-auto transition ${
              submitting
                ? "opacity-70 cursor-not-allowed"
                : "hover:bg-[#d13737]"
            }`}
          >
            <FaSave /> {submitting ? "Submitting..." : "Record Return"}
          </button>
        </div>
      )}
    </div>
  </div>
);

};

export default RecordPurchaseReturnPage;
