import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Toaster, toast } from "react-hot-toast";
import { Leaf, CreditCard, Loader2 } from "lucide-react";

// ---------------- Card Components ----------------
const FormCard = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col gap-3 transition-all duration-200 hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] font-sans w-full">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>}
    <div className="w-full">{children}</div>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col gap-2 transition-all duration-200 hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] font-sans w-full">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">{title}</p>}
    <div className="w-full">{children}</div>
  </div>
);

// ---------------- Packages ----------------
const mainPackages = [
  { label: "Month - 7,000 TZS", value: 7000, days: 30 },
  { label: "3 Months - 19,000 TZS", value: 19000, days: 90 },
  { label: "6 Months - 36,000 TZS", value: 36000, days: 180 },
  { label: "Year - 70,000 TZS", value: 70000, days: 360 },
];

const branchPackages = [
  { label: "Month - 4,000 TZS", value: 4000, days: 30 },
  { label: "3 Months - 11,000 TZS", value: 11000, days: 90 },
  { label: "6 Months - 20,000 TZS", value: 20000, days: 180 },
  { label: "Year - 38,000 TZS", value: 38000, days: 360 },
];

// ---------------- Validation Functions ----------------
const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length >= 6 && email.length <= 50;
const validatePhone = (phone) => /^[0-9]{8,15}$/.test(phone); // digits only
const validateName = (name) => /^[A-Za-z0-9 ]{1,50}$/.test(name);
const validateAddress = (addr) => /^[A-Za-z0-9 ,;.#$\\/()_-]{4,50}$/.test(addr);
const validateCityStateCountry = (text) => /^[A-Za-z0-9 ]{2,50}$/.test(text);
const validatePinCode = (pin) => /^[A-Za-z0-9]{4,8}$/.test(pin);
const validateAmount = (amt) => /^\d+(\.\d{2})?$/.test(amt); // 2 decimals
const validateOrderId = (id) => /^[A-Za-z0-9]{1,20}$/.test(id);

// ---------------- Main Component ----------------
export default function SubscriptionPayment() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Determine if this seller is a branch
  const isBranch = sellerInfo?.office_id?.includes("-BRANCH-");
  const availablePackages = isBranch ? branchPackages : mainPackages;

  // ---------------- Fetch Seller Info ----------------
  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        setUserEmail(authData?.user?.email || null);

        // Check if user is system user
        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser) {
          setUserPhone(systemUser.customer_phone || null);
          return setSellerInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            office_id: systemUser.office_id,
            office_name: systemUser.office_name,
          });
        }

        // Check if user is employee
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

          setUserPhone(employeeUser.phone || null);
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

  // ---------------- Set Initial Package ----------------
  useEffect(() => {
    if (!sellerInfo) return;
    const isBranchUser = sellerInfo.office_id.includes("-BRANCH-");
    setSelectedPackage(isBranchUser ? branchPackages[0] : mainPackages[0]);
  }, [sellerInfo]);

  // ---------------- Normalize Phone ----------------
  const normalizePhoneForAirPay = (phone) => {
    if (!phone) return "";
    let p = phone.toString().trim();
    if (p.startsWith("+")) p = p.slice(1);
    if (p.startsWith("255")) p = p.slice(3);
    if (p.startsWith("0")) p = p.slice(1);
    return p;
  };

  // ---------------- Handle Payment ----------------
  const handleAirPayPayment = async () => {
    if (!sellerInfo) {
      toast.error("Seller info not found. Please login again.");
      return;
    }

    const firstName = sellerInfo.name.split(" ")[0] || "First";
    const lastName = sellerInfo.name.split(" ")[1] || "Last";
    const phoneForAirPay = normalizePhoneForAirPay(userPhone);

    // Validate
    if (
      !validateEmail(userEmail) ||
      !validatePhone(phoneForAirPay) ||
      !validateName(firstName) ||
      !validateName(lastName)
    ) {
      toast.error("Invalid user info. Check email, phone (start with 255) or name.");
      return;
    }

    setIsProcessing(true);

    try {
      const now = new Date().toISOString();

      // Insert pending subscription
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

      // Prepare AirPay URL
      const params = new URLSearchParams({
        buyerEmail: userEmail,
        buyerPhone: phoneForAirPay,
        buyerFirstName: firstName,
        buyerLastName: lastName,
        buyerAddress: "N/A",
        buyerCity: "Dar es Salaam",
        buyerState: "Dar es Salaam",
        buyerCountry: "Tanzania",
        buyerPinCode: "123456",
        orderid: `SUB-${subscriptionRecord.id}`,
        amount: selectedPackage.value.toFixed(2),
        customvar: "Live AirPay Payment",
        txnsubtype: 1000,
        wallet: 1,
        currency: 834,
        isocurrency: "TZS",
      });

      const airpayWindow = window.open(
        `https://airpay-gateway.onrender.com/txn?${params.toString()}`,
        "_blank"
      );

      if (!airpayWindow) throw new Error("Popup blocked! Please allow popups.");

      toast.success("AirPay checkout opened! Complete payment in the new window.");
    } catch (err) {
      toast.error("Failed to initiate AirPay payment: " + (err.message || err.toString()));
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------------- Render ----------------
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-green-200 flex items-center justify-center py-14 px-4">
      <Toaster position="top-center" />

      <section className="w-full max-w-xl bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-8 border border-green-100 animate-fadeIn space-y-6">

        {/* Header Card */}
        <CustomCard>
          <div className="text-center">
            <Leaf className="mx-auto h-12 w-12 text-[#2563EB]" />
            <h1 className="text-4xl font-extrabold text-[#2563EB] mt-3">Subscription Payment</h1>
            <p className="text-gray-600 mt-2">
              Select a package and complete your payment securely.
            </p>
          </div>
        </CustomCard>

        {/* Package Selection */}
        <FormCard title="Choose Package">
          <p className="text-gray-500 text-sm mb-2">
            Tip: You can upgrade or downgrade your package anytime.
          </p>
          <select
            className="border border-[#2563EB] rounded-lg p-3 w-full mb-4 bg-white shadow-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
            value={selectedPackage?.value || ""}
            onChange={(e) =>
              setSelectedPackage(
                availablePackages.find((p) => p.value === +e.target.value)
              )
            }
          >
            {availablePackages.map((pkg) => (
              <option key={pkg.value} value={pkg.value}>
                {pkg.label}
              </option>
            ))}
          </select>
        </FormCard>

        {/* Amount Display */}
        {selectedPackage && (
          <FormCard title="Amount to Pay">
            <div className="p-4 bg-white border border-[#2563EB] rounded-xl text-[#2563EB] font-bold text-center shadow-sm text-2xl">
              {selectedPackage.value.toFixed(2)} TZS
            </div>
          </FormCard>
        )}

        {/* Payment Options */}
        <FormCard title="Pay With">
          <div className="flex flex-col gap-4">
            {[
              { name: "Airtel Money", logo: "/airtel-logo.png", color: "#E60000", onClick: handleAirPayPayment },
              { name: "Mixx by Yas", logo: "/mixx-logo.png", color: "#1E40AF", onClick: handleAirPayPayment },
            ].map((provider, index) => (
              <label
                key={index}
                className="flex items-center gap-4 p-2 border rounded-xl cursor-pointer hover:shadow-md transition-shadow duration-200"
                style={{
                  borderColor: selectedPayment === provider.name ? provider.color : "#E5E7EB",
                }}
                onClick={() => {
                  setSelectedPayment(provider.name); // set selected payment
                  provider.onClick(); // trigger payment
                }}
              >
                {/* Radio */}
                <input
                  type="radio"
                  name="payment"
                  value={provider.name}
                  checked={selectedPayment === provider.name}
                  onChange={() => setSelectedPayment(provider.name)}
                  className="w-5 h-5 text-blue-600 accent-blue-600"
                />

                {/* Logo */}
                <img
                  src={provider.logo}
                  alt={provider.name}
                  className="h-12 w-12 object-contain cursor-pointer"
                />

                {/* Provider name */}
                <span className="text-gray-700 font-semibold">{provider.name}</span>
              </label>
            ))}
          </div>

          <p className="mt-4 text-center text-gray-500 text-sm">
            Tip: Your subscription will be updated automatically after payment.
          </p>
        </FormCard>

      </section>
    </main>
  );
}
