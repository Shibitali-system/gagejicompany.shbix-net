import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { FaUser, FaEnvelope, FaPhone, FaLock, FaCopy } from "react-icons/fa";
import { supabase } from '../../../supabaseClient';

const AVAILABLE_PERMISSIONS = [
  "dashboard","products","sales","purchases","suppliers","customers",
  "employees","billing","reports","notifications","settings","subscription","help","profile"
];

const NewEmployee = () => {
  const navigate = useNavigate();
  const [pharmacyId, setPharmacyId] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("employee");
  const [permissions, setPermissions] = useState([]);
  const [password, setPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState(""); // show generated password
  const [loading, setLoading] = useState(false);

  // Fetch owner info automatically
  useEffect(() => {
    const fetchOwner = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error("You must be logged in as owner to add employees");
        return;
      }

      const { data: owner, error } = await supabase
        .from("systems_users")
        .select("customer_registration_no")
        .eq("auth_user_id", user.id)
        .single();

      if (error || !owner?.customer_registration_no) {
        toast.error("Failed to fetch owner info / pharmacy ID");
        return;
      }

      setPharmacyId(owner.customer_registration_no);
    };

    fetchOwner();
  }, []);

  const generatePassword = () =>
    Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4);

  const handlePermissionChange = (key) => {
    setPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const handleCopyPassword = () => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    toast.success("Password copied to clipboard!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!pharmacyId) throw new Error("Owner info / pharmacy ID missing");

      const employeePassword = password || generatePassword();
      setGeneratedPassword(employeePassword); // save password to show

      const { data, error } = await supabase
        .from("employees")
        .insert([{
          name,
          email,
          phone,
          role,
          permissions: role === "employee" ? permissions : AVAILABLE_PERMISSIONS,
          pharmacy_id: pharmacyId,
          password: employeePassword,
          active: true
        }]);

      if (error) throw error;

      toast.success(`Employee ${name} added!`);
      // optionally navigate after a delay
      setTimeout(() => navigate("/pharmacy/dashboard/employees"), 2000);

    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-xl sm:max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-green-600">Add New Employee</h1>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="relative">
            <FaUser className="absolute top-3 left-3 text-gray-400" />
            <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required
              className="pl-10 w-full py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div className="relative">
            <FaEnvelope className="absolute top-3 left-3 text-gray-400" />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              className="pl-10 w-full py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div className="relative">
            <FaPhone className="absolute top-3 left-3 text-gray-400" />
            <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)}
              className="pl-10 w-full py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div>
            <label className="block font-medium mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          {role === "employee" && (
            <div>
              <label className="block font-medium mb-2">Permissions</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_PERMISSIONS.map(p => (
                  <label key={p} className="flex items-center space-x-2">
                    <input type="checkbox" checked={permissions.includes(p)} onChange={() => handlePermissionChange(p)}
                      className="h-4 w-4" />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <FaLock className="absolute top-3 left-3 text-gray-400" />
            <input type="text" placeholder="Password (leave empty to auto-generate)" value={password} onChange={e => setPassword(e.target.value)}
              className="pl-10 w-full py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          {/* Show generated password */}
          {generatedPassword && (
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded">
              <span className="font-mono">{generatedPassword}</span>
              <button type="button" onClick={handleCopyPassword} className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
                <FaCopy /> <span>Copy</span>
              </button>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white py-3 rounded-xl hover:scale-105 hover:shadow-md transition-all">
            {loading ? "Processing..." : "Add Employee"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default NewEmployee;
