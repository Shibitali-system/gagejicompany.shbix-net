import React, { useState, useEffect, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import {

  FaUser,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaArrowLeft,
  FaUserTag,
  FaLock,
  FaCopy
} from "react-icons/fa";
import { supabase } from "../../../supabaseClient";

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
  { key: "dashboard", label: "Dashboard", description: "View the dashboard overview" },
  { key: "sales", label: "Sales", description: "View and enter sales" },
  { key: "view_all_sales", label: "View All Sales", description: "Employee can see all pharmacy sales" },
  { key: "products", label: "Products", description: "View and edit products" },
  { key: "purchases", label: "Purchases", description: "View and manage purchases" },
  { key: "suppliers", label: "Suppliers", description: "View and manage suppliers" },
  { key: "customers", label: "Customers", description: "View and manage customers" },
  { key: "employees", label: "Employees", description: "View and manage employees (admin only)" },
  { key: "billing", label: "Billing", description: "View and manage billing" },
  { key: "reports", label: "Reports", description: "View reports" },
  { key: "notifications", label: "Notifications", description: "View notifications" },
  { key: "settings", label: "Settings", description: "Manage settings (admin only)" },
  { key: "subscription", label: "Subscription", description: "Manage subscription (admin only)" },
  { key: "help", label: "Help", description: "Access help section" },
  { key: "profile", label: "Profile", description: "Access profile settings" },
];



const NewEmployee = () => {
  const navigate = useNavigate();
  const [officeId, setOfficeId] = useState(null);
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", role: "employee", position: "Staff", password: ""
  });
  const [permissions, setPermissions] = useState(["dashboard"]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOwner = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return toast.error("You must be logged in as owner to add employees");

      const { data: owner, error } = await supabase
        .from("systems_users")
        .select("office_id")
        .eq("auth_user_id", user.id)
        .single();

      if (error || !owner?.office_id)
        return toast.error("Failed to fetch owner info / office ID");

      setOfficeId(owner.office_id);
    };
    fetchOwner();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (key) => {
    if (key === "dashboard") return;
    setPermissions(prev => {
      const newPerms = prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key];
      if (!newPerms.includes("dashboard")) newPerms.push("dashboard");
      return newPerms;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!officeId) throw new Error("Owner info / office ID missing");
      if (!formData.email) throw new Error("Email is required for employee registration");

      const employeePassword = formData.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4);
      setGeneratedPassword(employeePassword);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: employeePassword
      });

      if (signUpError) throw signUpError;

      const authUserId = signUpData?.user?.id;
      if (!authUserId) throw new Error("Failed to get auth_user_id from Supabase.");

      const { error: insertError } = await supabase.from("employees").insert([{
        ...formData,
        permissions: formData.role === "employee" ? permissions : AVAILABLE_PERMISSIONS.map(p => p.key),
        office_id: officeId,
        password: employeePassword,
        active: true,
        auth_user_id: authUserId
      }]);

      if (insertError) throw insertError;
      toast.success(`Employee "${formData.name}" added successfully!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
  <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
    <Toaster position="top-right" />
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Back Link */}
      <Link
        to="../employees"
        className="flex items-center gap-2 font-bold text-[#ef4444] hover:underline mb-2"
      >
        <FaArrowLeft /> Back to Employees List
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* BASIC INFO */}
        <FormCard title="Basic Information">
          {[
            { key: "name", icon: <FaUser /> },
            { key: "email", icon: <FaEnvelope /> },
            { key: "phone", icon: <FaPhone /> }
          ].map(({ key, icon }, i) => (
            <div className="mb-4 w-full" key={i}>
              <label className="block text-sm font-medium mb-1 capitalize">
                {key}
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ef4444] text-lg">
                  {icon}
                </span>

                <input
                  type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                  name={key}
                  placeholder={
                    key === "phone"
                      ? "Phone Number"
                      : key.charAt(0).toUpperCase() + key.slice(1)
                  }
                  value={formData[key]}
                  onChange={handleChange}
                  className="
                    w-full pl-12 pr-4 py-2 rounded-xl
                    border border-gray-300 bg-white
                    focus:outline-none focus:ring-2 focus:ring-[#ef4444]
                    shadow-sm
                  "
                />
              </div>
            </div>
          ))}
        </FormCard>

        {/* POSITION & ROLE */}
        <FormCard title="Position & Role">
          {[
            { key: "position", icon: <FaBriefcase /> },
            { key: "role", icon: <FaUserTag /> }
          ].map(({ key, icon }, i) => (
            <div className="mb-4" key={i}>
              <label className="block text-sm font-medium mb-1 capitalize">
                {key}
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ef4444] text-lg">
                  {icon}
                </span>

                <select
                  name={key}
                  value={formData[key]}
                  onChange={handleChange}
                  className="
                    w-full pl-12 pr-4 py-2 rounded-xl
                    border border-gray-300 bg-white
                    focus:outline-none focus:ring-2 focus:ring-[#ef4444]
                    shadow-sm
                  "
                >
                  {key === "position"
                    ? [
                        "Manager",
                        "Accountant",
                        "Cashier",
                        "Pharmaceutical Assistant",
                        "Pharmaceutical Technician",
                        "Pharmacist",
                        "Medical Attendant",
                        "Supervisor",
                        "Staff",
                        "Admin",
                        "Other"
                      ].map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))
                    : ["admin", "employee"].map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                </select>
              </div>
            </div>
          ))}
        </FormCard>

        {/* PERMISSIONS */}
        {formData.role === "employee" && (
          <FormCard title="Permissions">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_PERMISSIONS.map(p => (
                <label
                  key={p.key}
                  className="
                    flex items-start gap-2 p-3 border rounded-lg cursor-pointer
                    hover:bg-gray-50 shadow-sm
                  "
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(p.key)}
                    onChange={() => handlePermissionChange(p.key)}
                    className="mt-1 h-5 w-5 text-[#ef4444]"
                    disabled={p.key === "dashboard"}
                  />
                  <div>
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-gray-500">{p.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </FormCard>
        )}

        {/* PASSWORD */}
        <FormCard title="Password & Submit">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Password (leave empty to auto-generate)
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ef4444] text-lg">
                <FaLock />
              </span>

              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="
                  w-full pl-12 pr-4 py-2 rounded-xl
                  border border-gray-300 bg-white
                  focus:outline-none focus:ring-2 focus:ring-[#ef4444]
                  shadow-sm
                "
              />
            </div>
          </div>

          {/* Generated password box */}
          {generatedPassword && (
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg shadow-sm mb-4">
              <span className="font-mono">{generatedPassword}</span>

              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(generatedPassword) &&
                  toast.success("Password copied")
                }
                className="
                  flex items-center gap-1 bg-[#ef4444] text-white
                  px-3 py-1 rounded-lg hover:bg-red-600 shadow
                "
              >
                <FaCopy /> Copy
              </button>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full bg-[#ef4444] text-white py-3 rounded-xl
              hover:scale-105 hover:shadow-xl transition-all font-semibold
            "
          >
            {loading ? "Processing..." : "Add Employee"}
          </button>
        </FormCard>
      </form>
    </div>
  </div>
);

};

export default NewEmployee;
