import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaDownload, FaPrint, FaShareAlt, FaArrowLeft, FaBoxOpen } from "react-icons/fa";

import { toast, Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";



// Default fallback if receipt settings not found
const defaultReceiptInfo = {
  office_name: "Pharmacy Office",
  address: "Your address here",
  phone: "000-000-000",
  email: "office@example.com",
  logo_url: "",
};

// Function to fetch sale_items in batches
const fetchSaleItemsInBatches = async (saleId) => {
  const allItems = [];
  let offset = 0;
  const limit = 1000;
  let batch = [];

  do {
    const { data, error } = await supabase
      .from("sale_items")
      .select("*, product:product_id(name, price)")
      .eq("sale_id", saleId)
      .range(offset, offset + limit - 1);

    if (error) throw error;
    batch = data || [];
    allItems.push(...batch);
    offset += limit;
  } while (batch.length === limit);

  return allItems;
};

const ReceiptPage = () => {
  const { saleId } = useParams();
  const [sale, setSale] = useState(null);
  const [receiptInfo, setReceiptInfo] = useState(defaultReceiptInfo);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef();

  // -------------------- Inject print CSS --------------------
  useEffect(() => {
    const printStyles = `
      @media print {
        body * { visibility: hidden; }
        #receipt-print, #receipt-print * { visibility: visible; }
        #receipt-print { position: absolute; left:0; top:0; width:100%; padding:0; }
      }
    `;
    const style = document.createElement("style");
    style.innerHTML = printStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (saleId && !isNaN(Number(saleId))) {
      fetchSale(Number(saleId));
    } else {
      toast.error("Invalid sale ID");
      setLoading(false);
    }
  }, [saleId]);

  const fetchSale = async (id) => {
    setLoading(true);
    try {
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select("*, customer:customer_id(name, phone, address)")
        .eq("id", id)
        .maybeSingle();
      if (saleError) throw saleError;
      if (!saleData) {
        toast.error("Sale not found");
        setLoading(false);
        return;
      }
      setSale(saleData);
      const items = await fetchSaleItemsInBatches(id);
      setSale((prev) => ({ ...prev, sale_items: items }));

      // Fetch receipt info
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser) throw new Error("Failed to get authenticated user.");

      let officeId = null;
      const { data: systemUser } = await supabase
        .from("systems_users")
        .select("office_id")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();
      if (systemUser?.office_id) officeId = systemUser.office_id;
      else {
        const { data: employee } = await supabase
          .from("employees")
          .select("office_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();
        if (employee?.office_id) officeId = employee.office_id;
      }

      if (officeId) {
        const { data: receiptData, error: receiptError } = await supabase
          .from("receipt_settings")
          .select("*")
          .eq("office_id", officeId)
          .maybeSingle();
        if (receiptError) throw receiptError;
        setReceiptInfo(receiptData || defaultReceiptInfo);
      } else {
        setReceiptInfo(defaultReceiptInfo);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sale or receipt info: " + err.message);
      setReceiptInfo(defaultReceiptInfo);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`receipt_${saleId || "new"}.pdf`);
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message);
    }
  };

  const handleShare = () => {
    if (navigator.share && sale) {
      navigator
        .share({
          title: `Receipt #${saleId}`,
          text: `Receipt for sale #${saleId} | Customer: ${sale?.customer?.name || "Unknown"}`,
          url: window.location.href,
        })
        .catch((err) => toast.error("Share failed: " + err.message));
    } else {
      toast("Share not supported on this device");
    }
  };

  if (loading) return <p className="p-4 text-gray-600">Loading receipt...</p>;

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
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#ef4444]"}`}>{value}</p>
  </div>
);

