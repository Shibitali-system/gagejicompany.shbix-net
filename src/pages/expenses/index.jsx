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

const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">
      {title}
    </p>
    <div className="w-full">{children}</div>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-2 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">
        {title}
      </p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

const CHUNK_SIZE = 200;

const ExpensesIndex = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [user, setUser] = useState(null);
  const [totals, setTotals] = useState({ totalExpenses: 0, totalToday: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load User
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser?.id) throw new Error("No authenticated user");

        const { data: mainUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (mainUser) {
          setUser({ ...mainUser, role: "admin" });
          return;
        }

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

  // Fetch Expenses
  useEffect(() => {
    if (!user?.id) return;
    fetchExpenses(true);
  }, [user, searchTerm, filterType, customFrom, customTo]);

  const fetchExpenses = async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const offset = reset ? 0 : (page - 1) * CHUNK_SIZE;

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

      const { data: expensesData, error: expError, count } = await supabase
        .from("systems_expenses")
        .select("*", { count: "exact" })
        .eq("office_id", user.office_id)
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .ilike("name", `%${searchTerm}%`)
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (expError) throw expError;

      const { data: systemUsers } = await supabase
        .from("systems_users")
        .select("id, customer_name");
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name");

      const systemUsersMap = new Map(systemUsers.map(u => [u.id, u.customer_name]));
      const employeesMap = new Map(employees.map(e => [e.id, e.name]));

      const expensesWithNames = expensesData.map(exp => ({
        ...exp,
        created_by_name: systemUsersMap.get(exp.created_by) || employeesMap.get(exp.created_by) || "-"
      }));

      setExpenses(prev => (reset ? expensesWithNames : [...prev, ...expensesWithNames]));
      setPage(prev => (reset ? 2 : prev + 1));
      setHasMore(offset + CHUNK_SIZE < count);

      if (reset) {
        const totalExpenses = count || 0;
        const totalToday = expensesData
          .filter(e => dayjs(e.created_at).isSame(dayjs(), "day"))
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        setTotals({ totalExpenses, totalToday });
      }

    } catch (err) {
      console.error(err);
      setError("Failed to fetch expenses: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!expenses || expenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      expenses.map(e => ({
        Name: e.name,
        Amount: e.amount,
        Category: e.category || "-",
        Description: e.description || "-",
        Office: e.office_name || "-",
        Created_By: e.created_by_name || "-",
        Created_At: new Date(e.created_at).toLocaleString(),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, `expenses_export_${new Date().toISOString()}.xlsx`);
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Kichwa */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#2563EB]">Matumizi</h1>
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Link
            to="new"
            className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2 shadow"
          >
            <FaPlus /> Ongeza Matumizi Mapya
          </Link>

          <Link
            to="expenses"
            className="
              bg-white text-[#2563EB] border border-[#e5e7eb] rounded-[4px]
              px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
              hover:bg-[#fdfdfd] hover:shadow-md transition-all duration-200
              font-sans
            "
          >
            <FaPlus /> Omba Matumizi
          </Link>

          <button
            onClick={exportToExcel}
            className="bg-[#2563EB]/70 text-white px-4 py-2 rounded-xl hover:bg-[#2563EB]/90 flex items-center gap-2 shadow"
          >
            <FaFileExcel /> Hamisha Excel
          </button>
        </div>
      </div>

      {/* Vichujio */}
      <CustomCard title="Vichujio">
        <div className="flex flex-wrap gap-2 items-center">
          {["today","week","month","year"].map(ft => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1 rounded-xl font-medium transition ${
                filterType === ft
                  ? "bg-[#2563EB] text-white"
                  : "bg-white border border-[#e5e7eb] text-gray-700 hover:bg-[#ffe5e5]"
              }`}
            >
              {ft === "today" ? "Leo" : ft === "week" ? "Wiki Hii" : ft === "month" ? "Mwezi Huu" : "Mwaka Huu"}
            </button>
          ))}

          <div className="flex gap-2 items-center ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); setFilterType("custom"); }}
              className="border border-[#e5e7eb] px-2 py-1 rounded focus:ring-2 focus:ring-[#2563EB]"
            />
            <span>hadi</span>
            <input
              type="date"
              value={customTo}
              onChange={e => { setCustomTo(e.target.value); setFilterType("custom"); }}
              className="border border-[#e5e7eb] px-2 py-1 rounded focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </div>
      </CustomCard>

      {/* Utafutaji */}
      <CustomCard>
        <div className="flex items-center gap-2 w-full sm:w-1/3">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Tafuta kwa jina..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-[#e5e7eb] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
      </CustomCard>

      {/* Muhtasari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomCard title="Jumla ya Matumizi">
          <p className="text-lg font-bold text-[#2563EB] text-center">{totals.totalExpenses}</p>
        </CustomCard>
        <CustomCard title="Jumla Leo">
          <p className="text-lg font-bold text-[#2563EB] text-center">{totals.totalToday}</p>
        </CustomCard>
      </div>

      {/* Jedwali la Matumizi */}
      <CustomCard title="Orodha ya Matumizi">
        {loading ? (
          <p className="text-gray-600">Inapakia matumizi...</p>
        ) : error ? (
          <p className="text-red-600 font-semibold">{error}</p>
        ) : expenses.length === 0 ? (
          <p className="text-gray-600">Hakuna matumizi yaliyopatikana.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-2 sm:px-3 py-2 text-left">Jina</th>
                  <th className="px-2 sm:px-3 py-2 text-left">Kiasi</th>
                  <th className="px-2 sm:px-3 py-2 text-left">Kategoria</th>
                  <th className="px-2 sm:px-3 py-2 text-left">Maelezo</th>
                  <th className="px-2 sm:px-3 py-2 text-left">Jina la Ofisi</th>
                  <th className="px-2 sm:px-3 py-2 text-left">Imeingizwa Na</th>
                  <th className="px-2 sm:px-3 py-2 text-left">Imeingizwa Mnamo</th>
                  <th className="px-2 sm:px-3 py-2 text-center">Vitendo</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} className="border-b hover:bg-[#ffe5e5]">
                    <td className="px-2 sm:px-3 py-2 font-medium">{exp.name}</td>
                    <td className="px-2 sm:px-3 py-2">{exp.amount}</td>
                    <td className="px-2 sm:px-3 py-2">{exp.category || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{exp.description || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{exp.office_name || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{exp.created_by_name || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{new Date(exp.created_at).toLocaleString()}</td>
                    <td className="px-2 sm:px-3 py-2 text-center flex flex-col sm:flex-row justify-center gap-2">
                      <Link to={`${exp.id}`} className="text-[#2563EB] hover:underline flex items-center gap-1">
                        <FaEye /> Angalia
                      </Link>
                      <Link to={`edit/${exp.id}`} className="text-[#2563EB] hover:underline flex items-center gap-1">
                        <FaEdit /> Hariri
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pata Zaidi */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => fetchExpenses(false)}
                  className="bg-[#2563EB]/20 text-[#2563EB] px-4 py-2 rounded hover:bg-[#2563EB]/30"
                >
                  Pata Zaidi
                </button>
              </div>
            )}
          </div>
        )}
      </CustomCard>
    </div>
  </div>
);


};

export default ExpensesIndex;
