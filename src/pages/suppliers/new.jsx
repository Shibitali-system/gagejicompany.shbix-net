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
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] shadow-lg p-6 sm:p-8 space-y-6">
        
        {/* Back Link */}
        <Link to="../suppliers" className="flex items-center gap-2 text-[#ef4444] font-semibold hover:underline text-sm">
          <FaArrowLeft /> Back to Suppliers
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444] flex items-center gap-2">
              {bulkMode ? "Bulk Upload Suppliers (Excel)" : "Add New Supplier"}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {bulkMode 
                ? "Upload multiple suppliers at once via Excel." 
                : "Add a new supplier to the system."}
            </p>
          </div>
          
          {user && (
            <div className="text-sm text-gray-500 mt-2 sm:mt-0">
              Office: <span className="font-semibold text-[#ef4444]">{user.office_name}</span>
            </div>
          )}
        </div>

        {/* Toggle Bulk/Single */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className="flex items-center gap-2 bg-[#ef4444] text-white px-3 py-2 rounded-[4px] hover:bg-[#d63a3a] text-sm font-medium shadow"
          >
            {bulkMode ? <><FaUserPlus /> Single Add</> : <><FaUsers /> Bulk Upload</>}
          </button>
          
          {bulkMode && (
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-[4px] hover:bg-blue-700 text-sm font-medium shadow"
            >
              <FaDownload /> Download Template
            </button>
          )}
        </div>

        {!bulkMode ? (
          /* Single Add Form */
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: "name", label: "Supplier Name *", icon: <FaUserPlus className="text-[#ef4444]" /> },
              { name: "contact_person", label: "Contact Person", icon: <FaUserPlus className="text-[#ef4444]" /> },
              { name: "phone", label: "Phone", icon: <FaPhoneAlt className="text-[#ef4444]" /> },
              { name: "email", label: "Email", icon: <FaEnvelope className="text-[#ef4444]" /> },
              { name: "payment_terms", label: "Payment Terms", icon: <FaBuilding className="text-[#ef4444]" /> },
            ].map((field) => (
              <div key={field.name}>
                <label className="block font-semibold mb-1 flex items-center gap-2">{field.icon} {field.label}</label>
                <input
                  type={field.name === "email" ? "email" : "text"}
                  name={field.name}
                  value={supplierData[field.name]}
                  onChange={handleChange}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  className="border border-gray-300 rounded-[4px] px-3 py-2 w-full focus:ring-2 focus:ring-[#ef4444]"
                  required={field.name === "name"}
                />
              </div>
            ))}

            <div className="col-span-2">
              <label className="block font-semibold mb-1 flex items-center gap-2">
                <FaBuilding className="text-[#ef4444]" /> Address
              </label>
              <textarea
                name="address"
                value={supplierData.address}
                onChange={handleChange}
                placeholder="Enter address"
                className="border border-gray-300 rounded-[4px] px-3 py-2 w-full focus:ring-2 focus:ring-[#ef4444]"
                rows={2}
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold mb-1 flex items-center gap-2">
                <FaFileAlt className="text-[#ef4444]" /> Notes
              </label>
              <textarea
                name="notes"
                value={supplierData.notes}
                onChange={handleChange}
                placeholder="Additional notes"
                className="border border-gray-300 rounded-[4px] px-3 py-2 w-full focus:ring-2 focus:ring-[#ef4444]"
                rows={3}
              />
            </div>

            <div className="col-span-2 flex justify-center mt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-[#ef4444] hover:bg-[#d63a3a] text-white font-semibold px-6 py-3 rounded-[4px] shadow-md transition-transform hover:scale-105"
              >
                <FaSave /> {loading ? "Saving..." : "Save Supplier"}
              </button>
            </div>
          </form>
        ) : (
          /* Bulk Upload */
          <div className="space-y-4">
            <div className="border border-dashed border-[#ef4444] p-6 rounded-[4px] text-center">
              <FaUpload className="mx-auto text-[#ef4444] text-3xl mb-2" />
              <p className="font-semibold mb-2">Upload Excel file (.xlsx)</p>
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="block mx-auto" />
            </div>

            {excelSuppliers.length > 0 && (
              <>
                <div className="grid sm:grid-cols-4 gap-4 bg-[#fff5f5] p-4 rounded-[4px] border border-[#f5e5e5]">
                  <SummaryCard title="Total Suppliers" value={analytics.total} />
                  <SummaryCard title="With Email" value={analytics.withEmail} />
                  <SummaryCard title="With Phone" value={analytics.withPhone} />
                  <SummaryCard title="With Payment Terms" value={analytics.withTerms} />
                </div>

                <div className="max-h-64 overflow-y-auto border p-2 rounded-[4px] bg-gray-50">
                  <table className="w-full text-sm">
                    <thead className="bg-[#ef4444] text-white">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Payment Terms</th>
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
                      Showing first 10 of {excelSuppliers.length} records
                    </p>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleBulkInsert}
                    disabled={loading || excelSuppliers.length === 0}
                    className="flex items-center gap-2 bg-[#ef4444] hover:bg-[#d63a3a] text-white px-6 py-3 rounded-[4px] shadow font-semibold"
                  >
                    <FaSave /> {loading ? "Uploading..." : "Save All Suppliers"}
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
