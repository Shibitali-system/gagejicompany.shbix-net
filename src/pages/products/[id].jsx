import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  FaArrowLeft,
  FaEdit,
  FaDollarSign,
  FaWarehouse,
  FaBox,
  FaCalendarAlt,
  FaLayerGroup,
  FaClipboardList,
} from "react-icons/fa";

// ✅ Reusable Card Component
const InfoCard = ({ title, value, icon: Icon }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4
      flex flex-col gap-2
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide flex items-center gap-1">
      {Icon && <Icon className="text-[#2563EB]" />} {title}
    </p>
    <p className="text-gray-900 font-semibold text-lg">{value || "-"}</p>
  </div>
);

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        setProduct(data);
      } catch (err) {
        setError("Failed to load product: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <p className="text-gray-600">Loading product details...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!product) return <p className="text-gray-600">Product not found.</p>;

  const {
    name,
    category,
    price,
    stock,
    package_type,
    expiry_date,
    description,
    office_name,
    purchase_price,
  } = product;

  const expectedProfit =
    price && purchase_price && stock
      ? (Number(price) - Number(purchase_price)) * Number(stock)
      : 0;

 return (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
        <h1 className="text-3xl font-bold text-[#2563EB] flex items-center gap-2">
          {name}
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Link
            to={`/dashboard/products/edit/${id}`}
            className="flex items-center gap-1 bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-red-600 transition"
          >
            <FaEdit /> Hariri
          </Link>
          <Link
            to="/dashboard/products"
            className="flex items-center gap-2 text-[#2563EB] hover:text-red-600 font-medium"
          >
            <FaArrowLeft /> Rudi kwenye Bidhaa
          </Link>
        </div>
      </div>

      {/* Main Big Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
        {/* Small InfoCards in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
          <InfoCard title="Ofisi / Tawi" value={office_name} icon={FaWarehouse} />
          <InfoCard title="Kundi" value={category} icon={FaLayerGroup} />
          <InfoCard
            title="Bei ya Kuuza"
            value={price ? Number(price).toLocaleString() : "-"}
            icon={FaDollarSign}
          />
          <InfoCard
            title="Bei ya Ununuzi"
            value={purchase_price ? Number(purchase_price).toLocaleString() : "-"}
            icon={FaDollarSign}
          />
          <InfoCard
            title="Faida Inayotarajiwa"
            value={expectedProfit.toLocaleString()}
            icon={FaDollarSign}
          />
          <InfoCard title="Stok" value={stock || 0} icon={FaBox} />
          <InfoCard title="Aina ya Ufungashaji" value={package_type} icon={FaClipboardList} />
          <InfoCard
            title="Tarehe ya Mwisho wa Matumizi"
            value={expiry_date ? new Date(expiry_date).toLocaleDateString() : "-"}
            icon={FaCalendarAlt}
          />
        </div>

        {/* Description Card (spans full width) */}
        <InfoCard title="Maelezo" value={description} icon={FaClipboardList} />
      </div>
    </div>
  </div>
);

};

export default ProductDetail;
