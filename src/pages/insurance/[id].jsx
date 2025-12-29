import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- Card Components ---
const SummaryCard = ({ title, value }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col items-center justify-center shadow font-sans w-full">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className="text-xl font-semibold mt-1 text-[#2563EB]">{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col items-start justify-center shadow font-sans w-full">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);

const CHUNK_SIZE = 500;

export default function InsuranceProfile() {
  const { id } = useParams();
  const [insurance, setInsurance] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics
  const [claimsCount, setClaimsCount] = useState(0);

  // Fetch insurance details
  const fetchInsurance = async () => {
    const { data, error } = await supabase
      .from("insurance_providers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) throw new Error("Insurance provider not found");
    return data;
  };

  // Fetch claims under this insurance
  const fetchClaims = async () => {
    let allClaims = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("insurance_id", id)
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allClaims = [...allClaims, ...data];
      offset += CHUNK_SIZE;
    }
    return allClaims;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const ins = await fetchInsurance();
      const insClaims = await fetchClaims();

      setInsurance(ins);
      setClaims(insClaims);
      setClaimsCount(insClaims.length);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  if (loading)
    return <p className="p-6 text-gray-600 animate-pulse text-center text-lg">Loading insurance data...</p>;
  if (error)
    return <p className="p-6 text-red-600 font-semibold text-center text-lg">{error}</p>;
  if (!insurance)
    return <p className="p-6 text-gray-600 text-center text-lg">No insurance data found.</p>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

      {/* Header */}
      <CustomCard>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#2563EB] tracking-tight">{insurance.name}</h1>
          <Link to="../insurance">
            <button className="bg-gray-100 border border-gray-300 text-gray-700 px-5 py-2 rounded-xl">
              ← Back
            </button>
          </Link>
        </div>
      </CustomCard>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Total Claims" value={claimsCount} />
        <SummaryCard title="Created By" value={insurance.created_by_name || "-"} />
        <SummaryCard title="Created At" value={new Date(insurance.created_at).toLocaleString()} />
      </div>

      {/* Claims List */}
      <CustomCard title="Claims">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full border border-gray-200 text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                {["Claim Number", "Patient Name", "Amount", "Status", "Created At"].map(th => (
                  <th key={th} className="px-3 py-2 border">{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center px-3 py-2 text-gray-500">No claims found.</td>
                </tr>
              )}
              {claims.map((claim) => (
                <tr key={claim.id} className="border-b">
                  <td className="px-3 py-2">{claim.claim_number || "-"}</td>
                  <td className="px-3 py-2">{claim.patient_name || "-"}</td>
                  <td className="px-3 py-2">{claim.amount?.toLocaleString() || "-"}</td>
                  <td className="px-3 py-2">{claim.status || "-"}</td>
                  <td className="px-3 py-2">{new Date(claim.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CustomCard>

      {/* Monthly Claims Chart */}
      <CustomCard title="Monthly Claims">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={claims.reduce((acc, claim) => {
              const month = new Date(claim.created_at).toLocaleString("default", { month: "short" });
              const existing = acc.find((a) => a.month === month);
              if (existing) existing.count += 1;
              else acc.push({ month, count: 1 });
              return acc;
            }, [])}
          >
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(v) => v.toLocaleString()} />
            <Bar dataKey="count" fill="#2563EB" radius={[8,8,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CustomCard>

    </div>
  );
}
