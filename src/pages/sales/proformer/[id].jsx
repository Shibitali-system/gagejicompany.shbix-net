import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../../supabaseClient";
import { FaDownload, FaPrint, FaShareAlt, FaArrowLeft } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

const defaultReceiptInfo = {
  office_name: "Pharmacy Office",
  address: "Your address here",
  phone: "000-000-000",
  email: "office@example.com",
  logo_url: "",
};

// Fetch all proformer items in batches to avoid limit 1000
const fetchProformerItemsInBatches = async (proformerId) => {
  const allItems = [];
  let offset = 0;
  const limit = 1000;
  let batch = [];

  do {
    const { data, error } = await supabase
      .from("proformer_items")
      .select("*, product:product_id(name, price)")
      .eq("proformer_id", proformerId)
      .range(offset, offset + limit - 1);

    if (error) throw error;
    batch = data || [];
    allItems.push(...batch);
    offset += limit;
  } while (batch.length === limit);

  return allItems;
};

const ProformerView = () => {
  const { id } = useParams();
  const [proformer, setProformer] = useState(null);
  const [receiptInfo, setReceiptInfo] = useState(defaultReceiptInfo);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef();

  const fetchProformer = useCallback(async (proformerId) => {
    setLoading(true);
    try {
      const { data: pData, error: pError } = await supabase
        .from("proformer")
        .select("*")
        .eq("id", proformerId)
        .maybeSingle();

      if (pError) throw pError;
      if (!pData) {
        toast.error("Proformer not found");
        setLoading(false);
        return;
      }

      const customerPromise =
        pData.customer_id != null
          ? supabase
              .from("customers")
              .select("name")
              .eq("id", pData.customer_id)
              .maybeSingle()
          : Promise.resolve({ data: null });

      const itemsPromise = fetchProformerItemsInBatches(proformerId);

      const [customerRes, items] = await Promise.all([
        customerPromise,
        itemsPromise,
      ]);

      setProformer({
        ...pData,
        customer_name: customerRes?.data?.name || "-",
        items,
      });

      const { data: { user: authUser } = {} } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Failed to get authenticated user");

      let officeId = null;
      const { data: sysUser } = await supabase
        .from("systems_users")
        .select("office_id")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (sysUser?.office_id) officeId = sysUser.office_id;
      else {
        const { data: emp } = await supabase
          .from("employees")
          .select("office_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();
        if (emp?.office_id) officeId = emp.office_id;
      }

      if (officeId) {
        const { data: receiptData } = await supabase
          .from("receipt_settings")
          .select("*")
          .eq("office_id", officeId)
          .maybeSingle();
        setReceiptInfo(receiptData || defaultReceiptInfo);
      } else setReceiptInfo(defaultReceiptInfo);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load proformer: " + err.message);
      setReceiptInfo(defaultReceiptInfo);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchProformer(id);
    else {
      toast.error("Invalid Proformer ID");
      setLoading(false);
    }
  }, [id, fetchProformer]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const rows = Array.from(receiptRef.current.querySelectorAll("tbody tr"));
      const chunkSize = 20; // rows per PDF page
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const tempDiv = document.createElement("div");
        tempDiv.style.width = receiptRef.current.offsetWidth + "px";
        tempDiv.appendChild(
          receiptRef.current.querySelector("thead").cloneNode(true)
        );
        chunk.forEach((row) => tempDiv.appendChild(row.cloneNode(true)));
        document.body.appendChild(tempDiv);

        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
        if (i + chunkSize < rows.length) pdf.addPage();

        document.body.removeChild(tempDiv);
      }

      pdf.save(`proformer_${id}.pdf`);
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message);
    }
  };

  const handleShare = async () => {
    if (navigator.share && proformer) {
      navigator
        .share({
          title: `Proformer #${id}`,
          text: `Proformer for ${proformer?.customer_name || "Unknown"}`,
          url: window.location.href,
        })
        .catch((err) => toast.error("Share failed: " + err.message));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading)
    return <p className="p-4 text-gray-600">Loading proformer...</p>;

  // ---------------------- Summary / Info Card Component ----------------------
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
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
  </div>
);

