import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../../../supabaseClient';
import { toast, Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

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

export default function NewInsurance() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "",
    contact: "",
    status: "active",
    description: ""
  });
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
    if (!form.name) return toast.error("Insurance name is required");
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

      const { error } = await supabase.from("insurance_providers").insert([insertData]);
      if (error) throw error;

      toast.success("Insurance provider added successfully");
      setForm({ name: "", type: "", contact: "", status: "active", description: "" });

    } catch (err) {
      console.error(err);
      toast.error("Failed to add insurance: " + err.message);
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
              to="../insurance"
              className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline"
            >
              <FaArrowLeft /> Back to Insurance List
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-[#2563EB] text-center w-full">
            Add New Insurance Provider
          </h1>
          <p className="text-gray-500 text-sm text-center w-full">
            Fill in the information below to create a new insurance provider.
          </p>
        </CustomCard>

        {/* Form Card */}
        <CustomCard title="Insurance Details">
          <form onSubmit={handleSubmit} className="space-y-6 w-full">

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Insurance Name*</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter insurance provider name"
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Type</label>
              <input
                type="text"
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="Insurance type (e.g., Health, Life)"
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Contact</label>
              <input
                type="text"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="Phone or email"
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder="Optional description"
                className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              ></textarea>
            </div>

            {userInfo && (
              <SummaryCard title="Office" value={userInfo.office_name} />
            )}

            <div className="flex gap-4 mt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#2563EB] text-white px-6 py-2 rounded font-semibold flex items-center justify-center transition"
              >
                {saving ? "Saving..." : "Add Insurance"}
              </button>
              <button
                type="button"
                onClick={() => navigate("../insurance")}
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
