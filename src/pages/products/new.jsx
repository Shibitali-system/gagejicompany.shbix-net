import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { sendNotification } from "../utils/sendNotification";
import * as XLSX from "xlsx";
import { toast, Toaster } from "react-hot-toast";
import { FaPlus, FaFileExcel, FaArrowLeft, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

const categoryOptions = [
  "Analgesics / Pain Relief",
  "Anesthetics / Sedatives",
  "Anti-allergic / Anti-histamines",
  "Anti-parasitic / Anti-malarial Drugs",
  "Antibiotics",
  "Antifungals",
  "Antiseptics / Disinfectants",
  "Antipyretics",
  "Antivirals",
  "Appetite Stimulants",
  "Blood Glucose Regulators / Antidiabetics",
  "Bone Health / Calcium Preparations",
  "Cardiovascular Drugs",
  "Chemotherapy / Anticancer Drugs",
  "Cough & Cold Preparations",
  "Dermatology / Skin Preparations",
  "Diabetes / Antidiabetics",
  "Digestive Enzymes / Gastrointestinal Drugs",
  "Electrolytes / IV Fluids",
  "Eye / Ear / Nose Preparations",
  "Fluids / IV Preparations",
  "Gastrointestinal Drugs",
  "Gynecology / Obstetrics",
  "Hematology / Blood Products",
  "Hormones & Endocrine",
  "Hypertension / Antihypertensives",
  "Immune Modulators / Biologics",
  "Immunoglobulins / Blood Components",
  "Medical Devices",
  "Minerals / Trace Elements",
  "Musculoskeletal / Orthopedic Drugs",
  "Neurological / Psychiatric Drugs",
  "Nutrition & Dietetic Products",
  "Oncology / Anticancer Drugs",
  "Ophthalmic Drugs",
  "Radiology / Contrast Agents",
  "Renal / Urinary Drugs",
  "Respiratory Drugs",
  "Sedatives / Hypnotics",
  "Vaccines & Immunization",
  "Vitamins & Supplements",
  "Wound Care / Dressings",
  "Others"
];



const packageOptions = [
  "Ampules",
  "Bags",
  "Blister Packs",
  "Bottles",
  "Boxes",
  "Capsules",
  "Cream",
  "Cream Tube",
  "Drops",
  "Foam",
  "Gel",
  "Granules",
  "Inhalers",
  "Kg",
  "Lotion",
  "Lozenges",
  "Mg",
  "Ml",
  "Ointment",
  "Ointment Tube",
  "Packets",
  "Pcs",
  "Patch",
  "Powder",
  "Roll-on",
  "Sachets",
  "Spray",
  "Solution",
  "Spoonful",
  "Syrup",
  "Suppository",
  "Suspension",
  "Tablets",
  "Tape",
  "Transdermal Patch",
  "Units",
  "Vials",
  "Wafers",
  "Others"
];

const ProductNew = ({ officeName = "" }) => {
  const navigate = useNavigate();
  const nameRef = useRef(null); // For focusing after submit
  const excelInputRef = useRef(null); // For clearing Excel input

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    purchase_price: "",
    stock: "",
    expiry_date: "",
    description: "",
    package_type: "",
  });

  const [expectedProfit, setExpectedProfit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("single"); // "single" or "bulk"
  const [excelData, setExcelData] = useState([]);
  const [excelSummary, setExcelSummary] = useState({ totalProducts: 0, totalStock: 0, totalProfit: 0 });

  const [highlightFields, setHighlightFields] = useState([]); // For required field highlighting

  useEffect(() => {
    const price = parseFloat(form.price) || 0;
    const purchase = parseFloat(form.purchase_price) || 0;
    const stock = parseInt(form.stock) || 0;
    setExpectedProfit((price - purchase) * stock);
  }, [form.price, form.purchase_price, form.stock]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setHighlightFields(highlightFields.filter(f => f !== e.target.name)); // Remove highlight when user types
  };

  // Auto-fetch office info
  useEffect(() => {
    const fetchOfficeInfo = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        let foundOfficeName = "Unknown";
        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("office_name")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser?.office_name) {
          foundOfficeName = systemUser.office_name;
        } else {
          const { data: employee } = await supabase
            .from("employees")
            .select("office_id")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();

          if (employee?.office_id) {
            const { data: officeInfo } = await supabase
              .from("systems_users")
              .select("office_name")
              .eq("office_id", employee.office_id)
              .maybeSingle();
            if (officeInfo?.office_name) foundOfficeName = officeInfo.office_name;
          }
        }

        setForm(prev => ({ ...prev, office_name: foundOfficeName }));
      } catch (err) {
        console.error("Failed to fetch office info", err.message);
      }
    };
    fetchOfficeInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Required fields validation
    const required = ["name", "price", "purchase_price", "stock", "package_type"];
    const emptyFields = required.filter(field => !form[field]);
    if (emptyFields.length > 0) {
      toast.error("Please fill in all required fields!");
      setHighlightFields(emptyFields);
      setLoading(false);
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let userName = "Unknown", officeId = null, officeName = "Unknown", userType = "employee";

      const { data: systemUser } = await supabase
        .from("systems_users")
        .select("customer_name, office_id, office_name")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (systemUser) {
        userName = systemUser.customer_name;
        officeId = systemUser.office_id;
        officeName = systemUser.office_name;
        userType = "system";
      } else {
        const { data: employee } = await supabase
          .from("employees")
          .select("name, office_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) {
          userName = employee.name;
          officeId = employee.office_id;
          const { data: officeInfo } = await supabase
            .from("systems_users")
            .select("office_name")
            .eq("office_id", employee.office_id)
            .maybeSingle();
          if (officeInfo) officeName = officeInfo.office_name;
        }
      }

      const { error } = await supabase.from("products").insert([{
        ...form,
        price: parseFloat(form.price),
        purchase_price: parseFloat(form.purchase_price),
        stock: parseInt(form.stock),
        expiry_date: form.expiry_date || null,
        entered_by: userName,
        entered_by_id: authUser.id,
        office_id: officeId,
        office_name: officeName,
        user_type: userType,
      }]);
      if (error) throw error;

      await sendNotification({
        auth_user_id: authUser.id,
        office_id: officeId,
        title: "New Product Added",
        message: `${userName} added a new product: ${form.name}`,
        link: "/pharmacy/dashboard/products",
        type: "both",
      });

      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("New Product Added", { body: `${userName} added a new product: ${form.name}` });
        } else if (Notification.permission !== "granted") {
          Notification.requestPermission();
        }
      }

      toast.success("✅ Product added successfully!");

      // Reset form but keep office info
      setForm({
        name: "",
        category: "",
        description: "",
        package_type: "",
        price: "",
        purchase_price: "",
        stock: "",
        expiry_date: "",
        office_id: form.office_id,
        office_name: form.office_name,
      });

      setHighlightFields([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      nameRef.current?.focus();
    } catch (err) {
      toast.error("❌ Failed to add product: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setExcelData(jsonData);

      const totalProducts = jsonData.length;
      const totalStock = jsonData.reduce((acc, i) => acc + (parseInt(i.stock) || 0), 0);
      const totalProfit = jsonData.reduce((acc, i) => {
        const price = parseFloat(i.price) || 0;
        const purchase = parseFloat(i.purchase_price) || 0;
        const stock = parseInt(i.stock) || 0;
        return acc + (price - purchase) * stock;
      }, 0);

      setExcelSummary({ totalProducts, totalStock, totalProfit });
      toast.success("📂 Excel file loaded successfully!");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelSave = async () => {
    if (excelData.length === 0) return;
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let userName = "Unknown", officeId = null, officeName = "Unknown", userType = "employee";

      const { data: systemUser } = await supabase
        .from("systems_users")
        .select("customer_name, office_id, office_name")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (systemUser) {
        userName = systemUser.customer_name;
        officeId = systemUser.office_id;
        officeName = systemUser.office_name;
        userType = "system";
      } else {
        const { data: employee } = await supabase
          .from("employees")
          .select("name, office_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) {
          userName = employee.name;
          officeId = employee.office_id;
        }
      }

      const dataToInsert = excelData.map(item => ({
        name: item.name,
        category: item.category || "",
        description: item.description || "",
        package_type: item.package_type || "",
        price: parseFloat(item.price) || 0,
        purchase_price: parseFloat(item.purchase_price) || 0,
        stock: parseInt(item.stock) || 0,
        expiry_date: item.expiry_date || null,
        entered_by: userName,
        entered_by_id: authUser.id,
        office_id: officeId,
        office_name: officeName,
        user_type: userType,
      }));

      const { error } = await supabase.from("products").insert(dataToInsert);
      if (error) throw error;

      toast.success("✅ Products uploaded successfully!");
      setExcelData([]);
      setExcelSummary({ totalProducts: 0, totalStock: 0, totalProfit: 0 });
      if (excelInputRef.current) excelInputRef.current.value = "";
    } catch (err) {
      toast.error("❌ Failed to upload products: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleData = [
      { name: "Paracetamol 500mg", category: "Analgesics / Pain Relief", price: 500, purchase_price: 300, stock: 100, expiry_date: "2026-12-31", package_type: "Tablets", description: "Pain relief tablets" },
      { name: "Amoxicillin 250mg", category: "Antibiotics", price: 800, purchase_price: 500, stock: 50, expiry_date: "2027-05-30", package_type: "Capsules", description: "Broad-spectrum antibiotic" },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "sample_products.xlsx");
  };

  const toggleView = (mode) => {
    setViewMode(mode);
    if (mode === "bulk" && excelInputRef.current) excelInputRef.current.value = ""; // Clear previous file
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    {/* Toasts */}
    <Toaster
  position="top-right"
  gutter={24}
  toastOptions={{
    duration: 5000, // Time in ms, toast ikae kidogo
    style: {
      borderRadius: "12px",
      background: "#ef4444", // Rangi kuu ya app
      color: "#ffffff", // Text color
      fontWeight: "bold", // Bold text
      fontSize: "0.875rem",
      padding: "10px 16px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
    iconTheme: {
      primary: "#ffffff", // React icon color
      secondary: "#ef4444", // Background for icon circle
    },
    success: {
      icon: <FaCheckCircle />, // React icon
      style: { background: "#ef4444", color: "#ffffff", fontWeight: "bold" },
    },
    error: {
      icon: <FaExclamationCircle />, // React icon
      style: { background: "#ef4444", color: "#ffffff", fontWeight: "bold" },
    },
  }}
/>


    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#ef4444] flex items-center gap-2">
          <FaPlus /> Add New Product
        </h1>
        <Link
          to="/pharmacy/dashboard/products"
          className="flex items-center gap-2 text-[#ef4444] hover:text-[#d63636] font-medium text-sm sm:text-base"
        >
          <FaArrowLeft /> Back to Products
        </Link>
      </div>

      {/* Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {["single", "bulk"].map((mode) => (
          <button
            key={mode}
            onClick={() => toggleView(mode)}
            className={`px-4 sm:px-5 py-2 rounded-2xl font-medium text-sm sm:text-base transition-all shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] transform hover:-translate-y-[1px] active:translate-y-[1px] ${
              viewMode === mode
                ? "bg-[#ef4444] text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {mode === "single" ? "Single Product" : "Bulk Upload (Excel)"}
          </button>
        ))}
      </div>

      {/* Single Product Form */}
      {viewMode === "single" && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-[0_1px_0px_0_rgba(0,0,0,0.1)]"
        >
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 text-sm sm:text-base">
                Product Name*
              </label>
              <input
                ref={nameRef}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full border rounded-xl px-3 py-2 text-sm sm:text-sm focus:ring-2 focus:ring-[#ef4444] ${
                  highlightFields.includes("name") ? "border-red-500" : ""
                }`}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 text-sm sm:text-base">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border rounded-xl px-3 py-2 text-sm sm:text-sm focus:ring-2 focus:ring-[#ef4444]"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-gray-700 text-sm sm:text-base">
                Selling Price (TZS)*
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                className={`w-full border rounded-xl px-3 py-2 text-sm sm:text-sm focus:ring-2 focus:ring-[#ef4444] ${
                  highlightFields.includes("price") ? "border-red-500" : ""
                }`}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 text-sm sm:text-base">
                Purchase Price (TZS)*
              </label>
              <input
                type="number"
                name="purchase_price"
                value={form.purchase_price}
                onChange={handleChange}
                className={`w-full border rounded-xl px-3 py-2 text-sm sm:text-sm focus:ring-2 focus:ring-[#ef4444] ${
                  highlightFields.includes("purchase_price") ? "border-red-500" : ""
                }`}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 text-sm sm:text-base">
                Stock*
              </label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                className={`w-full border rounded-xl px-3 py-2 text-sm sm:text-sm focus:ring-2 focus:ring-[#ef4444] ${
                  highlightFields.includes("stock") ? "border-red-500" : ""
                }`}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 text-sm sm:text-base">
                Package Type*
              </label>
              <select
                name="package_type"
                value={form.package_type}
                onChange={handleChange}
                className={`w-full border rounded-xl px-3 py-2 text-sm sm:text-sm focus:ring-2 focus:ring-[#ef4444] ${
                  highlightFields.includes("package_type") ? "border-red-500" : ""
                }`}
              >
                <option value="">Select Package</option>
                {packageOptions.map((pkg) => (
                  <option key={pkg} value={pkg}>
                    {pkg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 text-sm sm:text-base">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiry_date"
                value={form.expiry_date}
                onChange={handleChange}
                className="w-full border rounded-xl px-3 py-2 text-sm sm:text-sm focus:ring-2 focus:ring-[#ef4444]"
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 text-sm sm:text-base">
                Expected Profit (TZS)
              </label>
              <input
                type="text"
                value={expectedProfit.toLocaleString()}
                readOnly
                className="w-full border rounded-xl px-3 py-2 text-sm sm:text-sm bg-gray-100"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-bold text-gray-700 text-sm sm:text-base">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm sm:text-sm focus:ring-2 focus:ring-[#ef4444]"
            />
          </div>

          {/* Office */}
          <div>
            <label className="font-bold text-gray-700 text-sm sm:text-base">
              Pharmacy / Office
            </label>
            <input
              type="text"
              value={form.office_name || ""}
              readOnly
              className="w-full border rounded-xl px-3 py-2 text-sm sm:text-sm bg-gray-100 text-gray-700"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 flex items-center gap-2 bg-[#ef4444] text-white px-4 py-2 text-sm sm:text-base rounded-2xl shadow hover:bg-[#d63636] transition transform hover:-translate-y-[1px] active:translate-y-[1px] w-full sm:w-auto justify-center"
          >
            <FaCheckCircle /> {loading ? "Saving..." : "Add Product"}
          </button>
        </form>
      )}

      {/* Bulk Upload */}
      {viewMode === "bulk" && (
        <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 shadow-[0_1px_0px_0_rgba(0,0,0,0.1)]">
          <h2 className="text-lg sm:text-xl font-bold text-[#ef4444] mb-2 flex items-center gap-2">
            <FaFileExcel /> Bulk Upload via Excel
          </h2>
          <button
            onClick={handleDownloadSample}
            className="text-[#ef4444] hover:underline mb-2 inline-block font-semibold text-sm sm:text-base"
          >
            📥 Download Sample Template
          </button>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelUpload}
            className="block mt-2 border rounded-xl px-2 py-2 w-full sm:w-auto text-sm"
          />

          {excelData.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-gray-700 text-sm sm:text-base">
                <b>Total Products:</b> {excelSummary.totalProducts}
              </p>
              <p className="text-gray-700 text-sm sm:text-base">
                <b>Total Stock:</b> {excelSummary.totalStock}
              </p>
              <p className="text-gray-700 text-sm sm:text-base">
                <b>Total Expected Profit (TZS):</b>{" "}
                {excelSummary.totalProfit.toLocaleString()}
              </p>

              <button
                onClick={handleExcelSave}
                disabled={loading}
                className="mt-3 sm:mt-4 flex items-center gap-2 bg-[#ef4444] text-white px-4 py-2 text-sm sm:text-base rounded-2xl shadow hover:bg-[#d63636] transition transform hover:-translate-y-[1px] active:translate-y-[1px] w-full sm:w-auto justify-center"
              >
                {loading ? "Uploading..." : "Save All Products"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

};

export default ProductNew;
                                                                                                                                                                                        