return (
  <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
    <Toaster position="top-right" />

    {/* Kiungo cha Kurudi */}
    <Link to="../sales/proformer" className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline mb-4">
      <FaArrowLeft /> Rudi kwenye Orodha ya Proformers
    </Link>

    {/* Vitufe vya Vitendo */}
    <div className="flex flex-wrap justify-center sm:justify-end gap-3 mb-6 print:hidden">
      <button onClick={handlePrint} className="bg-[#2563EB] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#e03636] shadow">
        <FaPrint /> Print
      </button>
      
    </div>

    {/* Kadi ya Risiti / Ankara */}
    <div ref={receiptRef} id="receipt-print" className="bg-white rounded-[12px] shadow-lg max-w-3xl mx-auto p-8 border border-[#e5e7eb] print:shadow-none print:border-none">

      {/* Kichwa */}
      <div className="text-center border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold text-[#2563EB] uppercase tracking-wide mb-2">{receiptInfo.office_name}</h1>
        {receiptInfo.logo_url && <img src={receiptInfo.logo_url} alt="Nembo ya Ofisi" className="mx-auto h-20 object-contain mb-2" />}
        <p className="text-gray-500 mt-1">{receiptInfo.address}</p>
        <p className="text-gray-500">Simu: {receiptInfo.phone} | Email: {receiptInfo.email}</p>
        <h2 className="mt-4 text-xl font-semibold text-gray-700">Ankara ya Proformer</h2>
        <p className="text-sm text-gray-500">Namba ya Proformer: {proformer?.id}</p>
      </div>

      {/* Taarifa za Mteja & Hali */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
        <div className="space-y-1">
          <p className="font-semibold text-gray-700">Mteja</p>
          <p>{proformer?.customer_name || "-"}</p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="font-semibold text-gray-700">Iliundwa:</p>
          <p>{proformer?.created_at ? new Date(proformer.created_at).toLocaleString() : "-"}</p>
          <p className="font-semibold text-gray-700 mt-2">Hali:</p>
          <p>{proformer?.status || "Inasubiri"}</p>
        </div>
      </div>

      {/* Jedwali la Bidhaa */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border border-[#e5e7eb] text-sm">
          <thead className="bg-[#2563EB] text-white">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Bidhaa</th>
              <th className="px-3 py-2 text-center">Kiasi</th>
              <th className="px-3 py-2 text-right">Bei</th>
              <th className="px-3 py-2 text-right">Jumla Ndogo</th>
            </tr>
          </thead>
          <tbody>
            {proformer?.items?.length > 0 ? (
              proformer.items.map((item, index) => {
                const subtotal = (item.product?.price ?? 0) * (item.quantity ?? 0);
                return (
                  <tr key={item.id} className="border-t border-[#e5e7eb] hover:bg-[#fdeaea]">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{item.product?.name}</td>
                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{(item.product?.price ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{subtotal.toLocaleString()}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">Hakuna bidhaa bado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Jumla */}
      <div className="flex flex-col items-end text-sm mb-6">
        <p>Jumla Kuu: <span className="font-bold text-[#2563EB]">{proformer?.total_amount?.toLocaleString() || 0} TZS</span></p>
        {proformer?.status_comment && <p className="text-xs text-gray-500 italic mt-1">Maoni: {proformer.status_comment}</p>}
      </div>

      {/* Miguso / Maelezo ya Mwisho */}
      <div className="text-center mt-8 border-t pt-4 text-sm text-gray-500">
        <p>Asante kwa biashara yako!</p>
        <p className="text-xs mt-1 italic">Bidhaa baada ya kuuzwa haiwezi kurudishwa bila idhini.</p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          #receipt-print thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #receipt-print thead th { background-color: #2563EB !important; color: #ffffff !important; }
        }
      `}</style>
    </div>
  </div>
);

};

export default ProformerView;
