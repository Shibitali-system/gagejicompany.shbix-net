import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  FaArrowLeft,
  FaSave,
  FaUserPlus,
  FaBuilding,
  FaPhoneAlt,
  FaEnvelope,
  FaFileAlt,
  FaUpload,
  FaUsers,
  FaDownload,
  FaChartPie,
} from "react-icons/fa";

const SupplierNew = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [supplierData, setSupplierData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    payment_terms: "",
  });
  const [excelSuppliers, setExcelSuppliers] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);

  // --- Fetch current user info ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        const { data: sysUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (sysUser) {
          setUser({
            id: sysUser.id,
            name: sysUser.customer_name,
            role: "system",
            office_id: sysUser.office_id,
            office_name: sysUser.office_name,
          });
          return;
        }

        const { data: emp } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (emp) {
          const { data: officeData } = await supabase
            .from("systems_users")
            .select("office_name, office_id")
            .eq("office_id", emp.office_id)
            .maybeSingle();

          setUser({
            id: emp.id,
            name: emp.name,
            role: "employee",
            office_id: officeData?.office_id || emp.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
          return;
        }

        toast.error("User info not found");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  // --- Handle Input ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSupplierData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!user) return toast.error("User info not loaded yet");
  if (!supplierData.name.trim()) return toast.error("Supplier name is required");

  setLoading(true);
  try {
    // Clean & normalize name
    const cleanName = supplierData.name.trim().toLowerCase();

    // Check duplicate for this office only
    const { data: existing, error: checkErr } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("office_id", user.office_id)
      .ilike("name", cleanName)
      .maybeSingle();

    if (existing) {
      toast.error(`Supplier "${existing.name}" already exists in this office`);
      setLoading(false);
      return;
    }

    // Insert supplier
    const { error } = await supabase.from("suppliers").insert([
      {
        ...supplierData,
        name: supplierData.name.trim(), // cleaned
        office_id: user.office_id,
        office_name: user.office_name || "-",
        created_by: user.name,
      },
    ]);

    if (error) throw error;

    toast.success("Supplier added successfully!");
    setSupplierData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      payment_terms: "",
    });

  } catch (err) {
    toast.error("Failed to add supplier: " + err.message);
  } finally {
    setLoading(false);
  }
};


  // --- Handle Excel Upload ---
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!data.length) return toast.error("Excel file is empty");
      setExcelSuppliers(data);
      toast.success(`${data.length} suppliers loaded from Excel`);
    };
    reader.readAsBinaryString(file);
  };

  // --- Download Template ---
  const handleDownloadTemplate = () => {
    const headers = [
      ["name", "contact_person", "phone", "email", "address", "payment_terms", "notes"],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "supplier_template.xlsx");
  };

  // --- Analytics ---
  const analytics = excelSuppliers.length
    ? {
        total: excelSuppliers.length,
        withEmail: excelSuppliers.filter((s) => s.email).length,
        withPhone: excelSuppliers.filter((s) => s.phone).length,
        withTerms: excelSuppliers.filter((s) => s.payment_terms).length,
      }
    : null;

  // --- Bulk Insert ---
  const handleBulkInsert = async () => {
    if (!user) return toast.error("User info not loaded yet");
    if (!excelSuppliers.length) return toast.error("No Excel data to upload");

    setLoading(true);
    try {
      const formatted = excelSuppliers.map((s) => ({
        name: s.name || "",
        contact_person: s.contact_person || "",
        phone: s.phone || "",
        email: s.email || "",
        address: s.address || "",
        notes: s.notes || "",
        payment_terms: s.payment_terms || "",
        office_id: user.office_id,
        office_name: user.office_name || "-",
        created_by: user.name,
      }));

      const { error } = await supabase.from("suppliers").insert(formatted);
      if (error) throw error;

      toast.success(`${formatted.length} suppliers added successfully`);
      setExcelSuppliers([]);
    } catch (err) {
      toast.error("Failed bulk insert: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    
    <div className="max-w-5xl mx-auto">
      {/* Single Card Container */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg shadow-lg p-4 sm:p-6 md:p-8 space-y-6">

        {/* Back Link */}
        <Link to="../suppliers" className="flex items-center gap-2 text-[#2563EB] font-semibold hover:underline text-sm">
          <FaArrowLeft /> Rudi kwenye Wauzaji
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2563EB] flex items-center gap-2">
              {bulkMode ? "Pakia Wauzaji Wengi (Excel)" : "Ongeza Muuzaji Mpya"}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {bulkMode 
                ? "Pakia wauzaji wengi kwa wakati mmoja kupitia Excel." 
                : "Ongeza muuzaji mpya kwenye mfumo."}
            </p>
          </div>
          
          {user && (
            <div className="text-sm text-gray-500 mt-2 md:mt-0">
              Ofisi: <span className="font-semibold text-[#2563EB]">{user.office_name}</span>
            </div>
          )}
        </div>

        {/* Toggle Bulk/Single */}
        <div className="flex flex-wrap justify-start md:justify-between items-center gap-2">
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className="flex items-center gap-2 bg-[#2563EB] text-white px-3 py-2 rounded-md hover:bg-[#d63a3a] text-sm font-medium shadow"
          >
            {bulkMode ? <><FaUserPlus /> Ongeza Moja</> : <><FaUsers /> Pakia Wengi</>}
          </button>
          
          {bulkMode && (
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium shadow"
            >
              <FaDownload /> Pakua Kiolezo
            </button>
          )}
        </div>

        {!bulkMode ? (
          /* Single Add Form */
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "name", label: "Jina la Muuzaji *", icon: <FaUserPlus className="text-[#2563EB]" /> },
              { name: "contact_person", label: "Mtu wa Kuwasiliana", icon: <FaUserPlus className="text-[#2563EB]" /> },
              { name: "phone", label: "Namba ya Simu", icon: <FaPhoneAlt className="text-[#2563EB]" /> },
              { name: "email", label: "Barua Pepe", icon: <FaEnvelope className="text-[#2563EB]" /> },
              { name: "payment_terms", label: "Masharti ya Malipo", icon: <FaBuilding className="text-[#2563EB]" /> },
            ].map((field) => (
              <div key={field.name}>
                <label className="block font-semibold mb-1 flex items-center gap-2 text-sm sm:text-base">{field.icon} {field.label}</label>
                <input
                  type={field.name === "email" ? "email" : "text"}
                  name={field.name}
                  value={supplierData[field.name]}
                  onChange={handleChange}
                  placeholder={`Weka ${field.label.toLowerCase()}`}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-[#2563EB]"
                  required={field.name === "name"}
                />
              </div>
            ))}

            <div className="col-span-1 md:col-span-2">
              <label className="block font-semibold mb-1 flex items-center gap-2 text-sm sm:text-base">
                <FaBuilding className="text-[#2563EB]" /> Anwani
              </label>
              <textarea
                name="address"
                value={supplierData.address}
                onChange={handleChange}
                placeholder="Weka anwani"
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-[#2563EB]"
                rows={2}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block font-semibold mb-1 flex items-center gap-2 text-sm sm:text-base">
                <FaFileAlt className="text-[#2563EB]" /> Maelezo
              </label>
              <textarea
                name="notes"
                value={supplierData.notes}
                onChange={handleChange}
                placeholder="Maelezo ya ziada"
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-[#2563EB]"
                rows={3}
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex justify-center mt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#d63a3a] text-white font-semibold px-6 py-3 rounded-md shadow transition-transform hover:scale-105 w-full md:w-auto justify-center"
              >
                <FaSave /> {loading ? "Inaendelea kuhifadhi..." : "Hifadhi Muuzaji"}
              </button>
            </div>
          </form>
        ) : (
          /* Bulk Upload */
          <div className="space-y-4">
            <div className="border border-dashed border-[#2563EB] p-4 sm:p-6 rounded-md text-center">
              <FaUpload className="mx-auto text-[#2563EB] text-3xl mb-2" />
              <p className="font-semibold mb-2 text-sm sm:text-base">Pakia faili la Excel (.xlsx)</p>
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="block mx-auto" />
            </div>

            {excelSuppliers.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#fff5f5] p-4 rounded-md border border-[#f5e5e5] text-sm">
                  <SummaryCard title="Jumla ya Wauzaji" value={analytics.total} />
                  <SummaryCard title="Wanaopatikana kwa Barua Pepe" value={analytics.withEmail} />
                  <SummaryCard title="Wanaopatikana kwa Simu" value={analytics.withPhone} />
                  <SummaryCard title="Wana Masharti ya Malipo" value={analytics.withTerms} />
                </div>

                <div className="max-h-64 overflow-y-auto border p-2 rounded-md bg-gray-50">
                  <table className="w-full text-sm">
                    <thead className="bg-[#2563EB] text-white text-xs sm:text-sm">
                      <tr>
                        <th className="p-2 text-left">Jina</th>
                        <th className="p-2 text-left">Simu</th>
                        <th className="p-2 text-left">Barua Pepe</th>
                        <th className="p-2 text-left">Masharti ya Malipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelSuppliers.slice(0, 10).map((s, i) => (
                        <tr key={i} className="border-b hover:bg-[#fff5f5]">
                          <td className="p-2">{s.name}</td>
                          <td className="p-2">{s.phone}</td>
                          <td className="p-2">{s.email}</td>
                          <td className="p-2">{s.payment_terms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {excelSuppliers.length > 10 && (
                    <p className="text-xs text-gray-500 text-center mt-1">
                      Kuonyesha rekodi 10 za kwanza kati ya {excelSuppliers.length}
                    </p>
                  )}
                </div>

                <div className="flex justify-center mt-2">
                  <button
                    onClick={handleBulkInsert}
                    disabled={loading || excelSuppliers.length === 0}
                    className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#d63a3a] text-white px-6 py-3 rounded-md shadow font-semibold w-full md:w-auto justify-center"
                  >
                    <FaSave /> {loading ? "Inaendelea kupakia..." : "Hifadhi Wauzaji Wote"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);


};

export default SupplierNew;
