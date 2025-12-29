import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaUserEdit, FaArrowLeft } from "react-icons/fa";
import dayjs from "dayjs";

const EditCustomer = ({ user }) => {
  const { id } = useParams();

  const [customer, setCustomer] = useState({
    name: "",
    type: "",
    email: "",
    phone: "",
    address: "",
    created_by_name: "",
    created_at: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchCustomer = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch customer record
        const { data: cust, error: custError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", id)
          .single();

        if (custError) throw custError;

        // Find creator name
        let createdByName = "-";
        const { data: sysUser } = await supabase
          .from("systems_users")
          .select("id, customer_name")
          .eq("id", cust.created_by)
          .maybeSingle();

        const { data: emp } = await supabase
          .from("employees")
          .select("id, name")
          .eq("id", cust.created_by)
          .maybeSingle();

        if (sysUser) createdByName = sysUser.customer_name;
        else if (emp) createdByName = emp.name;

        setCustomer({
          ...cust,
          created_by_name: createdByName,
          created_at: cust.created_at,
        });
      } catch (err) {
        setError("Failed to fetch customer: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: customer.name,
          type: customer.type,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("✅ Customer updated successfully!", {
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
      <p className="p-6 text-gray-600 animate-pulse">Loading customer...</p>
    );
  if (error)
    return (
      <p className="p-6 text-red-600 font-semibold bg-red-50 rounded-xl">
        {error}
      </p>
    );

  const CustomCard = ({ title, children }) => (
  <div className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-start justify-start
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
);

return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster />
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Card 1: Header */}
      <CustomCard title="Hariri Mteja">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] flex items-center gap-2">
            <FaUserEdit /> Hariri Mteja
          </h1>
          <Link
            to="../customers"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-all"
          >
            <FaArrowLeft /> Rudi kwenye Orodha
          </Link>
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
          <p>
            <span className="font-semibold">Aliyeunda:</span>{" "}
            {customer.created_by_name || "-"}
          </p>
          <p>
            <span className="font-semibold">Tarehe ya kuundwa:</span>{" "}
            {dayjs(customer.created_at).format("DD MMM YYYY, h:mm A")}
          </p>
        </div>
      </CustomCard>

      {/* Card 2: Customer Information Form */}
      <CustomCard title="Taarifa za Mteja">
        <form onSubmit={handleSubmit} className="space-y-4 w-full">

          {[
            { label: "Jina la Mteja", type: "text", name: "name", required: true },
            {
              label: "Aina ya Mteja",
              type: "select",
              name: "type",
              options: ["Biashara"],
              required: true
            },
            { label: "Barua Pepe", type: "email", name: "email" },
            { label: "Namba ya Simu", type: "text", name: "phone" },
            { label: "Anuani", type: "textarea", name: "address", rows: 3 },
          ].map((field, i) => (
            <div className="flex flex-col w-full" key={i}>
              <label className="block font-semibold mb-1 text-gray-700">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  value={customer[field.name]}
                  onChange={handleChange}
                  rows={field.rows}
                  className="w-full border border-gray-300 px-3 py-2 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] resize-none"
                />
              ) : field.type === "select" ? (
                <select
                  name={field.name}
                  value={customer[field.name]}
                  onChange={handleChange}
                  required={field.required}
                  className="w-full border border-gray-300 px-3 py-2 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                >
                  <option value="">Chagua aina</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  value={customer[field.name]}
                  onChange={handleChange}
                  required={field.required}
                  className="w-full border border-gray-300 px-3 py-2 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB]"
                />
              )}
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={saving}
              className={`bg-[#2563EB] text-white px-5 py-2 rounded-[4px] hover:bg-[#d63a3a] flex items-center justify-center gap-2 ${
                saving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <FaUserEdit /> {saving ? "Inahifadhi..." : "Hifadhi Mabadiliko"}
            </button>
          </div>
        </form>
      </CustomCard>

    </div>
  </div>
);

};

export default EditCustomer;
