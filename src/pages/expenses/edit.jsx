import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaEdit, FaArrowLeft } from "react-icons/fa";
import dayjs from "dayjs";

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

const EditExpense = ({ user }) => {
  const { id } = useParams();

  const [expense, setExpense] = useState({
    name: "",
    amount: "",
    category: "",
    description: "",
    created_by_name: "",
    created_at: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchExpense = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch expense record
        const { data: exp, error: expError } = await supabase
          .from("systems_expenses")
          .select("*")
          .eq("id", id)
          .single();

        if (expError) throw expError;

        // Find creator name
        let createdByName = "-";
        const { data: sysUser } = await supabase
          .from("systems_users")
          .select("id, customer_name")
          .eq("id", exp.created_by)
          .maybeSingle();

        const { data: emp } = await supabase
          .from("employees")
          .select("id, name")
          .eq("id", exp.created_by)
          .maybeSingle();

        if (sysUser) createdByName = sysUser.customer_name;
        else if (emp) createdByName = emp.name;

        setExpense({
          ...exp,
          created_by_name: createdByName,
          created_at: exp.created_at,
        });
      } catch (err) {
        setError("Failed to fetch expense: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setExpense((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("systems_expenses")
        .update({
          name: expense.name,
          amount: parseFloat(expense.amount),
          category: expense.category,
          description: expense.description,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("✅ Expense updated successfully!", {
        duration: 3000,
        position: "top-right",
      });
    } catch (err) {
      setError("Failed to save changes: " + err.message);
      toast.error("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <p className="p-6 text-gray-600 animate-pulse">Loading expense...</p>
    );
  if (error)
    return (
      <p className="p-6 text-red-600 font-semibold bg-red-50 rounded-xl">
        {error}
      </p>
    );

 return (
  <div className="max-w-4xl mx-auto p-6 mt-10 space-y-6">
    <Toaster />

    {/* Kichwa */}
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-[#2563EB] flex items-center gap-2">
        <FaEdit className="text-[#2563EB]" /> Hariri Matumizi
      </h1>

      <Link
        to="../expenses"
        className="flex items-center gap-2 text-[#2563EB] hover:text-red-600 font-medium transition-all"
      >
        <FaArrowLeft /> Rudi kwenye Orodha
      </Link>
    </div>

    {/* Kadi ya Metadata */}
    <CustomCard>
      <p>
        <span className="font-semibold">Imeingizwa na:</span> {expense.created_by_name || "-"}
      </p>
      <p>
        <span className="font-semibold">Imeundwa:</span> {dayjs(expense.created_at).format("DD MMM YYYY, h:mm A")}
      </p>
    </CustomCard>

    {/* Kadi ya Fomu */}
    <FormCard title="Hariri Maelezo ya Matumizi">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-semibold mb-2 text-gray-700">Jina la Matumizi</label>
          <input
            type="text"
            name="name"
            value={expense.name}
            onChange={handleChange}
            className="w-full border border-gray-300 px-4 py-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-2 text-gray-700">Kiasi</label>
          <input
            type="number"
            name="amount"
            value={expense.amount}
            onChange={handleChange}
            className="w-full border border-gray-300 px-4 py-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-2 text-gray-700">Kategoria</label>
          <input
            type="text"
            name="category"
            value={expense.category}
            onChange={handleChange}
            className="w-full border border-gray-300 px-4 py-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2 text-gray-700">Maelezo</label>
          <textarea
            name="description"
            value={expense.description}
            onChange={handleChange}
            className="w-full border border-gray-300 px-4 py-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-sm"
            rows={4}
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={saving}
            className={`bg-[#2563EB] text-white px-6 py-3 rounded-2xl shadow-md hover:bg-red-600 transition-all duration-200 flex items-center gap-2 ${
              saving ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FaEdit />
            {saving ? "Inaendelea kuhifadhi..." : "Hifadhi Mabadiliko"}
          </button>
        </div>
      </form>
    </FormCard>
  </div>
);


};

export default EditExpense;
