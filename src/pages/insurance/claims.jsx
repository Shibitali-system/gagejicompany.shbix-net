import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaSearch, FaEye, FaFileExcel } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

const SummaryCard = ({ title, value }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col items-center justify-center
    shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans
    w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className="text-xl font-semibold mt-1 text-[#2563EB]">{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col items-start justify-center
    shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans
    w-full
  ">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);

const InsuranceClaimsPage = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch all claims
      const { data: claimsData, error: claimsError } = await supabase
        .from("insurance_claims")
        .select("*")
        .order("date", { ascending: false });
      if (claimsError) throw claimsError;

      // Fetch patients
      const patientIds = claimsData.map(c => c.patient_id);
      const { data: patientsData } = await supabase
        .from("customers")
        .select("*")
        .in("id", patientIds);

      // Fetch providers (assuming you have insurance_providers table)
      const providerIds = claimsData.map(c => c.provider_id);
      const { data: providersData } = await supabase
        .from("insurance_providers")
        .select("*")
        .in("id", providerIds);

      // Merge patient & provider into claims
      const mergedClaims = claimsData.map(c => ({
        ...c,
        patient: patientsData.find(p => p.id === c.patient_id),
        provider: providersData.find(p => p.id === c.provider_id)
      }));

      setClaims(mergedClaims);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    const matchesSearch =
      c.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.provider?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.status?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalClaims = claims.length;
  const pendingClaims = claims.filter(c => c.status === "Pending").length;
  const approvedClaims = claims.filter(c => c.status === "Approved").length;
  const rejectedClaims = claims.filter(c => c.status === "Rejected").length;

  const exportToExcel = () => {
    if (!claims || claims.length === 0) {
      toast.error("No claims to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      claims.map(c => ({
        Patient: c.patient?.name || "-",
        "Patient Office": c.patient?.office_name || "-",
        Provider: c.provider?.name || "-",
        "Provider Office": c.provider?.office_name || "-",
        Amount: c.amount?.toFixed(2) || "-",
        Status: c.status || "-",
        Date: new Date(c.date).toLocaleString(),
        Description: c.description || "-"
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Claims");
    XLSX.writeFile(workbook, `insurance_claims_TZS-{new Date().toISOString()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
<CustomCard title="Insurance Claims">
  <h1 className="text-2xl font-bold text-blue-600">Insurance Claims</h1>
  <p className="text-gray-500 text-sm">View and manage all insurance claims here.</p>

  <div className="flex flex-wrap gap-2 mt-2">
    
    {/* Back Button */}
    <Link 
      to="/dashboard/insurance" 
      className="bg-white text-blue-600 border px-4 py-2 flex items-center gap-2 rounded hover:bg-blue-50"
    >
      ← Back to Claims List
    </Link>

    {/* Add Claim Button */}
    <Link 
      to="/dashboard/insurance/new-claims" 
      className="bg-green-600 text-white px-4 py-2 flex items-center gap-2 rounded hover:bg-green-700"
    >
      + Add New Claim
    </Link>

    {/* Export */}
    <button 
      onClick={exportToExcel} 
      className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2 rounded hover:bg-blue-700"
    >
      <FaFileExcel /> Export Excel
    </button>
  </div>
</CustomCard>


        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomCard title="Filters">
            <div className="flex flex-wrap gap-2">
              {["All","Pending","Approved","Rejected"].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-xl TZS-{statusFilter===status ? "bg-blue-600 text-white" : "bg-white border"}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </CustomCard>

          <CustomCard title="Search">
            <div className="flex items-center w-full sm:w-1/2">
              <FaSearch className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search by patient or provider..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </CustomCard>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Claims" value={totalClaims} />
          <SummaryCard title="Pending" value={pendingClaims} />
          <SummaryCard title="Approved" value={approvedClaims} />
          <SummaryCard title="Rejected" value={rejectedClaims} />
        </div>

        {/* Claims Table */}
        <CustomCard title="Claims List">
          {loading ? (
            <p className="text-gray-600">Loading claims...</p>
          ) : error ? (
            <p className="text-red-600 font-semibold">{error}</p>
          ) : filteredClaims.length === 0 ? (
            <p className="text-gray-600">No claims found.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-blue-600 text-white text-xs uppercase tracking-wider">
                  <tr>
                    {["Patient","Patient Office","Provider","Provider Office","Amount","Status","Date","Description","Actions"].map(th => (
                      <th key={th} className="px-2 sm:px-3 py-2 text-left">{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map(claim => (
                    <tr key={claim.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-3 py-2">{claim.patient?.name}</td>
                      <td className="px-2 sm:px-3 py-2">{claim.patient?.office_name}</td>
                      <td className="px-2 sm:px-3 py-2">{claim.provider?.name}</td>
                      <td className="px-2 sm:px-3 py-2">{claim.provider?.office_name}</td>
                      <td className="px-2 sm:px-3 py-2">TZS-{claim.amount?.toFixed(2)}</td>
                      <td className="px-2 sm:px-3 py-2">{claim.status}</td>
                      <td className="px-2 sm:px-3 py-2">{new Date(claim.date).toLocaleDateString()}</td>
                      <td className="px-2 sm:px-3 py-2">{claim.description || "-"}</td>
                      <td className="px-2 sm:px-3 py-2 flex flex-col sm:flex-row gap-2 justify-center">
                        <Link to className="text-blue-600 hover:underline flex items-center gap-1"><FaEye /> View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CustomCard>
      </div>
    </div>
  );
};

export default InsuranceClaimsPage;
