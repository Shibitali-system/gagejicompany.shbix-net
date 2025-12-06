import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  FaSearch,
  FaEye,
  FaPlus,
  FaEdit,
  FaFileExcel,
} from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

const CHUNK_SIZE = 200;

const CustomersIndex = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [user, setUser] = useState(null);
  const [totals, setTotals] = useState({ totalCustomers: 0, newToday: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load User
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser?.id) throw new Error("No authenticated user");

        // Check system user
        const { data: mainUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (mainUser) {
          setUser({ ...mainUser, role: "admin" });
          return;
        }

        // Check employee
        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) {
          setUser({ ...employee, role: "employee" });
          return;
        }

        throw new Error("No user account found.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user");
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  // Fetch Customers
  useEffect(() => {
    if (!user?.id) return;
    fetchCustomers(true);
  }, [user, searchTerm, filterType, customFrom, customTo]);

  const fetchCustomers = async (reset = false) => {
  setLoading(true);
  setError(null);
  try {
    const offset = reset ? 0 : (page - 1) * CHUNK_SIZE;

    // Determine date range (default: today)
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

    // Fetch customers for the user's office
    const { data: customersData, error: custError, count } = await supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("office_id", user.office_id) // Filter by office
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .ilike("name", `%${searchTerm}%`) // search by name
      .order("created_at", { ascending: false })
      .range(offset, offset + CHUNK_SIZE - 1);

    if (custError) throw custError;

    // Fetch all possible creators
    const { data: systemUsers } = await supabase
      .from("systems_users")
      .select("id, customer_name");
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name");

    // Map created_by UUID → name
    const systemUsersMap = new Map(systemUsers.map(u => [u.id, u.customer_name]));
    const employeesMap = new Map(employees.map(e => [e.id, e.name]));

    const customersWithNames = customersData.map(cust => ({
      ...cust,
      created_by_name: systemUsersMap.get(cust.created_by) || employeesMap.get(cust.created_by) || "-"
    }));

    setCustomers(prev => (reset ? customersWithNames : [...prev, ...customersWithNames]));
    setPage(prev => (reset ? 2 : prev + 1));
    setHasMore(offset + CHUNK_SIZE < count);

    // Totals (only when reset)
    if (reset) {
      const totalCustomers = count || 0;
      const newToday = customersData.filter(c => dayjs(c.created_at).isSame(dayjs(), "day")).length;
      setTotals({ totalCustomers, newToday });
    }

  } catch (err) {
    console.error(err);
    setError("Failed to fetch customers: " + err.message);
  } finally {
    setLoading(false);
  }
};


  const exportToExcel = () => {
    if (!customers || customers.length === 0) {
      toast.error("No customers to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      customers.map(c => ({
        Name: c.name,
        Type: c.type || "-",
        Phone: c.phone || "-",
        Email: c.email || "-",
        Address: c.address || "-",
        Office: c.office_name || "-",
        Created_By: c.created_by_name || "-",
        Created_At: new Date(c.created_at).toLocaleString(),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, `customers_export_${new Date().toISOString()}.xlsx`);
  };


const SummaryCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-center justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#ef4444]"}`}>{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-start justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
  `}>
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);


return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header Card */}
      <CustomCard title="Customers">
        <h1 className="text-3xl font-bold text-[#ef4444]">Customers</h1>
        <p className="text-gray-500 text-sm">Manage all your customers here. You can add, edit, or view details.</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Link
  to="new"
  className="
    bg-white text-[#ef4444] border border-[#e5e7eb] rounded-[4px]
    px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    hover:bg-[#fdfdfd] hover:shadow-md transition-all duration-200
    font-sans
  "
>
  <FaPlus /> Add New Customer
</Link>

          <button
  onClick={exportToExcel}
  className="
    bg-[#ef4444] text-white border border-[#e5e7eb] rounded-[4px]
    px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    hover:bg-[#d63a3a] hover:shadow-md transition-all duration-200
    font-sans
  "
>
  <FaFileExcel /> Export Excel
</button>

        </div>
      </CustomCard>

      {/* Filters Card */}
      <CustomCard title="Filters">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center">
          <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
            {["today","week","month","year"].map(ft => (
              <button
                key={ft}
                onClick={()=>setFilterType(ft)}
                className={`px-3 py-1 rounded-xl ${filterType===ft ? "bg-[#ef4444] text-white" : "bg-white border"}`}
              >
                {ft==="today"?"Today":ft==="week"?"This Week":ft==="month"?"This Month":"This Year"}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="date"
              value={customFrom}
              onChange={e=>{setCustomFrom(e.target.value); setFilterType("custom");}}
              className="border px-2 py-1 rounded"
            />
            <span>to</span>
            <input
              type="date"
              value={customTo}
              onChange={e=>{setCustomTo(e.target.value); setFilterType("custom");}}
              className="border px-2 py-1 rounded"
            />
          </div>
        </div>
      </CustomCard>

      {/* Search Card */}
      <CustomCard title="Search Customers">
        <div className="mb-2 flex items-center w-full sm:w-1/3">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
          />
        </div>
      </CustomCard>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Customers" value={totals.totalCustomers} />
        <SummaryCard title="New Today" value={totals.newToday} />
        
      </div>

      {/* Customers Table Card */}
      <CustomCard title="Customers List">
        {loading ? (
          <p className="text-gray-600">Loading customers...</p>
        ) : error ? (
          <p className="text-red-600 font-semibold">{error}</p>
        ) : customers.length === 0 ? (
          <p className="text-gray-600">No customers found.</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[#ef4444] text-white text-xs uppercase tracking-wider">
                <tr>
                  {["Name","Type","Phone","Email","Address","Office Name","Created By","Created At","Actions"].map(th => (
                    <th key={th} className="px-2 sm:px-3 py-2 text-left">{th}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map(cust => (
                  <tr key={cust.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-2 sm:px-3 py-2 font-medium">{cust.name}</td>
                    <td className="px-2 sm:px-3 py-2">
                      {cust.type ? (
                        <span className="bg-[#ef4444] text-white px-2 py-1 rounded-full text-sm">{cust.type}</span>
                      ) : "-"}
                    </td>
                    <td className="px-2 sm:px-3 py-2">{cust.phone || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{cust.email || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{cust.address || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{cust.office_name || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{cust.created_by_name || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{new Date(cust.created_at).toLocaleString()}</td>
                    <td className="px-2 sm:px-3 py-2 text-center flex flex-col sm:flex-row justify-center gap-2">
                      <Link to={`${cust.id}`} className="text-blue-600 hover:underline flex items-center gap-1"><FaEye /> View</Link>
                      <Link to={`edit/${cust.id}`} className="text-[#ef4444] hover:underline flex items-center gap-1"><FaEdit /> Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={()=>fetchCustomers(false)}
              className="bg-[#ef4444] text-white px-4 py-2 rounded hover:bg-[#d63a3a]"
            >
              Load More
            </button>
          </div>
        )}
      </CustomCard>

    </div>
  </div>
);







};

export default CustomersIndex;
