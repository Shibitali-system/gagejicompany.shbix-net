import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaArrowLeft, FaPlus, FaEdit } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Tab, Dialog } from "@headlessui/react";


const CreateBranch = () => {
  const navigate = useNavigate();
  const [officeId, setOfficeId] = useState(null);
  const [baseId, setBaseId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [passwordModal, setPasswordModal] = useState({ open: false, branch: null, password: "" });
  const [showPassword, setShowPassword] = useState(false); // for create form
const [showModalPassword, setShowModalPassword] = useState(false); // for password modal



  const [form, setForm] = useState({
    managerName: "",
    branchName: "",
    email: "",
    phone: "",
    country: "Tanzania",
    region: "",
    referral: "",
    password: "",
    trialDays: 3,
  });

  // 🔹 Extract baseId correctly (without -MAIN or -BRANCH-XXX)
  const getBaseId = (officeId) => {
    return officeId.replace(/-(MAIN|BRANCH-\d+)$/, '');
  };

  // ================= FETCH CURRENT USER =================
  useEffect(() => {
    const fetchOwner = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        toast.error("Huja login");
        return;
      }

      const { data: owner, error } = await supabase
        .from("systems_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error || !owner?.office_id) {
        toast.error("Imeshindikana kupata taarifa za MAIN/branch");
        return;
      }

      setOfficeId(owner.office_id);

      const base = getBaseId(owner.office_id);
      setBaseId(base);

      fetchBranches(base);
    };

    fetchOwner();
  }, []);

  // ================= FETCH BRANCHES + USAGE DAYS =================
const fetchBranches = async (base) => {
  try {
    // 1️⃣ Fetch branches
    const { data: branchesData, error: branchError } = await supabase
      .from("systems_users")
      .select("*")
      .or(`office_id.eq.${base}-MAIN,office_id.ilike.${base}-BRANCH-%`)
      .order("created_at", { ascending: true });
    if (branchError) throw branchError;

    // 2️⃣ Fetch latest subscription for each branch (assuming latest by created_at)
    const officeIds = branchesData.map(b => b.office_id);
    const { data: subsData } = await supabase
      .from("subscriptions")
      .select("office_id, usagedays")
      .in("office_id", officeIds)
      .order("created_at", { ascending: false }); // latest first

    // 3️⃣ Map usage days to branches
    const branchesWithUsage = branchesData.map(b => {
      const latestSub = subsData.find(s => s.office_id === b.office_id);
      return { ...b, usageDays: latestSub?.usagedays || 0 };
    });

    setBranches(branchesWithUsage);
  } catch (err) {
    console.error(err);
    toast.error("Imeshindikana kupata branches au subscriptions");
  }
};


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => setForm(prev => ({ ...prev, phone: "+" + value }));

  // ================= CREATE BRANCH =================
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!officeId || !baseId) return toast.error("MAIN haijapakiwa bado");

    const { managerName, branchName, email, phone, country, region, referral, password, trialDays } = form;

    if (!managerName || !branchName || !email || !phone || !region || !password) {
      return toast.error("Tafadhali jaza taarifa zote");
    }

    try {
      setLoading(true);

      // Count existing branches
      const { data: existing } = await supabase
        .from("systems_users")
        .select("office_id")
        .ilike("office_id", `${baseId}-BRANCH-%`);
      const nextNumber = (existing?.length || 0) + 1;
      const branchOfficeId = `${baseId}-BRANCH-${nextNumber}`;

      // Full permissions
      const fullPermissions = [
        "dashboard","products","sales","purchases","suppliers","customers",
        "employees","billing","reports","notifications","settings","subscription",
        "help","profile"
      ];

      // 1️⃣ Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: managerName,
            role: "branch",
            office_id: branchOfficeId,
            office_name: branchName,
            phone,
            permissions: fullPermissions
          },
        },
      });
      if (authError) throw authError;
      const authUserId = authData?.user?.id;

      // 2️⃣ Insert into systems_users
      const userData = {
        auth_user_id: authUserId,
        customer_name: managerName,
        office_name: branchName,
        office_id: branchOfficeId,
        customer_registration_no: branchOfficeId,
        customer_phone: phone,
        country,
        region,
        referral_code: referral || null,
        created_at: new Date().toISOString(),
        system_type: "Mfumo wa Biashara",
        email,
        role: "branch",
        permissions: fullPermissions
      };
      const { error: insertError } = await supabase.from("systems_users").insert([userData]);
      if (insertError) throw insertError;

      // 3️⃣ Insert default SMS balance
      await supabase.from("sms_balances").insert([{ office_id: branchOfficeId, balance: 10, updated_at: new Date().toISOString() }]);

      // 4️⃣ Insert receipt settings
      await supabase.from("receipt_settings").insert([{
        office_id: branchOfficeId,
        office_name: branchName,
        phone,
        email,
        address: `${region}, ${country}`,
        updated_by: managerName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

      // 5️⃣ Insert subscription (trial)
      await supabase.from("subscriptions").insert([{
        office_id: branchOfficeId,
        office_name: branchName,
        created_by: managerName,
        package_label: "Trial Days",
        amount: 0,
        package_days: trialDays,
        usagedays: trialDays,
        status: "completed",
        startdate: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }]);

      toast.success("Branch imesajiliwa kikamilifu!");

      setForm({
        managerName: "",
        branchName: "",
        email: "",
        phone: "",
        country: "Tanzania",
        region: "",
        referral: "",
        password: "",
        trialDays: 3
      });

      fetchBranches(baseId);

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Imeshindikana kutengeneza branch");
    } finally {
      setLoading(false);
    }
  };

  // ================= LOGIN AS BRANCH / MAIN =================
  const handleBranchLogin = async (branch) => {
    try {
      setLoading(true);

      // ⚠️ For demo: prompt for password
      const password = prompt(`Ingiza password ya ${branch.office_name}:`);
      if (!password) return;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: branch.email,
        password,
      });
      if (error) throw error;

      toast.success(`Umeingia ${branch.office_name}`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Login imefail");
    } finally {
      setLoading(false);
    }
  };

