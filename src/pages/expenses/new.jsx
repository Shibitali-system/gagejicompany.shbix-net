import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { sendNotification } from "../utils/sendNotification";
import { FaArrowLeft, FaPlus, FaTimes } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

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

const NewExpense = () => {
  const [sellerInfo, setSellerInfo] = useState(null); 
  const [loading, setLoading] = useState(false);

  const initialExpenseData = {
    name: "",
    amount: "",
    category: "",
    description: "",
  };

  const [newExpenseData, setNewExpenseData] = useState(initialExpenseData);

  // Fetch logged-in user to set office and entered_by
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

        toast.error("User information not found");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  // Handle creating a new expense (with notifications)
const handleCreateExpense = async () => {
  if (!newExpenseData.name) return toast.error("Expense name is required");
  if (!newExpenseData.amount) return toast.error("Amount is required");
  if (!sellerInfo) return toast.error("User info not loaded");

  setLoading(true);
  try {
    const insertData = {
      ...newExpenseData,
      created_by: sellerInfo.id,
      office_id: sellerInfo.office_id,
      office_name: sellerInfo.office_name,
      amount: parseFloat(newExpenseData.amount),
    };

    // 1️⃣ Insert into database
    const { data: expense, error } = await supabase
      .from("systems_expenses")
      .insert([insertData])
      .select()
      .maybeSingle();

    if (error) throw error;

    // 2️⃣ Send in-app + push notification
    await sendNotification({
      auth_user_id: sellerInfo.id,
      office_id: sellerInfo.office_id,
      title: "New Expense Recorded",
      message: `${sellerInfo.name} added a new expense: ${newExpenseData.name} (${newExpenseData.amount})`,
      link: "/pharmacy/dashboard/expenses", // link to expenses page
      type: "both", // in-app + push
    });

    // 3️⃣ Browser notification
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("New Expense Recorded", {
          body: `${sellerInfo.name} added a new expense: ${newExpenseData.name} (${newExpenseData.amount})`,
        });
      } else if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }

    toast.success("Expense created successfully");
    setNewExpenseData(initialExpenseData);

  } catch (err) {
    console.error(err);
    toast.error("Failed to create expense: " + err.message);
  } finally {
    setLoading(false);
  }
};

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Back Link */}
      <Link to="../expenses" className="flex items-center gap-2 font-bold text-[#ef4444] hover:underline">
        <FaArrowLeft /> Back to Expenses
      </Link>

      {/* Page Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444]">Add New Expense</h1>

      {/* Form Card */}
      <FormCard>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreateExpense(); }}>

          {/* Expense Name */}
          <div>
            <label className="block font-semibold mb-1">Expense Name *</label>
            <input
              type="text"
              placeholder="Enter expense name"
              value={newExpenseData.name}
              onChange={e => setNewExpenseData({ ...newExpenseData, name: e.target.value })}
              className="border border-[#e5e7eb] px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block font-semibold mb-1">Amount *</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={newExpenseData.amount}
              onChange={e => setNewExpenseData({ ...newExpenseData, amount: e.target.value })}
              className="border border-[#e5e7eb] px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold mb-1">Category</label>
            <select
              value={newExpenseData.category}
              onChange={e => setNewExpenseData({ ...newExpenseData, category: e.target.value })}
              className="border border-[#e5e7eb] px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
            >
              <option value="">Select category</option>
              {[
                "Office Supplies",
                "Travel",
                "Meals & Entertainment",
                "Maintenance & Repairs",
                "Utilities",
                "Marketing & Advertising",
                "Transportation",
                "Software & Subscriptions",
                "Professional Services",
                "Other"
              ].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold mb-1">Description (optional)</label>
            <textarea
              placeholder="Enter description"
              value={newExpenseData.description}
              onChange={e => setNewExpenseData({ ...newExpenseData, description: e.target.value })}
              className="border border-[#e5e7eb] px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
            />
          </div>

          {/* Office & Entered By (read-only) */}
          {sellerInfo && (
            <div className="space-y-1 text-sm text-gray-700">
              <p><strong>Office:</strong> {sellerInfo.office_name}</p>
              <p><strong>Entered By:</strong> {sellerInfo.name}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#ef4444] text-white px-6 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2 transition"
            >
              {loading ? "Creating..." : <><FaPlus /> Create Expense</>}
            </button>
            <Link
              to="/expenses"
              className="bg-gray-300 px-6 py-2 rounded-xl hover:bg-gray-400 flex items-center gap-2 transition"
            >
              <FaTimes /> Cancel
            </Link>
          </div>
        </form>
      </FormCard>
    </div>
  </div>
);

};

export default NewExpense;
