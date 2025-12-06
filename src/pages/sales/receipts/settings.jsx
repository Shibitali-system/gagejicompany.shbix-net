import React, { useEffect, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";

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
  <div className="max-w-lg mx-auto bg-white shadow-lg rounded-2xl p-6 mt-8">
    <Toaster
      position="top-center"
      toastOptions={{
        success: { style: { background: "#16a34a", color: "white" } },
        error: { style: { background: "#dc2626", color: "white" } },
      }}
    />

    {/* Back Button */}
    <Link
      to="../sales"
      className="flex items-center gap-2 font-bold text-[#ef4444] hover:underline mb-4"
    >
      <FaArrowLeft /> Back to Sales List
    </Link>

    <h2 className="text-xl font-semibold mb-6 text-center text-[#ef4444]">
      Edit Receipt Information
    </h2>

    {/* Logo Upload */}
    <div className="mb-6 text-center">
      {info.logo_url || logoFile ? (
        <div className="flex flex-col items-center">
          <img
            src={logoFile ? URL.createObjectURL(logoFile) : info.logo_url}
            alt="Logo Preview"
            className="h-24 object-contain mb-3 rounded-lg shadow-sm"
          />
          <div className="flex gap-3">
            <label className="bg-[#ef4444] text-white px-3 py-1 rounded-lg cursor-pointer hover:bg-[#dc2626] transition">
              Change Logo
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </label>
            <button
              onClick={removeLogo}
              className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-6 cursor-pointer hover:border-[#ef4444] transition">
          <p className="text-gray-600 mb-2">Upload Office Logo</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />
        </label>
      )}
    </div>

    {/* Input Fields */}
    <div className="space-y-3">
      <label className="block font-medium text-gray-700">Office Name</label>
      <input
        value={info.office_name}
        placeholder="Enter Office Name"
        onChange={(e) => setInfo({ ...info, office_name: e.target.value })}
        className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
      />

      <label className="block font-medium text-gray-700">Address</label>
      <input
        value={info.address}
        placeholder="Enter Office Address"
        onChange={(e) => setInfo({ ...info, address: e.target.value })}
        className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
      />

      <label className="block font-medium text-gray-700">Phone</label>
      <input
        value={info.phone}
        placeholder="Enter Phone Number"
        onChange={(e) => setInfo({ ...info, phone: e.target.value })}
        className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
      />

      <label className="block font-medium text-gray-700">Email</label>
      <input
        value={info.email}
        placeholder="Enter Email Address"
        onChange={(e) => setInfo({ ...info, email: e.target.value })}
        className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
      />
    </div>

    {/* Save Button */}
    <button
      onClick={saveInfo}
      disabled={loading}
      className={`bg-[#ef4444] text-white px-4 py-2 rounded-xl hover:bg-[#dc2626] shadow mt-6 w-full flex items-center justify-center gap-2 transition ${
        loading ? "opacity-70 cursor-not-allowed" : ""
      }`}
    >
      {loading ? "Saving..." : "Save Changes"}
    </button>

    {/* Footer */}
    <div className="mt-6 border-t pt-4 text-sm text-gray-600 text-center space-y-1">
      <p>
        <strong>Registered Office:</strong> {officeName || "Unknown"}
      </p>
      <p>
        <strong>Updated By:</strong> {info.updated_by || "Unknown User"}
      </p>
      {info.updated_at && (
        <p className="italic text-xs text-gray-500">
          Last updated on: {new Date(info.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  </div>
);

};

export default EditReceiptInfo;
