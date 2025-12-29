import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Toaster, toast } from "react-hot-toast";
import { Leaf, CreditCard, Loader2 } from "lucide-react";

const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">
      {title}
    </p>
    <div className="w-full">{children}</div>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-2 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">
        {title}
      </p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

const packages = [
  { label: "Month - 7,000 TZS", value: 7000, days: 30 },
  { label: "3 Months - 20,000 TZS", value: 20000, days: 90 },
  { label: "6 Months - 40,000 TZS", value: 40000, days: 180 },
  { label: "Year - 80,000 TZS", value: 80000, days: 360 },
];

export default function SubscriptionPayment() {
  const [selectedPackage, setSelectedPackage] = useState(packages[0]);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --------------------- Fetch seller info ---------------------
  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        let { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser) {
          return setSellerInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            office_id: systemUser.office_id,
            office_name: systemUser.office_name,
          });
        }

        let { data: employeeUser } = await supabase
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

          return setSellerInfo({
            id: employeeUser.id,
            name: employeeUser.name,
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
        }
      } catch (err) {
        toast.error("Failed to fetch seller information.");
        console.error(err);
      }
    };

    fetchSellerInfo();
  }, []);

// inside SubscriptionPayment component
const handleAirPayPayment = async () => {
  if (!sellerInfo) {
    toast.error("Seller info not found. Please login again.");
    return;
  }

  setIsProcessing(true);

  try {
    // create subscription record first (you already do this)
    const now = new Date().toISOString();
    const { data: subscriptionRecord, error: insertError } = await supabase
      .from("subscriptions")
      .insert([
        {
          office_id: sellerInfo.office_id,
          office_name: sellerInfo.office_name,
          created_by: sellerInfo.name,
          package_label: selectedPackage.label,
          amount: selectedPackage.value,
          package_days: selectedPackage.days,
          status: "pending",
          created_at: now,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // Call your server to create AirPay order and return HTML page
    const resp = await fetch("http://localhost:4000/api/airpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderid: `SUB-${subscriptionRecord.id}`, // or subscriptionRecord.id
        amount: selectedPackage.value,
        buyer_firstname: sellerInfo.name,
        buyer_lastname: "", // optional
        buyer_email: "test@example.com", // replace with real email if available
        buyer_phone: "000000000",
        currency_code: "834",
        iso_currency: "tzs",
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create AirPay order");
    }

    // The server returns an HTML string that auto-posts to AirPay.
    const html = await resp.text();

    // Open a new window and write the HTML into it (this triggers the auto-submit redirect)
    const win = window.open("", "_blank");
    if (!win) throw new Error("Popup blocked. Please allow popups for this site.");
    win.document.open();
    win.document.write(html);
    win.document.close();

    // Optionally: you can poll your backend to check transaction status, or handle callback on your server.

  } catch (err) {
    toast.error("Payment failed: " + (err.message || err.toString()));
    console.error(err);
  } finally {
    setIsProcessing(false);
  }
};




 return (
  <main className="min-h-screen bg-gradient-to-br from-green-50 to-green-200 flex items-center justify-center py-14 px-4">
    <Toaster position="top-center" />

    <section className="w-full max-w-xl bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-8 border border-green-100 animate-fadeIn space-y-6">

      {/* Kichwa */}
      <CustomCard>
        <div className="text-center">
          <Leaf className="mx-auto h-12 w-12 text-[#2563EB]" />
          <h1 className="text-4xl font-extrabold text-[#2563EB] mt-3">
            Malipo ya Usajili
          </h1>
          <p className="text-gray-600 mt-2">
            Chagua kifurushi na maliza malipo yako kwa usalama. Kidokezo: Chagua kifurushi kinachokufaa zaidi.
          </p>
        </div>
      </CustomCard>

      {/* Uchaguzi wa Kifurushi */}
      <FormCard title="Chagua Kifurushi">
        <p className="text-gray-500 text-sm mb-2">
          Kidokezo: Unaweza kuongeza au kupunguza kifurushi wakati wowote.
        </p>
        <select
          className="border border-[#2563EB] rounded-lg p-3 w-full mb-4 bg-white shadow-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
          value={selectedPackage.value}
          onChange={(e) =>
            setSelectedPackage(packages.find((p) => p.value === +e.target.value))
          }
        >
          {packages.map((pkg) => (
            <option key={pkg.value} value={pkg.value}>
              {pkg.label}
            </option>
          ))}
        </select>
      </FormCard>

      {/* Sanduku la Kiasi */}
      <FormCard title="Kiasi cha Kulipwa">
        <p className="text-gray-500 text-sm mb-2">
          Kidokezo: Hakikisha una fedha za kutosha kabla ya kuendelea na malipo.
        </p>
        <div className="p-4 bg-white border border-[#2563EB] rounded-xl text-[#2563EB] font-bold text-center shadow-sm text-2xl">
          {selectedPackage.value} TZS
        </div>
      </FormCard>

      {/* Kitufe cha Malipo */}
      <FormCard>
        <button
          
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Inaprocess...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              Lipa kwa AirPay
            </>
          )}
        </button>

        <p className="mt-4 text-center text-gray-500 text-sm">
          Kidokezo: Usajili wako utaendelea kuwa mpya moja kwa moja baada ya malipo.
        </p>
      </FormCard>

    </section>
  </main>
);


}