return (
  <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
    <Toaster position="top-right" />

    {/* Header + Tips + Action Buttons Card */}
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444] flex items-center gap-2">
          <FaBoxOpen /> Sales Receipt
        </h1>
        <Link
          to="../sales"
          className="text-[#ef4444] hover:underline flex items-center gap-1 font-bold"
        >
          <FaArrowLeft /> Back to Sales List
        </Link>
      </div>

      {/* Tips */}
      <p className="text-gray-500 text-sm">
        Tip: Click "Edit Receipt Info" to set up office info for receipts if not yet. Use the buttons below to print, download or share the receipt.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-start sm:justify-end gap-3">
        <button
          onClick={handlePrint}
          className="bg-[#ef4444] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#e3342f] shadow"
        >
          <FaPrint /> Print
        </button>
        <button
          onClick={handleDownloadPDF}
          className="bg-[#ef4444] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#e3342f] shadow"
        >
          <FaDownload /> Download PDF
        </button>
        <button
          onClick={handleShare}
          className="bg-[#ef4444] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#e3342f] shadow"
        >
          <FaShareAlt /> Share
        </button>
        <Link
          to="../sales/receipts/settings"
          className="bg-[#ef4444] text-white px-4 py-2 rounded-xl hover:bg-[#e3342f] shadow flex items-center gap-2"
        >
          Edit Receipt Info
        </Link>
      </div>
    </div>

    {/* Receipt Card */}
    <div
      ref={receiptRef}
      id="receipt-print"
      className="bg-white rounded-2xl shadow-lg max-w-3xl mx-auto p-8 border border-gray-200 mt-6 print:shadow-none print:border-none"
    >
      {/* Header */}
      <div className="text-center border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold text-[#ef4444] uppercase tracking-wide mb-2">
          {receiptInfo.office_name || defaultReceiptInfo.office_name}
        </h1>
        {receiptInfo.logo_url && (
          <img
            src={receiptInfo.logo_url}
            alt="Office Logo"
            className="mx-auto h-20 object-contain mb-2"
            onError={(e) => (e.target.style.display = "none")}
          />
        )}
        <p className="text-gray-600 mt-1">{receiptInfo.address || defaultReceiptInfo.address}</p>
        <p className="text-gray-600">
          Phone: {receiptInfo.phone || defaultReceiptInfo.phone} | Email: {receiptInfo.email || defaultReceiptInfo.email}
        </p>
        <h2 className="mt-4 text-xl font-semibold text-gray-700">Official Sales Receipt</h2>
        <p className="text-sm text-gray-500">Receipt No: {sale?.id || "N/A"}</p>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
        <div className="space-y-1">
          <p className="font-semibold text-gray-700">Customer Information</p>
          <p>{sale?.customer?.name || "-"}</p>
          <p>{sale?.customer?.phone || "-"}</p>
          <p>{sale?.customer?.address || "-"}</p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="font-semibold text-gray-700">Sale Date:</p>
          <p>{sale?.created_at ? new Date(sale.created_at).toLocaleString() : "-"}</p>
          <p className="font-semibold text-gray-700 mt-2">Payment Method:</p>
          <p>{sale?.payment_method || "-"}</p>
          <p className="font-semibold text-gray-700 mt-2">Payment Status:</p>
          <p>{sale?.payment_status || "-"}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-[#ef4444] text-white">
            <tr>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-center">Qty</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Discount</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale?.sale_items?.length > 0 ? (
              sale.sale_items.map((item) => {
                const subtotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
                return (
                  <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2">{item.product?.name}</td>
                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{item.price.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{item.discount || 0}%</td>
                    <td className="px-3 py-2 text-right">{subtotal.toLocaleString()}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">No items yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex flex-col items-end text-sm">
        <p>
          Subtotal: <span className="font-semibold">TZS {sale ? (sale.total_amount - (sale.discount_value || 0)).toLocaleString() : "0"}</span>
        </p>
        <p>
          Discount: <span className="font-semibold">TZS {sale?.discount_value?.toLocaleString() || "0"}</span>
        </p>
        <p className="text-lg font-bold text-[#ef4444] mt-2">
          Grand Total: TZS {sale?.total_amount?.toLocaleString() || "0"}
        </p>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 border-t pt-4 text-sm text-gray-500">
        <p>Thank you for your purchase!</p>
        <p className="text-xs mt-1 italic">Goods once sold are not returnable without authorization.</p>
      </div>
    </div>
  </div>
);

};

export default ReceiptPage;
