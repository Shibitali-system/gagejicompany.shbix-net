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

const RequestExpense = () => {
  const [userInfo, setUserInfo] = useState(null); 
  const [loading, setLoading] = useState(false);

  const initialRequestData = {
    name: "",
    amount: "",
    category: "",
    description: "",
  };

  const [newRequestData, setNewRequestData] = useState(initialRequestData);

  // Fetch logged-in user info
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

          setUserInfo({
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

  // Handle creating a new request (with notifications)
const handleCreateRequest = async () => {
  if (!newRequestData.name) return toast.error("Expense name is required");
  if (!newRequestData.amount) return toast.error("Amount is required");
  if (!userInfo) return toast.error("User info not loaded");

  setLoading(true);
  try {
    const insertData = {
      ...newRequestData,
      created_by: userInfo.id,
      office_id: userInfo.office_id,
      office_name: userInfo.office_name,
      amount: parseFloat(newRequestData.amount),
      status: "pending", // default status
    };

    // 1️⃣ Insert into database
    const { data: request, error } = await supabase
      .from("request_expenses")
      .insert([insertData])
      .select()
      .maybeSingle();

    if (error) throw error;

    // 2️⃣ Send in-app + push notification
    await sendNotification({
      auth_user_id: userInfo.id,
      office_id: userInfo.office_id,
      title: "New Expense Request",
      message: `${userInfo.name} submitted a new expense request: ${newRequestData.name} (${newRequestData.amount})`,
      link: "/pharmacy/dashboard/requests", // link to requests page
      type: "both", // in-app + push
    });

    // 3️⃣ Browser notification
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("New Expense Request", {
          body: `${userInfo.name} submitted a new expense request: ${newRequestData.name} (${newRequestData.amount})`,
        });
      } else if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }

    toast.success("Expense request submitted successfully");
    setNewRequestData(initialRequestData);

  } catch (err) {
    console.error(err);
    toast.error("Failed to create request: " + err.message);
  } finally {
    setLoading(false);
  }
};


  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />

    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link to="../expenses/expensesindex" className="flex items-center gap-2 font-bold text-[#ef4444] hover:underline">
          <FaArrowLeft /> Back to Expense Requests
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444]">Request New Expense</h1>
      </div>

      {/* Form Card */}
      <FormCard title="Expense Request Details">
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreateRequest(); }}>

          {/* Name */}
          <div>
            <label className="block font-semibold mb-1">Expense Name *</label>
            <input
              type="text"
              placeholder="Enter expense name"
              value={newRequestData.name}
              onChange={e => setNewRequestData({ ...newRequestData, name: e.target.value })}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block font-semibold mb-1">Amount *</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={newRequestData.amount}
              onChange={e => setNewRequestData({ ...newRequestData, amount: e.target.value })}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold mb-1">Category</label>
            <select
              value={newRequestData.category}
              onChange={e => setNewRequestData({ ...newRequestData, category: e.target.value })}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
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
              value={newRequestData.description}
              onChange={e => setNewRequestData({ ...newRequestData, description: e.target.value })}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
            />
          </div>

          {/* Office & Requested By */}
          {userInfo && (
            <div className="space-y-1 text-sm text-gray-700">
              <p><strong>Office:</strong> {userInfo.office_name}</p>
              <p><strong>Requested By:</strong> {userInfo.name}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#ef4444] text-white px-6 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2 transition"
            >
              {loading ? "Submitting..." : <><FaPlus /> Submit Request</>}
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

export default RequestExpense;
