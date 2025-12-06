import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast"; 

const categoryOptions = [ "Analgesics / Pain Relief", "Anesthetics / Sedatives", "Anti-allergic / Anti-histamines", "Anti-parasitic / Anti-malarial Drugs", "Antibiotics", "Antifungals", "Antiseptics / Disinfectants", "Antipyretics", "Antivirals", "Appetite Stimulants", "Blood Glucose Regulators / Antidiabetics", "Bone Health / Calcium Preparations", "Cardiovascular Drugs", "Chemotherapy / Anticancer Drugs", "Cough & Cold Preparations", "Dermatology / Skin Preparations", "Diabetes / Antidiabetics", "Digestive Enzymes / Gastrointestinal Drugs", "Electrolytes / IV Fluids", "Eye / Ear / Nose Preparations", "Fluids / IV Preparations", "Gastrointestinal Drugs", "Gynecology / Obstetrics", "Hematology / Blood Products", "Hormones & Endocrine", "Hypertension / Antihypertensives", "Immune Modulators / Biologics", "Immunoglobulins / Blood Components", "Medical Devices", "Minerals / Trace Elements", "Musculoskeletal / Orthopedic Drugs", "Neurological / Psychiatric Drugs", "Nutrition & Dietetic Products", "Oncology / Anticancer Drugs", "Ophthalmic Drugs", "Radiology / Contrast Agents", "Renal / Urinary Drugs", "Respiratory Drugs", "Sedatives / Hypnotics", "Vaccines & Immunization", "Vitamins & Supplements", "Wound Care / Dressings", "Others" ]; const packageOptions = [ "Ampules", "Bags", "Blister Packs", "Bottles", "Boxes", "Capsules", "Cream", "Cream Tube", "Drops", "Foam", "Gel", "Granules", "Inhalers", "Kg", "Lotion", "Lozenges", "Mg", "Ml", "Ointment", "Ointment Tube", "Packets", "Pcs", "Patch", "Powder", "Roll-on", "Sachets", "Spray", "Solution", "Spoonful", "Syrup", "Suppository", "Suspension", "Tablets", "Tape", "Transdermal Patch", "Units", "Vials", "Wafers", "Others" ];
// Primary Color
const primary = "#ef4444";

// Reusable Card (same design as InfoCard in product detail)
const FormCard = ({ children }) => (
  <div
    className="
      bg-white border border-[#e5e7eb] rounded-[14px] px-5 py-5
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.20)]
      w-full
    "
    style={{ willChange: "transform" }}
  >
    {children}
  </div>
);

const ProductEdit = () => {
  const { id } = useParams();
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    package_type: "",
    expiry_date: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) throw new Error("User not logged in");

        const { data: sysUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (sysUser) {
          setUserInfo({
            id: sysUser.id,
            name: sysUser.customer_name,
            type: "system",
            office_id: sysUser.office_id,
            office_name: sysUser.office_name,
          });
          return;
        }

        const { data: empUser } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (empUser) {
          setUserInfo({
            id: empUser.id,
            name: empUser.name,
            type: "employee",
            office_id: empUser.office_id,
            office_name: empUser.office_name,
          });
          return;
        }

        throw new Error("User info not found");
      } catch (err) {
        setError("Failed to fetch user info: " + err.message);
      }
    };

    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;

        setForm({
          name: data.name,
          category: data.category,
          price: data.price,
          stock: data.stock,
          package_type: data.package_type,
          expiry_date: data.expiry_date ? data.expiry_date.split("T")[0] : "",
          description: data.description,
        });
      } catch (err) {
        setError("Failed to load product: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
    fetchProduct();
  }, [id]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!userInfo) throw new Error("User info missing");

      const { error: updateError } = await supabase
        .from("products")
        .update({
          ...form,
          price: parseFloat(form.price),
          stock: parseInt(form.stock),
          office_name: userInfo.office_name,
          last_edited_by: userInfo.name,
          updated_at: new Date(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      toast.success("Product updated successfully!", {
        style: { background: primary, color: "#fff" },
      });
    } catch (err) {
      toast.error("Failed: " + err.message, {
        style: { background: "#dc2626", color: "#fff" },
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading product...</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <h1 className="text-3xl font-bold text-[#ef4444]">Edit Product</h1>

          <Link
            to="/pharmacy/dashboard/products"
            className="flex items-center gap-2 text-[#ef4444] hover:text-red-700 font-medium mt-3 md:mt-0"
          >
            <FaArrowLeft /> Back to Products
          </Link>
        </div>

        {/* Main Card (Container) */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">

          {/* Form wrapped inside card-style sections */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* PRODUCT INFO */}
            <FormCard>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="font-medium text-gray-700">Product Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ef4444]"
                    required
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ef4444]"
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

              </div>
            </FormCard>

            {/* PRICES + STOCK */}
            <FormCard>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Selling Price</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ef4444]"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ef4444]"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Package Type</label>
                  <select
                    name="package_type"
                    value={form.package_type}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ef4444]"
                  >
                    <option value="">Select Package</option>
                    {packageOptions.map((pkg) => (
                      <option key={pkg}>{pkg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={form.expiry_date}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ef4444]"
                  />
                </div>
              </div>
            </FormCard>

            {/* DESCRIPTION */}
            <FormCard>
              <label className="font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#ef4444]"
              />
            </FormCard>

            {/* READ ONLY FIELDS */}
            <FormCard>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Office Name</label>
                  <input
                    disabled
                    value={userInfo?.office_name || ""}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">Last Edited By</label>
                  <input
                    disabled
                    value={userInfo?.name || ""}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
            </FormCard>

            {/* SAVE BUTTON */}
            <button
              type="submit"
              disabled={saving}
              className={`
                mt-4 flex items-center justify-center gap-2 text-white 
                px-6 py-3 rounded-xl transition shadow 
                bg-[#ef4444] hover:bg-red-600 active:scale-95 
                ${saving ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <FaCheckCircle />
              {saving ? "Saving..." : "Save Changes"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductEdit;
