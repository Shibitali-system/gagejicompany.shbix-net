import { useEffect, useState, useRef } from "react";
import { supabase } from "../../../../supabaseClient"; // Adjusted path
import SaleReceipt from "../../components/SaleReceipt";
import { useReactToPrint } from "react-to-print";

export default function ReceiptPage() {
  const [id, setId] = useState(null);
  const [sale, setSale] = useState(null);
  const [customer, setCustomer] = useState(null);
  const receiptRef = useRef();

  // Get sale ID from URL
  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const saleId = pathParts[pathParts.length - 1];
    setId(saleId);
  }, []);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt_${id}`,
  });

  useEffect(() => {
    if (!id) return;

    const fetchSale = async () => {
      // Fetch sale
      let { data: saleData, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching sale:", error);
        return;
      }
      setSale(saleData);

      // Fetch customer if exists
      if (saleData.customer_id) {
        const { data: customerData, error: custError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", saleData.customer_id)
          .single();

        if (custError) console.error(custError);
        else setCustomer(customerData);
      }
    };

    fetchSale();
  }, [id]);

  if (!sale) return <div className="p-4">Loading receipt...</div>;

  return (
    <div className="p-4">
      <div ref={receiptRef}>
        <SaleReceipt sale={sale} customer={customer} />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Print Receipt
        </button>
        {/* Optional: Export PDF button can be added here */}
      </div>
    </div>
  );
}
