import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaArrowLeft, FaUserPlus, FaTimes } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

// Memoized Custom Card
const CustomCard = React.memo(({ title, children }) => (
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
));

// Memoized Input Field
const InputField = React.memo(({ label, value, onChange, type="text", placeholder }) => (
  <div className="w-full">
    <label className="block font-semibold mb-1">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
    />
  </div>
));

const NewCustomer = () => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const initialCustomerData = {
    name: "",
    email: "",
    phone: "",
    address: "",
    type: "Biashara",
  };

  const [newCustomerData, setNewCustomerData] = useState(initialCustomerData);

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("Not authenticated");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) {
          setSellerInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            role: "system",
            office_id: systemUser.office_id,
            office_name: systemUser.office_name,
          });
          return;
        }

        const { data: employeeUser } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employeeUser) {
          const { data: officeData } = await supabase
            .from("systems_users")
            .select("office_id, office_name")
            .eq("office_id", employeeUser.office_id)
            .maybeSingle();

          setSellerInfo({
            id: employeeUser.id,
            name: employeeUser.name,
            role: "employee",
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
          return;
        }

        toast.error("Seller information not found");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name) return toast.error("Customer name is required");
    if (!sellerInfo) return toast.error("User info not loaded");

    setLoading(true);
    try {
      const insertData = {
        ...newCustomerData,
        created_by: sellerInfo.id,
        office_id: sellerInfo.office_id,
        office_name: sellerInfo.office_name,
      };

      const { data: createdCustomer, error } = await supabase
  .from("customers")
  .insert([insertData])
  .select()
  .maybeSingle();

if (error) throw error;

// 🔹 SEND WELCOME SMS
if (createdCustomer?.phone) {
  let cleanPhone = createdCustomer.phone.replace(/\D/g, "");

  if (cleanPhone.startsWith("0")) {
    cleanPhone = "255" + cleanPhone.substring(1);
  }

  if (cleanPhone.startsWith("7") || cleanPhone.startsWith("6")) {
    cleanPhone = "255" + cleanPhone;
  }

  const smsText = `Karibu ${createdCustomer.name}!
Tunafurahi kukuhudumia ${sellerInfo.office_name}.
Uhakika wa huduma bora, ya haraka na yenye viwango vya juu.
Asante kwa kutuchagua.`;

  try {
    const smsRes = await fetch(
      "https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/sms-system",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          office_id: sellerInfo.office_id,
          to: cleanPhone,
          text: smsText,
        }),
      }
    );

    const smsData = await smsRes.json();

    if (!smsRes.ok) {
      console.warn("SMS not sent:", smsData);
      toast.error("Customer created but SMS not sent (balance may be low)");
    }
  } catch (smsErr) {
    console.error("SMS error:", smsErr);
    toast.error("Customer created but SMS failed");
  }
}

      toast.success("Customer created successfully");
      setNewCustomerData(initialCustomerData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create customer: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />

    <div className="max-w-4xl mx-auto space-y-6">

      {/* CARD 1: Back + Title + Tips */}
      <CustomCard>
        <div className="flex items-center mb-3">
          <Link
            to="../customers"
            className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline"
          >
            <FaArrowLeft /> Rudi kwa Wateja
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-center text-[#2563EB]">
          Ongeza Mteja Mpya
        </h1>

        <p className="text-gray-500 text-sm text-center mt-1">
          Jaza taarifa zilizo hapa chini ili kuunda mteja mpya.
        </p>
      </CustomCard>

      {/* FORM */}
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateCustomer();
        }}
      >
        {/* CARD 2: CUSTOMER INFO */}
        <CustomCard title="Taarifa za Mteja">
          <div className="space-y-5 w-full">
            <InputField
              label="Jina *"
              value={newCustomerData.name}
              onChange={e =>
                setNewCustomerData(prev => ({
                  ...prev,
                  name: e.target.value
                }))
              }
              placeholder="Weka jina la mteja"
            />
            <InputField
              label="Barua Pepe (hiari)"
              type="email"
              value={newCustomerData.email}
              onChange={e =>
                setNewCustomerData(prev => ({
                  ...prev,
                  email: e.target.value
                }))
              }
              placeholder="Weka barua pepe"
            />
            <InputField
              label="Namba ya Simu (hiari)"
              value={newCustomerData.phone}
              onChange={e =>
                setNewCustomerData(prev => ({
                  ...prev,
                  phone: e.target.value
                }))
              }
              placeholder="Weka namba ya simu"
            />
            <div className="w-full">
              <label className="block font-semibold mb-1">
                Anuani (hiari)
              </label>
              <textarea
                placeholder="Weka anuani"
                value={newCustomerData.address}
                onChange={e =>
                  setNewCustomerData(prev => ({
                    ...prev,
                    address: e.target.value
                  }))
                }
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div className="w-full">
              <label className="block font-semibold mb-1">
                Aina ya Mteja
              </label>
              <select
                value={newCustomerData.type}
                onChange={e =>
                  setNewCustomerData(prev => ({
                    ...prev,
                    type: e.target.value
                  }))
                }
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="Biashara">Biashara</option>
              </select>
            </div>
          </div>
        </CustomCard>

        {/* CARD 3: OFFICE INFO */}
        {sellerInfo && (
          <CustomCard title="Taarifa za Ofisi">
            <div className="space-y-1 text-sm text-gray-700">
              <p>
                <strong>Ofisi:</strong> {sellerInfo.office_name}
              </p>
              <p>
                <strong>Aliyeingiza:</strong> {sellerInfo.name}
              </p>
            </div>
          </CustomCard>
        )}

        {/* CARD 4: ACTION BUTTONS */}
        <CustomCard>
          <div className="flex flex-col sm:flex-row gap-3 justify-between w-full">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#2563EB] text-white px-6 py-2 rounded-[4px] hover:bg-[#d63a3a] flex items-center justify-center gap-2 font-semibold"
            >
              {loading ? (
                "Inahifadhi..."
              ) : (
                <>
                  <FaUserPlus /> Hifadhi Mteja
                </>
              )}
            </button>
            <Link
              to="../customers"
              className="bg-gray-300 px-6 py-2 rounded-[4px] hover:bg-gray-400 flex items-center justify-center gap-2 font-semibold"
            >
              <FaTimes /> Ghairi
            </Link>
          </div>
        </CustomCard>

      </form>
    </div>
  </div>
);

};

export default NewCustomer;
