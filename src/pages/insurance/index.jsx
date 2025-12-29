import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaSearch, FaEye, FaPlus, FaEdit, FaFileExcel } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

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

const CHUNK_SIZE = 500;

const InsuranceList = () => {
  const [user, setUser] = useState(null);
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [totals, setTotals] = useState({ totalInsurances: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("No authenticated user");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) { setUser({ ...systemUser, role: "admin" }); return; }

        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) { setUser({ ...employee, role: "employee" }); return; }

        throw new Error("No user account found.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user");
      }
    };
    fetchUser();
  }, []);

  // Fetch insurances whenever user, searchTerm, or filters change
  useEffect(() => {
    if (!user?.id) return;
    fetchInsurances(true);
  }, [user, searchTerm, filterType, customFrom, customTo]);

  const fetchInsurances = async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const offset = reset ? 0 : (page - 1) * CHUNK_SIZE;

      // Calculate date range based on filter
      let fromDate = dayjs().startOf("day").toISOString();
      let toDate = dayjs().endOf("day").toISOString();

      if (filterType !== "today") {
        switch (filterType) {
          case "week":
            fromDate = dayjs().startOf("week").toISOString();
            toDate = dayjs().endOf("day").toISOString();
            break;
          case "month":
            fromDate = dayjs().startOf("month").toISOString();
            toDate = dayjs().endOf("day").toISOString();
            break;
          case "year":
            fromDate = dayjs().startOf("year").toISOString();
            toDate = dayjs().endOf("day").toISOString();
            break;
          case "custom":
            if (customFrom && customTo) {
              fromDate = dayjs(customFrom).startOf("day").toISOString();
              toDate = dayjs(customTo).endOf("day").toISOString();
            }
            break;
        }
      }

      let query = supabase
        .from("insurance_providers")
        .select("*", { count: "exact" })
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (searchTerm) query = query.ilike("name", `%${searchTerm}%`);
      if (user.office_id) query = query.eq("office_id", user.office_id);

      const { data: insuranceData, error: insError, count } = await query;
      if (insError) throw insError;

      // Map created_by UUID → name
      const { data: systemUsers } = await supabase.from("systems_users").select("id, customer_name");
      const { data: employees } = await supabase.from("employees").select("id, name");
      const systemUsersMap = new Map(systemUsers?.map(u => [u.id, u.customer_name]) || []);
      const employeesMap = new Map(employees?.map(e => [e.id, e.name]) || []);

      const insurancesWithNames = (insuranceData || []).map(ins => ({
        ...ins,
        created_by_name: systemUsersMap.get(ins.created_by) || employeesMap.get(ins.created_by) || "-",
      }));

      setInsurances(prev => (reset ? insurancesWithNames : [...prev, ...insurancesWithNames]));
      setPage(prev => (reset ? 2 : prev + 1));
      setHasMore(offset + CHUNK_SIZE < count);
      if (reset) setTotals({ totalInsurances: count || 0 });
    } catch (err) {
      console.error(err);
      setError("Failed to fetch insurances: " + err.message);
    } finally { setLoading(false); }
  };

  const exportToExcel = () => {
    if (!insurances || insurances.length === 0) {
      toast.error("No insurances to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      insurances.map(d => ({
        Name: d.name,
        Type: d.type || "-",
        Contact: d.contact || "-",
        Status: d.status || "-",
        Created_By: d.created_by_name || "-",
        Created_At: new Date(d.created_at).toLocaleString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Insurances");
    XLSX.writeFile(workbook, `insurances_export_${new Date().toISOString()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Card */}
<CustomCard title="Insurance Providers">
  <h1 className="text-3xl font-bold text-blue-600">Insurance Providers</h1>
  <p className="text-gray-500 text-sm">Manage all your insurance providers here.</p>
  <div className="flex flex-wrap gap-2 mt-2">
    <Link to="new" className="bg-white text-blue-600 border px-4 py-2 flex items-center gap-2 rounded hover:bg-blue-50">
      <FaPlus /> Add New Insurance
    </Link>
    <button onClick={exportToExcel} className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2 rounded hover:bg-blue-700">
      <FaFileExcel /> Export Excel
    </button>
    <Link to="claims" className="bg-green-600 text-white px-4 py-2 flex items-center gap-2 rounded hover:bg-green-700">
      <FaEye /> Insurance Claims
    </Link>
  </div>
</CustomCard>


        {/* Filters */}
        <CustomCard title="Filters">
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center">
            <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
              {["today","week","month","year","custom"].map(ft => (
                <button
                  key={ft}
                  onClick={() => setFilterType(ft)}
                  className={`px-3 py-1 rounded-xl ${filterType===ft ? "bg-blue-600 text-white" : "bg-white border"}`}
                >
                  {ft==="today"?"Today":ft==="week"?"This Week":ft==="month"?"This Month":ft==="year"?"This Year":"Custom"}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="date"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setFilterType("custom"); }}
                className="border px-2 py-1 rounded"
              />
              <span>to</span>
              <input
                type="date"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setFilterType("custom"); }}
                className="border px-2 py-1 rounded"
              />
            </div>
          </div>
        </CustomCard>

        {/* Search */}
        <CustomCard title="Search Insurance">
          <div className="mb-2 flex items-center w-full sm:w-1/3">
            <FaSearch className="text-gray-400 mr-2" />
            <input type="text" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </CustomCard>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Insurances" value={totals.totalInsurances} />
        </div>

        {/* Insurance Table */}
        <CustomCard title="Insurance List">
          {loading ? <p className="text-gray-600">Loading insurances...</p> :
           error ? <p className="text-red-600 font-semibold">{error}</p> :
           insurances.length === 0 ? <p className="text-gray-600">No insurances found.</p> :
           <div className="overflow-x-auto w-full">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-blue-600 text-white text-xs uppercase tracking-wider">
                <tr>
                  {["Name","Type","Contact","Status","Created By","Created At","Actions"].map(th => <th key={th} className="px-2 sm:px-3 py-2 text-left">{th}</th>)}
                </tr>
              </thead>
              <tbody>
                {insurances.map(ins => (
                  <tr key={ins.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-2 sm:px-3 py-2 font-medium">{ins.name}</td>
                    <td className="px-2 sm:px-3 py-2">{ins.type || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{ins.contact || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{ins.status || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{ins.created_by_name || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{new Date(ins.created_at).toLocaleString()}</td>
                    <td className="px-2 sm:px-3 py-2 flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to className="text-blue-600 hover:underline flex items-center gap-1">
  <FaEye /> View
</Link>

                      <Link to className="text-blue-600 hover:underline flex items-center gap-1"><FaEdit /> Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
          }
          {hasMore && <div className="mt-4 text-center">
            <button onClick={()=>fetchInsurances(false)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Load More</button>
          </div>}
        </CustomCard>

      </div>
    </div>
  );
};

export default InsuranceList;
