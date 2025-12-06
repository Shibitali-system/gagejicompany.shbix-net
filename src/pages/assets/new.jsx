"use client";

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from '../../../supabaseClient';
import { toast, Toaster } from "react-hot-toast";
import { FaArrowLeft } from "react-icons/fa";

// --- Cards Components ---
const SummaryCard = ({ title, value }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col items-center justify-center
    shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans
    w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className="text-xl font-semibold mt-1 text-[#2563EB]">{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col items-start justify-center
    shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans
    w-full
  ">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);

export default function NewAssetPage() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", quantity: 1, purchase_date: "" });
  const [saving, setSaving] = useState(false);

  // --- Fetch logged-in user ---
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
          setUserInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
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

          setUserInfo({
            id: employeeUser.id,
            name: employeeUser.name,
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
          return;
        }

        toast.error("User info not found");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.purchase_date) {
      return toast.error("Please fill all required fields");
    }
    if (!userInfo) return toast.error("User info not loaded");

    setSaving(true);
    try {
      const insertData = {
        ...form,
        created_by: userInfo.id,
        created_name: userInfo.name,
        office_id: userInfo.office_id,
        office_name: userInfo.office_name,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("assets").insert([insertData]);
      if (error) throw error;

      toast.success("Asset added successfully");
      setForm({ name: "", category: "", quantity: 1, purchase_date: "" });

    } catch (err) {
      console.error(err);
      toast.error("Failed to add asset: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />

      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header Card */}
        <CustomCard>
          <div className="flex justify-start w-full mb-3">
            <Link
              to="../assets"
              className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline"
            >
              <FaArrowLeft /> Back to Assets List
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-[#2563EB] text-center w-full">
            Add New Asset
          </h1>
          <p className="text-gray-500 text-sm text-center w-full">
            Fill in the information below to create a new asset.
          </p>
        </CustomCard>

        {/* Form Card */}
        <CustomCard title="Asset Details">
          <form onSubmit={handleSubmit} className="space-y-6 w-full">

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Name*</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter asset name"
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Category*</label>
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Enter category"
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min={1}
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Purchase Date*</label>
              <input
                type="date"
                name="purchase_date"
                value={form.purchase_date}
                onChange={handleChange}
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>

            {userInfo && (
              <SummaryCard title="Office" value={userInfo.office_name} />
            )}

            <div className="flex gap-4 mt-2">
              <button
                type="submit"
                disabled={saving}
                className={`bg-[#2563EB] text-white px-6 py-2 rounded font-semibold flex items-center justify-center transition`}
              >
                {saving ? "Saving..." : "Add Asset"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/systems/hospital/assets")}
                className="bg-gray-300 px-6 py-2 rounded font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>

          </form>
        </CustomCard>

      </div>
    </div>
  );
}
