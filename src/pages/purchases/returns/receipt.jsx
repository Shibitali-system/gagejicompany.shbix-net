import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from '../../../../supabaseClient';
import { FaArrowLeft, FaPrint, FaShoppingCart, FaUser, FaBoxOpen, FaMoneyBillWave } from "react-icons/fa";
import { Toaster, toast } from "react-hot-toast";

const ReturnReceiptPage = () => {
  const { saleId } = useParams();
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    if (!saleId) return;

    const fetchReturn = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("sales_returns")
          .select(`
            *,
            sales(id, created_at, customers(name, email, phone)),
            products:pharmacy_products(id,name,price)
          `)
          .eq("sale_id", saleId);

        if (error) throw error;
        setReturnData(data);
      } catch (err) {
        toast.error("Failed to fetch return details: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReturn();
  }, [saleId]);

  if (loading) return <p className="p-6 text-gray-600">Loading return receipt...</p>;
  if (!returnData || returnData.length === 0) return <p className="p-6 text-red-600 font-semibold">No return found for this sale.</p>;

  // Calculate totals
  const totalQty = returnData.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = returnData.reduce((sum, item) => {
    const price = item.products?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const sale = returnData[0].sales;
  const customer = sale.customers;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
  <div className="min-h-screen bg-green-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-4xl mx-auto">

      {/* KICHWA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-green-700 flex items-center gap-2">
          <FaBoxOpen /> Risiti ya Kurudisha
        </h1>
        <div className="flex gap-2">
          <Link to="/dashboard/sales/returns" className="flex items-center gap-2 font-bold text-green-600 hover:underline">
            <FaArrowLeft /> Rudi kwenye Orodha ya Kurudisha
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-xl hover:bg-green-700 shadow"
          >
            <FaPrint /> Chapisha Risiti
          </button>
        </div>
      </div>

      {/* YALIYOPO KATIKA RISITI */}
      <div ref={printRef} className="bg-white rounded-2xl shadow p-6">

        {/* Taarifa za Mteja & Manunuzi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <h2 className="font-semibold text-green-700 flex items-center gap-2"><FaUser /> Taarifa za Mteja</h2>
            <p>Jina: <span className="font-semibold">{customer?.name}</span></p>
            <p>Email: <span className="font-semibold">{customer?.email || "-"}</span></p>
            <p>Namba ya Simu: <span className="font-semibold">{customer?.phone || "-"}</span></p>
          </div>
          <div className="text-left sm:text-right">
            <h2 className="font-semibold text-green-700 flex items-center gap-2"><FaShoppingCart /> Taarifa za Manunuzi</h2>
            <p>ID ya Manunuzi: <span className="font-semibold">{sale?.id}</span></p>
            <p>Tarehe: <span className="font-semibold">{new Date(sale?.created_at).toLocaleString()}</span></p>
          </div>
        </div>

        {/* Muhtasari */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-green-50 rounded-2xl p-4 text-center shadow">
            <p className="text-gray-500 flex items-center justify-center gap-1"><FaBoxOpen /> Jumla ya Idadi ya Kurudishwa</p>
            <p className="font-bold text-green-700 text-lg">{totalQty}</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 text-center shadow">
            <p className="text-gray-500 flex items-center justify-center gap-1"><FaMoneyBillWave /> Thamani ya Jumla ya Kurudishwa</p>
            <p className="font-bold text-green-700 text-lg">{totalValue.toLocaleString()} TZS</p>
          </div>
        </div>

        {/* Jedwali la Bidhaa */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-green-600 text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Bidhaa</th>
                <th className="px-3 py-2 text-left">Idadi</th>
                <th className="px-3 py-2 text-left">Bei ya Kila Kipande</th>
                <th className="px-3 py-2 text-right">Jumla Ndogo</th>
              </tr>
            </thead>
            <tbody>
              {returnData.map(item => (
                <tr key={item.id} className="border-b hover:bg-green-50">
                  <td className="px-3 py-2">{item.products?.name || "-"}</td>
                  <td className="px-3 py-2">{item.quantity}</td>
                  <td className="px-3 py-2">{item.products?.price?.toLocaleString() || 0}</td>
                  <td className="px-3 py-2 text-right">{((item.products?.price || 0) * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Jumla Kuu */}
        <div className="text-right text-xl sm:text-2xl font-bold text-green-700 mt-4">
          Jumla Kuu: {totalValue.toLocaleString()} TZS
        </div>

      </div>
    </div>
  </div>
);

};

export default ReturnReceiptPage;