const handlePasswordSubmit = async () => {
  try {
    if (!passwordModal.password) return toast.error("Weka password");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: passwordModal.branch.email,
      password: passwordModal.password,
    });
    if (error) throw error;

    toast.success(`Umeingia ${passwordModal.branch.office_name}`);
    navigate("/dashboard");
  } catch (err) {
    toast.error(err.message || "Login imefail");
  } finally {
    setLoading(false);
    setPasswordModal({ open: false, branch: null, password: "" });
  }
};


  return (
  <div className="min-h-screen bg-gray-50 p-4 md:p-6">
    <Toaster position="top-right" />

    <div className="max-w-5xl mx-auto space-y-6">
     

      {/* TABS */}
      <Tab.Group>
        <Tab.List className="flex space-x-2 bg-white rounded-xl p-1 shadow">
          <Tab className={({ selected }) =>
            `flex-1 text-center py-2 font-medium rounded-lg ${
              selected ? "bg-[#2563EB] text-white" : "text-gray-700 hover:bg-gray-100"
            }`
          }>
            Orodha ya Matawi
          </Tab>
          <Tab className={({ selected }) =>
            `flex-1 text-center py-2 font-medium rounded-lg ${
              selected ? "bg-[#2563EB] text-white" : "text-gray-700 hover:bg-gray-100"
            }`
          }>
            Tengeneza Tawi
          </Tab>
        </Tab.List>

        <Tab.Panels className="mt-4">
          {/* LIST TAB */}
          <Tab.Panel>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <p className="text-gray-500 text-sm">Jumla ya Matawi</p>
                <p className="text-xl font-bold">{branches.length}</p>
              </div>
              
            </div>

            <div className="bg-white p-6 rounded-xl shadow space-y-4">
  <h2 className="text-lg font-bold text-gray-700">Orodha ya Matawi</h2>

  {branches.length === 0 ? (
    <p className="text-gray-500">Hakuna branch bado</p>
  ) : (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
  <tr>
    <th className="border p-2">Office ID</th>
    <th className="border p-2">Jina</th>
    <th className="border p-2">Meneja</th>
    <th className="border p-2">Email</th>
    <th className="border p-2">Region</th>
    <th className="border p-2">Usage Days</th>
    <th className="border p-2">Ingia</th>
  </tr>
</thead>
<tbody>
  {branches.map((b, i) => (
    <tr key={i} className="hover:bg-gray-50">
      <td className="border p-2">{b.office_id}</td>
      <td className="border p-2 flex items-center justify-between">
        {editingBranch?.office_id === b.office_id ? (
          <input
            type="text"
            value={editingBranch.office_name}
            onChange={(e) =>
              setEditingBranch({ ...editingBranch, office_name: e.target.value })
            }
            className="border p-1 rounded w-full text-sm"
          />
        ) : (
          b.office_name
        )}
        <button
          onClick={() => {
            if (editingBranch?.office_id === b.office_id) {
              setBranches(branches.map(br =>
                br.office_id === b.office_id
                  ? { ...br, office_name: editingBranch.office_name }
                  : br
              ));
              setEditingBranch(null);
            } else {
              setEditingBranch(b);
            }
          }}
          className="ml-2 text-blue-500 hover:text-blue-700"
        >
          <FaEdit />
        </button>
      </td>
      <td className="border p-2">{b.customer_name}</td>
      <td className="border p-2">{b.email}</td>
      <td className="border p-2">{b.region}</td>
      <td className="border p-2">{b.usageDays}</td>
      <td className="border p-2">
        <button
          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          onClick={() => setPasswordModal({ open: true, branch: b, password: "" })}
        >
          Ingia
        </button>
      </td>
    </tr>
  ))}
</tbody>

        </table>
      </div>

      <div className="md:hidden space-y-4">
  {branches.map((b, i) => (
    <div key={i} className="bg-white p-4 rounded-xl shadow border space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-700">{b.office_name}</span>
        <button
          onClick={() => {
            if (editingBranch?.office_id === b.office_id) {
              setBranches(branches.map(br =>
                br.office_id === b.office_id
                  ? { ...br, office_name: editingBranch.office_name }
                  : br
              ));
              setEditingBranch(null);
            } else {
              setEditingBranch(b);
            }
          }}
          className="text-blue-500 hover:text-blue-700"
        >
          <FaEdit />
        </button>
      </div>
      <div className="text-gray-500 text-sm space-y-1">
        <p><strong>Office ID:</strong> {b.office_id}</p>
        <p><strong>Meneja:</strong> {b.customer_name}</p>
        <p><strong>Email:</strong> {b.email}</p>
        <p><strong>Region:</strong> {b.region}</p>
        <p><strong>Usage Days:</strong> {b.usageDays}</p>
      </div>
      <button
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
        onClick={() => setPasswordModal({ open: true, branch: b, password: "" })}
      >
        Ingia
      </button>
    </div>
  ))}
</div>

    </>
  )}

            </div>
          </Tab.Panel>

          {/* CREATE TAB */}
          <Tab.Panel>
            <form onSubmit={handleCreateBranch} className="bg-white p-6 rounded-xl shadow space-y-4">
              <h2 className="text-xl font-bold text-gray-700">Tengeneza Tawi Mpya</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="managerName"
                  placeholder="Jina la Meneja"
                  value={form.managerName}
                  onChange={handleChange}
                  className="border p-2 rounded w-full text-sm"
                />
                <input
                  type="text"
                  name="branchName"
                  placeholder="Jina la Branch"
                  value={form.branchName}
                  onChange={handleChange}
                  className="border p-2 rounded w-full text-sm"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email ya Branch"
                  value={form.email}
                  onChange={handleChange}
                  className="border p-2 rounded w-full text-sm"
                />
                <PhoneInput
                  country="tz"
                  value={form.phone}
                  onChange={handlePhoneChange}
                  inputStyle={{ width: "100%", borderRadius: "0.5rem", height: "40px", fontSize: "0.875rem" }}
                />
                <input
                  type="text"
                  name="region"
                  placeholder="Region"
                  value={form.region}
                  onChange={handleChange}
                  className="border p-2 rounded w-full text-sm"
                />

                {/* PASSWORD WITH TOGGLE */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="border p-2 rounded w-full text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-gray-500"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <input
                  type="text"
                  name="referral"
                  placeholder="Referral (hiari)"
                  value={form.referral}
                  onChange={handleChange}
                  className="border p-2 rounded w-full text-sm"
                />
                <select
                  name="trialDays"
                  value={form.trialDays}
                  onChange={handleChange}
                  className="border p-2 rounded w-full text-sm"
                >
                  <option value={3}>Majaribio - siku 3</option>
                  <option value={4}>Majaribio - siku 4</option>
                  <option value={5}>Majaribio - siku 5</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2 rounded-xl hover:scale-105 transition text-sm"
              >
                <FaPlus /> {loading ? "Inaendelea..." : "Tengeneza Branch"}
              </button>
            </form>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* PASSWORD MODAL (Simple React + Tailwind) */}
      {passwordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg space-y-4 relative">
            <h2 className="text-lg font-bold">Weka Password</h2>
            <p className="text-gray-600">
              Ingiza password ya tawi la <strong>{passwordModal.branch?.office_name}</strong>
            </p>
            <div className="relative">
              <input
                type={showModalPassword ? "text" : "password"}
                value={passwordModal.password}
                onChange={(e) =>
                  setPasswordModal({ ...passwordModal, password: e.target.value })
                }
                className="w-full border p-3 rounded-lg text-sm"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowModalPassword(!showModalPassword)}
                className="absolute right-3 top-3 text-gray-500 text-sm"
              >
                {showModalPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setPasswordModal({ open: false, branch: null, password: "" })
                }
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              >
                Funga
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 rounded bg-[#2563EB] text-white hover:bg-blue-700 text-sm"
              >
                Ingia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);



};

export default CreateBranch;
