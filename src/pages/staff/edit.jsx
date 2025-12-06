import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaArrowLeft } from "react-icons/fa";

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

const AVAILABLE_PERMISSIONS = [
  "products", "sales", "view_all_sales", "purchases", "suppliers", "customers",
  "employees", "billing", "reports", "notifications", "settings",
  "subscription", "help", "profile"
];

const AVAILABLE_POSITIONS = [
  "Staff",
  "Manager",
  "Accountant",
  "Pharmaceutical Assistant",
  "Pharmaceutical Technician",
  "Pharmacist",
  "Medical Attendant",
  "Cashier",
  "Sales Representative",
  "Supervisor",
  "Admin",
  "Other"
];

const EmployeeEdit = () => {
  const { id } = useParams();

  const [employee, setEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    position: "",
    password: "",
    permissions: [],
    active: true,
  });
  const [loading, setLoading] = useState(true);

  // Fetch employee data
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setEmployee(data);
      } catch (err) {
        toast.error("Failed to load employee: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmployee((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (perm) => {
    setEmployee((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          position: employee.position,
          password: employee.password,
          permissions: employee.permissions,
          active: employee.active,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("✅ Employee updated successfully!");
    } catch (err) {
      toast.error("❌ Error updating employee: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-500 animate-pulse">
        Loading employee...
      </div>
    );
  }

  return (
  <div className="max-w-3xl mx-auto p-6 space-y-6">
    <Toaster position="top-right" />

    {/* Back Link */}
    <Link to="../employees" className="flex items-center gap-2 font-bold text-[#ef4444] hover:underline">
      <FaArrowLeft /> Back to Employees List
    </Link>

    <h1 className="text-3xl font-bold text-[#ef4444] mb-4">Edit Employee</h1>

    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <FormCard title="Full Name">
        <input
          type="text"
          name="name"
          value={employee.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
        />
      </FormCard>

      {/* Email */}
      <FormCard title="Email">
        <input
          type="email"
          name="email"
          value={employee.email}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
        />
      </FormCard>

      {/* Phone */}
      <FormCard title="Phone">
        <input
          type="text"
          name="phone"
          value={employee.phone}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
        />
      </FormCard>

      {/* Role */}
      <FormCard title="Role">
        <select
          name="role"
          value={employee.role}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
        >
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </FormCard>

      {/* Position */}
      <FormCard title="Position">
        <select
          name="position"
          value={employee.position || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
          required
        >
          <option value="">Select position</option>
          {AVAILABLE_POSITIONS.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </FormCard>

      {/* Password */}
      <FormCard title="Password">
        <input
          type="text"
          name="password"
          value={employee.password}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
        />
      </FormCard>

      {/* Permissions */}
      <FormCard title="Permissions">
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_PERMISSIONS.map((perm) => (
            <label
              key={perm}
              className={`px-3 py-1 rounded-full border text-sm cursor-pointer transition-all ${
                employee.permissions.includes(perm)
                  ? "bg-[#ef4444] text-white border-[#ef4444]"
                  : "bg-gray-100 text-gray-700 border-[#e5e7eb] hover:bg-[#ffe5e5]"
              }`}
            >
              <input
                type="checkbox"
                checked={employee.permissions.includes(perm)}
                onChange={() => handlePermissionToggle(perm)}
                className="hidden"
              />
              {perm}
            </label>
          ))}
        </div>
      </FormCard>

      {/* Active */}
      <FormCard>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={employee.active}
            onChange={(e) =>
              setEmployee((prev) => ({ ...prev, active: e.target.checked }))
            }
            id="active"
          />
          <label htmlFor="active" className="text-gray-700">
            Active Employee
          </label>
        </div>
      </FormCard>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 bg-[#ef4444] text-white rounded-xl hover:bg-red-600 transition-all"
        >
          Save Changes
        </button>
      </div>
    </form>
  </div>
);

};

export default EmployeeEdit;
