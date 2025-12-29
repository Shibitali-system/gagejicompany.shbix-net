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
  {
    key: "dashboard",
    label: "Dashibodi",
    description: "Tazama muhtasari wa dashibodi",
  },

  {
    key: "products",
    label: "Bidhaa",
    description: "Tazama na usimamishe bidhaa",
  },

  {
    key: "sales",
    label: "Mauzo",
    description: "Tengeneza na uone mauzo",
  },

  {
    key: "purchases",
    label: "Manunuzi",
    description: "Simamia manunuzi",
  },

  {
    key: "suppliers",
    label: "Wauzaji",
    description: "Simamia wauzaji",
  },

  {
    key: "customers",
    label: "Wateja",
    description: "Simamia wateja",
  },

  {
    key: "employees",
    label: "Wafanyakazi",
    description: "Simamia wafanyakazi (Kwa Msimamizi tu)",
  },

  {
    key: "reports",
    label: "Ripoti",
    description: "Tazama ripoti za mfumo",
  },

  {
    key: "expenses",
    label: "Matumizi",
    description: "Simamia matumizi",
  },

  {
    key: "assets",
    label: "Mali",
    description: "Simamia mali za kampuni",
  },

  {
    key: "insurance",
    label: "Bima",
    description: "Simamia rekodi za bima",
  },

  {
    key: "meeting",
    label: "Vikao",
    description: "Pata mikutano na ratiba",
  },

  {
    key: "notebook",
    label: "Notebook",
    description: "Maelezo binafsi na rekodi",
  },

  {
    key: "deleted",
    label: "Mauzo Yaliyofutwa",
    description: "Tazama rekodi za mauzo yaliyofutwa",
  },

  {
    key: "expired",
    label: "Expired",
    description: "Tazama bidhaa zilizomahitimisha",
  },

  {
    key: "attendances",
    label: "Mahudhurio",
    description: "Simamia mahudhurio ya wafanyakazi",
  },

  {
    key: "notifications",
    label: "Notifications",
    description: "Tazama arifa",
  },

  {
    key: "identitymanual",
    label: "Vitambulisho",
    description: "Simamia kadi za utambulisho",
  },

  {
    key: "settings",
    label: "Settings",
    description: "Mipangilio ya mfumo (Kwa Msimamizi tu)",
  },

  {
    key: "subscription",
    label: "Subscriptions",
    description: "Simamia usajili (Kwa Msimamizi tu)",
  },

  {
    key: "help",
    label: "Msaada",
    description: "Pata msaada na usaidizi",
  },

  {
    key: "installinstructions",
    label: "Install App",
    description: "Tazama maelekezo ya ufungaji wa app",
  },

  {
    key: "profile",
    label: "Profile",
    description: "Simamia profaili yako",
  },
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

    // Generate password if empty
    const employeePassword = formData.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4);
    setGeneratedPassword(employeePassword);

    // Create auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: employeePassword
    });

    if (signUpError) throw signUpError;

    const authUserId = signUpData?.user?.id;
    if (!authUserId) throw new Error("Failed to get auth_user_id from Supabase.");

    // Insert into employees table
    const { error: insertError } = await supabase.from("employees").insert([{
      ...formData,
      permissions: formData.role === "employee" ? permissions : AVAILABLE_PERMISSIONS.map(p => p.key),
      office_id: officeId,
      password: employeePassword,
      active: true,
      auth_user_id: authUserId
    }]);

    if (insertError) throw insertError;

    // 🔹 Toast message with employee credentials
    toast.success(
      <div className="space-y-1 text-sm">
        <div>Employee <strong>{formData.name}</strong> added successfully!</div>
        <div>Email: <strong>{formData.email}</strong></div>
        <div>Password: <strong>{employeePassword}</strong></div>
        <div className="mt-1 font-medium text-red-600">Please login again to refresh employee</div>
      </div>,
      { duration: 6000 } // visible for 6 seconds
    );

    // 🔹 Redirect to login after 6 seconds
    setTimeout(() => {
      navigate("/login");
    }, 6000);

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

      {/* Kiungo cha Kurudi */}
      <Link
        to="../employees"
        className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline mb-2"
      >
        <FaArrowLeft /> Rudi kwenye Orodha ya Wafanyakazi
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* TAARIFA ZA MISINGI */}
        <FormCard title="Taarifa za Msingi">
          {[
            { key: "name", icon: <FaUser /> },
            { key: "email", icon: <FaEnvelope /> },
            { key: "phone", icon: <FaPhone /> }
          ].map(({ key, icon }, i) => (
            <div className="mb-4 w-full" key={i}>
              <label className="block text-sm font-medium mb-1 capitalize">
                {key === "name" ? "Jina" : key === "email" ? "Barua Pepe" : "Simu"}
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB] text-lg">
                  {icon}
                </span>

                <input
                  type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                  name={key}
                  placeholder={
                    key === "phone"
                      ? "Nambari ya Simu"
                      : key === "name"
                      ? "Jina"
                      : "Barua Pepe"
                  }
                  value={formData[key]}
                  onChange={handleChange}
                  className="
                    w-full pl-12 pr-4 py-2 rounded-xl
                    border border-gray-300 bg-white
                    focus:outline-none focus:ring-2 focus:ring-[#2563EB]
                    shadow-sm
                  "
                />
              </div>
            </div>
          ))}
        </FormCard>

        {/* CHEO NA JUKUMU */}
        <FormCard title="Cheo na Jukumu">
          {[
            { key: "position", icon: <FaBriefcase /> },
            { key: "role", icon: <FaUserTag /> }
          ].map(({ key, icon }, i) => (
            <div className="mb-4" key={i}>
              <label className="block text-sm font-medium mb-1 capitalize">
                {key === "position" ? "Cheo" : "Jukumu"}
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB] text-lg">
                  {icon}
                </span>

                <select
                  name={key}
                  value={formData[key]}
                  onChange={handleChange}
                  className="
                    w-full pl-12 pr-4 py-2 rounded-xl
                    border border-gray-300 bg-white
                    focus:outline-none focus:ring-2 focus:ring-[#2563EB]
                    shadow-sm
                  "
                >
                  {key === "position"
                    ? [
                        "Meneja",
                        "Mhasibu",
                        "Kashier",
                        "Msaidizi wa Dawa",
                        "Technician wa Dawa",
                        "Daktari wa Dawa",
                        "Mhudumu wa Afya",
                        "Msimamizi",
                        "Mfanyakazi",
                        "Msimamizi Mkuu",
                        "Nyingine"
                      ].map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))
                    : ["admin", "employee"].map(v => (
                        <option key={v} value={v}>
                          {v === "admin" ? "Msimamizi" : "Mfanyakazi"}
                        </option>
                      ))}
                </select>
              </div>
            </div>
          ))}
        </FormCard>

        {/* IDhini */}
        {formData.role === "employee" && (
          <FormCard title="Idhini">
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
                    className="mt-1 h-5 w-5 text-[#2563EB]"
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

        {/* NYWILA & KITUFUCHA */}
        <FormCard title="Nywila & Kutuma">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Nywila (acha tupu ili itengenezwe kiotomatiki)
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2563EB] text-lg">
                <FaLock />
              </span>

              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nywila"
                className="
                  w-full pl-12 pr-4 py-2 rounded-xl
                  border border-gray-300 bg-white
                  focus:outline-none focus:ring-2 focus:ring-[#2563EB]
                  shadow-sm
                "
              />
            </div>
          </div>

          {/* Sanduku la Nywila Iliyotengenezwa */}
          {generatedPassword && (
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg shadow-sm mb-4">
              <span className="font-mono">{generatedPassword}</span>

              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(generatedPassword) &&
                  toast.success("Nywila imekopywa")
                }
                className="
                  flex items-center gap-1 bg-[#2563EB] text-white
                  px-3 py-1 rounded-lg hover:bg-red-600 shadow
                "
              >
                <FaCopy /> Nakili
              </button>
            </div>
          )}

          {/* KITUFUCHA */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full bg-[#2563EB] text-white py-3 rounded-xl
              hover:scale-105 hover:shadow-xl transition-all font-semibold
            "
          >
            {loading ? "Inaendelea..." : "Ongeza Mfanyakazi"}
          </button>
        </FormCard>
      </form>
    </div>
  </div>
);


};

export default NewEmployee;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          