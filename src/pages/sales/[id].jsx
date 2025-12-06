import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from '../../../supabaseClient';
import { FaArrowLeft, FaUser, FaShoppingCart, FaCalendarAlt, FaMoneyBillWave, FaPercent, FaReceipt } from "react-icons/fa";
import { Toaster, toast } from "react-hot-toast";

const SaleDetails = () => {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchSale = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("sales")
          .select(`
            *,
            customers (name, email, phone),
            sale_items (
              id,
              product_id,
              quantity,
              price,
              discount,
              products:products (name)
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        setSale(data);
      } catch (err) {
        setError("Failed to load sale details: " + err.message);
        toast.error("Failed to load sale details");
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id]);

  if (loading) return <p className="p-6 text-gray-600">Loading sale details...</p>;
  if (error) return <p className="p-6 text-red-600 font-semibold">{error}</p>;
  if (!sale) return <p className="p-6 text-gray-600">Sale not found.</p>;

  // Analytics
  const totalProducts = sale.sale_items.reduce((sum, i) => sum + i.quantity, 0);
  const uniqueProducts = new Set(sale.sale_items.map(i => i.product_id)).size; // unique products
  const productSubtotal = sale.sale_items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountTotal = sale.sale_items.reduce((sum, i) => sum + ((i.price * i.quantity) * (i.discount || 0) / 100), 0);

  // Payment status color
  const statusColor = sale.status === "Paid" ? "bg-green-100 text-green-800" :
                      sale.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800";

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
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#ef4444]"}`}>{value}</p>
  </div>
);

return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />

    <div className="max-w-4xl mx-auto bg-white rounded-[12px] shadow p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444] flex items-center gap-2">
          <FaShoppingCart /> Sale Details
        </h1>
        <Link
          to="../sales"
          className="flex items-center gap-2 font-bold text-[#ef4444] hover:underline"
        >
          <FaArrowLeft /> Back to Sales List
        </Link>
      </div>

      {/* Customer Info & Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <FaUser className="text-[#ef4444]" />
          <div>
            <p className="font-semibold">{sale.customers?.name || "N/A"}</p>
            <p className="text-sm text-gray-500">Email: {sale.customers?.email || "-"}</p>
            <p className="text-sm text-gray-500">Phone: {sale.customers?.phone || "-"}</p>
          </div>
        </div>
        <div className="flex flex-col sm:text-right text-sm text-gray-500 gap-1">
          <span className={`px-2 py-1 rounded-full font-semibold text-sm inline-block ${statusColor || 'bg-[#fdeaea] text-[#ef4444]'}`}>
            {sale.status || "Pending"}
          </span>
          <p>Sale ID: <span className="font-semibold">{sale.id}</span></p>
          <p>Date: <span className="font-semibold">{new Date(sale.created_at).toLocaleString()}</span></p>
        </div>
      </div>

      {/* Analytics / Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 text-sm">
        <InfoCard title="Total Products" value={totalProducts} />
        <InfoCard title="Unique Products" value={uniqueProducts} />
        <InfoCard title="Subtotal" value={`${productSubtotal.toLocaleString()} TZS`} />
        <InfoCard title="Total Discount" value={`${discountTotal.toLocaleString()} TZS`} />
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[#ef4444] text-white text-xs uppercase tracking-wider">
            <tr>
              <th className="px-2 sm:px-3 py-2 text-left">Product</th>
              <th className="px-2 sm:px-3 py-2 text-left">Price</th>
              <th className="px-2 sm:px-3 py-2 text-left">Quantity</th>
              <th className="px-2 sm:px-3 py-2 text-left">Discount %</th>
              <th className="px-2 sm:px-3 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.sale_items.map(i => (
              <tr key={i.id} className="border-b hover:bg-[#fdeaea]">
                <td className="px-2 sm:px-3 py-2">{i.products?.name}</td>
                <td className="px-2 sm:px-3 py-2">{i.price.toLocaleString()}</td>
                <td className="px-2 sm:px-3 py-2">{i.quantity}</td>
                <td className="px-2 sm:px-3 py-2">{i.discount || 0}</td>
                <td className="px-2 sm:px-3 py-2 text-right">
                  {(i.price * i.quantity - ((i.price * i.quantity)*(i.discount||0)/100)).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mb-4">
        <Link to={`../sales/receipt/${sale.id}`} className="flex items-center gap-1 px-4 py-2 bg-[#ef4444] text-white rounded-xl hover:bg-[#e03636] shadow">
          <FaReceipt /> Receipt
        </Link>
      </div>

      {/* Grand Total */}
      <div className="text-right text-xl sm:text-2xl font-bold text-[#ef4444]">
        Grand Total: {sale.total_amount.toLocaleString()} TZS
      </div>

    </div>
  </div>
);

};

export default SaleDetails;
