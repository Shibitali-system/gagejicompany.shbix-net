// src/pages/purchases/PurchaseHistory.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { IoArrowBack } from "react-icons/io5";


const PurchaseHistory = () => {
  const { id } = useParams();
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------
  // 1️⃣ Fetch all products for name lookup
  // ------------------------------------------------------------
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name");

    if (error) {
      console.error(error);
      return;
    }

    const map = {};
    data.forEach((p) => (map[p.id] = p.name));
    setProducts(map);
  };

  // ------------------------------------------------------------
  // 2️⃣ Fetch purchase history + supplier info
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        await fetchProducts();

        const { data, error } = await supabase
          .from("purchase_history")
          .select(`
            *,
            suppliers:supplier_id(name)
          `)
          .eq("purchase_id", id)
          .order("edited_at", { ascending: false });

        if (error) throw error;

        // Clean & parse items
        const cleaned = data.map((row) => {
          let parsedItems = [];

          try {
            if (typeof row.items === "string") {
              parsedItems = JSON.parse(row.items);
            } else if (Array.isArray(row.items)) {
              parsedItems = row.items;
            }
          } catch (err) {
            console.error("ITEM PARSE ERROR:", err);
          }

          return { ...row, items: parsedItems };
        });

        setHistory(cleaned);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch purchase history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [id]);

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


  if (loading)
    return (
      <p className="p-6 text-gray-600 animate-pulse text-center text-lg">
        Loading history...
      </p>
    );

  return (
  <div className="min-h-screen p-4 sm:p-6 bg-gray-50 font-sans">
    <Toaster position="top-right" />

    <div className="max-w-5xl mx-auto flex flex-col gap-4">

      {/* HEADER CARD */}
      <CustomCard>
        <div className="flex items-center justify-between w-full">
          <Link
            to={`../purchases/${id}`}
            className="flex items-center gap-2 text-[#2563EB] font-semibold hover:underline"
          >
            <IoArrowBack size={18} />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-[#2563EB]">Purchase Edit History</h1>
        </div>
      </CustomCard>

      {/* LOADING STATE */}
      {loading && (
        <p className="p-6 text-gray-600 animate-pulse">Loading history...</p>
      )}

      {/* NO DATA */}
      {!loading && history.length === 0 && (
        <CustomCard>
          <p className="text-gray-500">No history found for this purchase.</p>
        </CustomCard>
      )}

      {/* HISTORY TABLE */}
      {!loading && history.length > 0 && (
        <CustomCard title="Edit History">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100 font-semibold">
                <tr>
                  <th className="border px-4 py-2">Edited By</th>
                  <th className="border px-4 py-2">Date</th>
                  <th className="border px-4 py-2">Invoice</th>
                  <th className="border px-4 py-2">Supplier</th>
                  <th className="border px-4 py-2">Total</th>
                  <th className="border px-4 py-2">Items</th>
                </tr>
              </thead>

              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{h.edited_by_name}</td>
                    <td className="border px-4 py-2">
                      {new Date(h.edited_at).toLocaleString()}
                    </td>
                    <td className="border px-4 py-2">{h.invoice_number}</td>
                    <td className="border px-4 py-2">{h.suppliers?.name || "N/A"}</td>
                    <td className="border px-4 py-2">{h.total_amount?.toLocaleString()}</td>
                    <td className="border px-4 py-2">
                      {/* MINI-TABLE FOR ITEMS */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border mt-1">
                          <thead className="bg-gray-200">
                            <tr>
                              <th className="border px-2 py-1">Product</th>
                              <th className="border px-2 py-1">Qty</th>
                              <th className="border px-2 py-1">Price</th>
                              <th className="border px-2 py-1">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {h.items.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="border px-2 py-1 text-center text-gray-500">
                                  No items
                                </td>
                              </tr>
                            ) : (
                              h.items.map((it) => (
                                <tr key={it.id}>
                                  <td className="border px-2 py-1">{products[it.product_id] || `#${it.product_id}`}</td>
                                  <td className="border px-2 py-1">{it.quantity}</td>
                                  <td className="border px-2 py-1">{it.unit_price?.toLocaleString()}</td>
                                  <td className="border px-2 py-1">{it.total_price?.toLocaleString()}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CustomCard>
      )}
    </div>
  </div>
);

};

export default PurchaseHistory;
