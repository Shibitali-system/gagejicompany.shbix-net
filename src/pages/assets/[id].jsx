import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const SummaryCard = ({ title, value }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col items-center justify-center shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] font-sans w-full">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className="text-xl font-semibold mt-1 text-[#2563EB]">{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col items-start justify-center shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] font-sans w-full">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);

export default function AssetViewPage() {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usersMap, setUsersMap] = useState({});

  const fetchAsset = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1️⃣ Fetch asset
      const { data: assetData, error: assetError } = await supabase
        .from("assets")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (assetError) throw assetError;
      if (!assetData) throw new Error("Asset not found");

      // 2️⃣ Fetch history
      const { data: historyData, error: historyError } = await supabase
        .from("asset_quantity_history")
        .select("*")
        .eq("asset_id", id)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      // 3️⃣ Fetch users
      const { data: systemUsers } = await supabase.from("systems_users").select("auth_user_id, customer_name");
      const { data: employees } = await supabase.from("employees").select("auth_user_id, name");
      const userMap = {};
      (systemUsers || []).forEach(u => { userMap[u.auth_user_id] = u.customer_name; });
      (employees || []).forEach(u => { userMap[u.auth_user_id] = u.name; });
      setUsersMap(userMap);

      // 4️⃣ Attach names to history
      const historyWithNames = (historyData || []).map(h => ({
        ...h,
        created_by_name: userMap[h.created_by] || "-"
      }));

      setAsset(assetData);
      setHistory(historyWithNames);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAsset();
  }, [id]);

  if (loading) return <p className="p-6 text-gray-600 animate-pulse text-center text-lg">Loading asset data...</p>;
  if (error) return <p className="p-6 text-red-600 font-semibold text-center text-lg">{error}</p>;
  if (!asset) return <p className="p-6 text-gray-600 text-center text-lg">No asset data found.</p>;

  // Analytics
  const addedCount = history.filter(h => h.type === "added").reduce((sum,h)=>sum + Number(h.change),0);
  const damagedCount = history.filter(h => h.type === "damaged").reduce((sum,h)=>sum + Math.abs(Number(h.change)),0);
  const analyticsData = [
    { name: "Added", count: addedCount },
    { name: "Damaged", count: damagedCount },
    { name: "Current Qty", count: asset.quantity }
  ];

  return (
  <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

    {/* Kichwa */}
    <CustomCard>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#2563EB]">{asset.name} Maelezo</h1>
        <Link to="../assets" className="bg-gray-100 border border-gray-300 text-gray-700 px-5 py-2 rounded-xl">
          ← Rudi
        </Link>
      </div>
    </CustomCard>

    {/* Muhtasari */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard title="Kategoria" value={asset.category || "-"} />
      <SummaryCard title="Kiasi Sasa" value={asset.quantity} />
      <SummaryCard title="Jumla Iliyoongezwa" value={addedCount} />
      <SummaryCard title="Jumla Iliyoharibika" value={damagedCount} />
      <SummaryCard title="Tarehe ya Ununuzi" value={asset.purchase_date || "-"} />
      <SummaryCard title="Ofisi" value={asset.office_name || "-"} />
    </div>

    {/* Maelezo ya Mali */}
    <CustomCard title="Maelezo ya Mali">
      <p className="text-gray-700">{asset.notes || "-"}</p>
    </CustomCard>

    {/* Uchambuzi */}
    <CustomCard title="Uchambuzi wa Kiasi">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={analyticsData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={v => v.toLocaleString()} />
          <Bar dataKey="count" fill="#2563EB" radius={[8,8,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </CustomCard>

    {/* Historia */}
    <CustomCard title="Historia ya Kiasi cha Mali">
      {history.length === 0 ? (
        <p className="text-gray-600">Hakuna historia iliyopatikana.</p>
      ) : (
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className={`border-b pb-2 ${h.type==="added" ? "bg-green-50" : "bg-red-50"} px-2 py-1 rounded`}>
              <p className="text-gray-800">{h.change} {h.comment ? `(${h.comment})` : ""}</p>
              <p className="text-gray-500 text-xs">
                Na: {h.created_by_name} | Tarehe: {new Date(h.created_at).toLocaleString()} | Aina: {h.type === "added" ? "Iliyoongezwa" : "Iliyoharibika"}
              </p>
            </div>
          ))}
        </div>
      )}
    </CustomCard>

  </div>
);

}
