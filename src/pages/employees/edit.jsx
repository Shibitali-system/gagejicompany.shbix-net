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

const AVAILABLE_PERMISSIONS = [
  { key: "dashboard", label: "Dashibodi", description: "Tazama muhtasari wa dashibodi" },
  { key: "products", label: "Bidhaa", description: "Tazama na usimamishe bidhaa" },
  { key: "sales", label: "Mauzo", description: "Tengeneza na uone mauzo" },
  { key: "purchases", label: "Manunuzi", description: "Simamia manunuzi" },
  { key: "suppliers", label: "Wauzaji", description: "Simamia wauzaji" },
  { key: "customers", label: "Wateja", description: "Simamia wateja" },
  { key: "employees", label: "Wafanyakazi", description: "Simamia wafanyakazi (Kwa Msimamizi tu)" },
  { key: "reports", label: "Ripoti", description: "Tazama ripoti za mfumo" },
  { key: "expenses", label: "Matumizi", description: "Simamia matumizi" },
  { key: "assets", label: "Mali", description: "Simamia mali za kampuni" },
  { key: "insurance", label: "Bima", description: "Simamia rekodi za bima" },
  { key: "meeting", label: "Vikao", description: "Pata mikutano na ratiba" },
  { key: "notebook", label: "Notebook", description: "Maelezo binafsi na rekodi" },
  { key: "deleted", label: "Mauzo Yaliyofutwa", description: "Tazama rekodi za mauzo yaliyofutwa" },
  { key: "expired", label: "Expired", description: "Tazama bidhaa zilizomahitimisha" },
  { key: "attendances", label: "Mahudhurio", description: "Simamia mahudhurio ya wafanyakazi" },
  { key: "notifications", label: "Notifications", description: "Tazama arifa" },
  { key: "identitymanual", label: "Vitambulisho", description: "Simamia kadi za utambulisho" },
  { key: "settings", label: "Settings", description: "Mipangilio ya mfumo (Kwa Msimamizi tu)" },
  { key: "subscription", label: "Subscriptions", description: "Simamia usajili (Kwa Msimamizi tu)" },
  { key: "help", label: "Msaada", description: "Pata msaada na usaidizi" },
  { key: "installinstructions", label: "Install App", description: "Tazama maelekezo ya ufungaji wa app" },
  { key: "profile", label: "Profile", description: "Simamia profaili yako" },
];

const AVAILABLE_POSITIONS = [
  "Mfanyakazi",
  "Meneja",
  "Mhasibu",
  "Msaidizi wa Biashara",
  "Teknolojia wa Biashara",
  "Mauzo / Muuzaji",
  "Kagua Bidhaa",
  "Kasha / Cashier",
  "Mwakilishi wa Mauzo",
  "Msimamizi",
  "Msimamizi Mkuu (Admin)",
  "Nyingine"
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
        toast.error("Imeshindikana kupakia mfanyakazi: " + err.message);
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
        .update(employee)
        .eq("id", id);
      if (error) throw error;
      toast.success("✅ Mfanyakazi amesasishwa kwa mafanikio!");
    } catch (err) {
      toast.error("❌ Tatizo kusasisha mfanyakazi: " + err.message);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500 animate-pulse">Inapakia mfanyakazi...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Toaster position="top-right" />

      {/* Link ya kurudi */}
      <Link to="../employees" className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline">
        <FaArrowLeft /> Rudi kwenye Orodha ya Wafanyakazi
      </Link>

      <h1 className="text-3xl font-bold text-[#2563EB] mb-4">Hariri Mfanyakazi</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        <FormCard title="Jina Kamili">
          <input
            type="text"
            name="name"
            value={employee.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </FormCard>

        <FormCard title="Barua Pepe">
          <input
            type="email"
            name="email"
            value={employee.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </FormCard>

        <FormCard title="Simu">
          <input
            type="text"
            name="phone"
            value={employee.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </FormCard>

        <FormCard title="Jukumu">
          <select
            name="role"
            value={employee.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="employee">Mfanyakazi</option>
            <option value="admin">Msimamizi</option>
          </select>
        </FormCard>

        <FormCard title="Cheo">
          <select
            name="position"
            value={employee.position || ""}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            required
          >
            <option value="">Chagua cheo</option>
            {AVAILABLE_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </FormCard>

        <FormCard title="Nywila">
          <input
            type="text"
            name="password"
            value={employee.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </FormCard>

        <FormCard title="Idhini">
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_PERMISSIONS.map((perm) => (
              <label
                key={perm.key}
                className={`px-3 py-1 rounded-full border text-sm cursor-pointer transition-all ${
                  employee.permissions.includes(perm.key)
                    ? "bg-[#2563EB] text-white border-[#2563EB]"
                    : "bg-gray-100 text-gray-700 border-[#e5e7eb] hover:bg-[#ffe5e5]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={employee.permissions.includes(perm.key)}
                  onChange={() => handlePermissionToggle(perm.key)}
                  className="hidden"
                />
                {perm.label}
              </label>
            ))}
          </div>
        </FormCard>

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
              Mfanyakazi Hai
            </label>
          </div>
        </FormCard>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-[#2563EB] text-white rounded-xl hover:bg-red-600 transition-all"
          >
            Hifadhi Mabadiliko
          </button>
        </div>

      </form>
    </div>
  );
};

export default EmployeeEdit;
