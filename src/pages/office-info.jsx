import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

const SummaryCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-center justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-start justify-center
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

const EditReceiptInfo = () => {
  const [info, setInfo] = useState({
    office_name: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    id: null,
    updated_by: "",
    updated_at: null,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Office info for display
  const [officeName, setOfficeName] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [enteredBy, setEnteredBy] = useState("");

  // 🔹 Identify the user and their office
  useEffect(() => {
    const fetchUserOffice = async () => {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !authUser) throw new Error("Failed to get authenticated user.");

        // Step 1: Check main system user
        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("office_id, office_name, customer_name")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser?.office_id) {
          setOfficeId(systemUser.office_id);
          setOfficeName(systemUser.office_name);
          setEnteredBy(systemUser.customer_name);
          await loadReceiptInfo(systemUser.office_id);
          return;
        }

        // Step 2: Check employee
        const { data: employee } = await supabase
          .from("employees")
          .select("office_id, name")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee?.office_id) {
          setOfficeId(employee.office_id);
          setEnteredBy(employee.name);

          // fetch office_name from systems_users table
          const { data: office } = await supabase
            .from("systems_users")
            .select("office_name")
            .eq("office_id", employee.office_id)
            .maybeSingle();

          setOfficeName(office?.office_name || "Unknown Office");
          await loadReceiptInfo(employee.office_id);
        } else {
          toast.error("Office not identified for this user.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user/office info.");
      }
    };

    fetchUserOffice();
  }, []);

  // 🔹 Load receipt settings by office_id in batches
  const loadReceiptInfo = async (office_id) => {
    try {
      const allData = [];
      let offset = 0;
      const limit = 1000;
      let batch = [];

      do {
        const { data, error } = await supabase
          .from("receipt_settings")
          .select("*")
          .eq("office_id", office_id)
          .range(offset, offset + limit - 1);

        if (error) throw error;

        batch = data || [];
        allData.push(...batch);
        offset += limit;
      } while (batch.length === limit);

      if (allData.length > 0) {
        setInfo(allData[0]); // edit first record by default
      } else {
        setInfo({
          office_name: "",
          address: "",
          phone: "",
          email: "",
          logo_url: "",
          id: null,
          updated_by: "",
          updated_at: null,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading receipt info: " + err.message);
    }
  };

  // 🔹 Upload logo
  const uploadLogo = async () => {
    if (!logoFile) return info.logo_url;

    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return data?.publicUrl || "";
    } catch (err) {
      toast.error("Logo upload failed: " + err.message);
      return info.logo_url;
    }
  };

  // 🔹 Save or update receipt info
  const saveInfo = async () => {
    if (!info.office_name || !info.phone) {
      toast.error("Please fill in Office Name and Phone.");
      return;
    }
    if (!officeId) {
      toast.error("Cannot save: Office ID not found.");
      return;
    }

    setLoading(true);
    try {
      const logoUrl = await uploadLogo();
      const newData = {
        office_id: officeId,
        office_name: info.office_name,
        address: info.address,
        phone: info.phone,
        email: info.email,
        logo_url: logoUrl,
        updated_by: enteredBy,
        updated_at: new Date().toISOString(),
      };

      let savedData = null;

      if (info.id) {
        const { data, error } = await supabase
          .from("receipt_settings")
          .update(newData)
          .eq("id", info.id)
          .select()
          .single();
        if (error) throw error;
        savedData = data;
        toast.success("✅ Receipt info updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("receipt_settings")
          .insert([newData])
          .select()
          .single();
        if (error) throw error;
        savedData = data;
        toast.success("✅ Receipt info saved successfully!");
      }

      setInfo(savedData);
      setLogoFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Save failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) setLogoFile(file);
  };

  const removeLogo = () => {
    setInfo({ ...info, logo_url: "" });
    setLogoFile(null);
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster
      position="top-center"
      toastOptions={{
        success: { style: { background: "#16a34a", color: "white" } },
        error: { style: { background: "#dc2626", color: "white" } },
      }}
    />

    <div className="max-w-5xl mx-auto space-y-6">

      {/* Kadi ya Kichwa */}
      <CustomCard title="Mipangilio ya Kichwa cha Nyaraka za Ofisi">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] mb-1">
          Mipangilio ya Kichwa cha Nyaraka za Ofisi
        </h1>
        <p className="text-gray-500 text-sm">
          Dhibiti nembo ya ofisi na taarifa za kichwa cha nyaraka
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-sm text-blue-800">
          <strong>Kumbuka:</strong> Taarifa unazoingiza hapa zitatumika kama{" "}
          <strong>kichwa cha juu</strong> kwenye <strong>risiti, ankara za proforma, majibu ya wateja, nukuu za bei</strong>{" "}
          na <strong>nyaraka zote rasmi za ofisi</strong>.  
          Tafadhali hakikisha taarifa hizi ni sahihi kwa matumizi ya kisheria na rasmi.
        </div>
      </CustomCard>

      {/* Kadi ya Hakiki ya Kichwa */}
      <CustomCard title="Hakiki ya Kichwa">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-2xl flex flex-col items-center text-center border rounded-xl bg-white shadow-sm p-6">

            {/* Nembo */}
            {info.logo_url || logoFile ? (
              <img
                src={logoFile ? URL.createObjectURL(logoFile) : info.logo_url}
                alt="Nembo"
                className="h-24 object-contain mb-3"
              />
            ) : (
              <div className="h-24 w-24 flex items-center justify-center border rounded text-xs text-gray-400 mb-3">
                Nembo
              </div>
            )}

            {/* Jina la Ofisi */}
            <h2 className="text-2xl font-bold text-gray-800 leading-tight">
              {info.office_name || "Jina la Ofisi"}
            </h2>

            {/* Anwani */}
            <p className="text-sm text-gray-600 mt-1">
              {info.address || "Anwani ya Ofisi"}
            </p>

            {/* Simu */}
            <p className="text-sm text-gray-600 mt-1">
              {info.phone || "Namba ya Simu"}
            </p>

            {/* Barua pepe */}
            <p className="text-sm text-gray-600 mt-1">
              {info.email || "Barua pepe"}
            </p>

            {/* Mgawanyiko */}
            <div className="w-full border-t my-3"></div>

            {/* Mfano wa Taarifa za Risiti */}
            <div className="w-full flex justify-between text-xs text-gray-500">
              <span>Namba ya Risiti: 000123</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>

          </div>
        </div>
      </CustomCard>

      {/* Kadi ya Nembo */}
      <CustomCard title="Nembo ya Ofisi">
        <div className="flex flex-col items-center">
          {info.logo_url || logoFile ? (
            <>
              <img
                src={logoFile ? URL.createObjectURL(logoFile) : info.logo_url}
                alt="Hakiki ya Nembo"
                className="h-28 object-contain mb-4 rounded-lg shadow-sm"
              />
              <div className="flex gap-3">
                <label className="bg-[#2563EB] text-white px-4 py-2 rounded-[4px] cursor-pointer hover:bg-[#d63a3a] transition">
                  Badilisha Nembo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={removeLogo}
                  className="bg-gray-500 text-white px-4 py-2 rounded-[4px] hover:bg-gray-600 transition"
                >
                  Ondoa
                </button>
              </div>
            </>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-[#2563EB] transition w-full sm:w-1/2">
              <p className="text-gray-600 mb-2">Pakia Nembo ya Ofisi</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </CustomCard>

      {/* Kadi ya Taarifa za Ofisi */}
      <CustomCard title="Taarifa za Ofisi">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="block font-medium text-gray-700 mb-1">Jina la Ofisi</label>
            <input
              value={info.office_name}
              placeholder="Weka jina la ofisi"
              onChange={(e) => setInfo({ ...info, office_name: e.target.value })}
              className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Simu</label>
            <input
              value={info.phone}
              placeholder="Weka namba ya simu"
              onChange={(e) => setInfo({ ...info, phone: e.target.value })}
              className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Barua pepe</label>
            <input
              value={info.email}
              placeholder="Weka barua pepe"
              onChange={(e) => setInfo({ ...info, email: e.target.value })}
              className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Anwani</label>
            <input
              value={info.address}
              placeholder="Weka anwani ya ofisi"
              onChange={(e) => setInfo({ ...info, address: e.target.value })}
              className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

        </div>
      </CustomCard>

      {/* Kadi ya Kuhifadhi */}
      <CustomCard>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <p><strong>Ofisi Iliyosajiliwa:</strong> {officeName || "Haijulikani"}</p>
            <p><strong>Ilibadilishwa na:</strong> {info.updated_by || "Mtumiaji Hajulikani"}</p>
            {info.updated_at && (
              <p className="italic text-xs text-gray-500">
                Ilisasishwa mwisho: {new Date(info.updated_at).toLocaleString()}
              </p>
            )}
          </div>

          <button
            onClick={saveInfo}
            disabled={loading}
            className={`bg-[#2563EB] text-white px-6 py-3 rounded-[4px] hover:bg-[#d63a3a] shadow transition-all duration-200 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Inahifadhi..." : "Hifadhi Mabadiliko"}
          </button>
        </div>
      </CustomCard>

    </div>
  </div>
);



};

export default EditReceiptInfo;
