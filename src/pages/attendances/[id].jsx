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

const CHUNK_SIZE = 500;

const EmployeeAttendanceProfile = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Analytics
  const [todayCount, setTodayCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);

  const fetchEmployee = async () => {
  if (!id) return null;

  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id);

  console.log("DEBUG employee fetch", { id, data, error });

  if (error) {
    console.error("Supabase error fetching employee:", error);
    return null;
  }
  if (!data || data.length === 0) return null;
  return data[0];
};


  // Fetch attendances in chunks
  const fetchAttendances = async () => {
    if (!id) return [];
    let all = [];
    let offset = 0;

    while (true) {
      let query = supabase
        .from("staff_attendance")
        .select("*")
        .eq("staff_id", id)
        .order("date", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (fromDate) query = query.gte("date", fromDate);
      if (toDate) query = query.lte("date", toDate);

      const { data, error } = await query;
      if (error) {
        console.error("Supabase error fetching attendance:", error);
        break;
      }
      if (!data || data.length === 0) break;

      const enriched = await Promise.all(
        data.map(async (rec) => {
          let approverName = "-";
          if (rec.approved_by) {
            const { data: sysUser } = await supabase
              .from("systems_users")
              .select("customer_name")
              .eq("id", rec.approved_by)
              .maybeSingle();
            if (sysUser) approverName = sysUser.customer_name;
            else {
              const { data: emp } = await supabase
                .from("employees")
                .select("name")
                .eq("id", rec.approved_by)
                .maybeSingle();
              if (emp) approverName = emp.name;
            }
          }
          return { ...rec, approver_display_name: approverName };
        })
      );

      all = [...all, ...enriched];
      offset += CHUNK_SIZE;
    }
    return all;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const emp = await fetchEmployee();
      const att = await fetchAttendances();

      setEmployee(emp);
      setAttendances(att);

      const now = dayjs();
      setTodayCount(att.filter(a => dayjs(a.date).isSame(now, "day")).length);
      setWeekCount(att.filter(a => dayjs(a.date).isSame(now, "week")).length);
      setMonthCount(att.filter(a => dayjs(a.date).isSame(now, "month")).length);

      if (!emp) setError("Employee not found");
    } catch (err) {
      console.error(err);
      setError("Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, fromDate, toDate]);

  const aggregateMonthly = (records, dateKey = "date") => {
    return (
      records?.reduce((acc, rec) => {
        const month = dayjs(rec[dateKey]).format("MMM");
        const found = acc.find(m => m.month === month);
        if (found) found.total += 1;
        else acc.push({ month, total: 1 });
        return acc;
      }, []) || []
    );
  };

  const monthlyAttendance = aggregateMonthly(attendances);

  if (loading)
    return <p className="p-6 text-gray-600 animate-pulse text-center text-lg">Loading employee data...</p>;

 return (
  <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

    {/* Ujumbe wa kosa au hakuna data ya mfanyakazi */}
    {error && <p className="p-6 text-red-600 font-semibold text-center text-lg">{error}</p>}
    {!employee && !error && <p className="p-6 text-gray-600 text-center text-lg">Hakuna data ya mfanyakazi iliyo patikana.</p>}

    {employee && (
      <>
        {/* Kadi ya Kichwa + Vidokezo */}
        <CustomCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#2563EB] tracking-tight">{employee.name}</h1>
            <Link to="../attendances">
              <button className="bg-gray-100 border border-gray-300 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200 transition-all">
                ← Rudi
              </button>
            </Link>
          </div>
          <p className="text-gray-600 text-sm">
            Tumia fomu hapa chini kuongeza au kupitia mahudhurio. Sehemu zilizo na * ni lazima ujaze. Chagua tarehe kwa makini ili kuchuja historia ya mahudhurio na uchambuzi.
          </p>
        </CustomCard>

        {/* Kadi ya Vichujio */}
        <FormCard title="Chuja Mahudhurio">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <label>Kuanzia:</label>
              <input
                type="date"
                className="border border-gray-300 rounded px-2 py-1"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <label>Hadi:</label>
              <input
                type="date"
                className="border border-gray-300 rounded px-2 py-1"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <button
              onClick={fetchData}
              className="bg-[#2563EB] hover:bg-red-600 text-white px-4 py-1 rounded-xl shadow whitespace-nowrap"
            >
              Chukua
            </button>
          </div>
        </FormCard>

        {/* Kadi za Uchambuzi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Kadi ya Leo */}
          <FormCard title="Leo">
            <div className="p-4 flex flex-col items-center justify-center bg-white rounded-xl shadow">
              <h3 className="text-[#2563EB] font-semibold text-lg">Leo</h3>
              <p className="text-[#2563EB] font-bold text-2xl mt-2">{todayCount} mahudhurio</p>
            </div>
          </FormCard>

          {/* Kadi ya Wiki Hii */}
          <FormCard title="Wiki Hii">
            <div className="p-4 flex flex-col items-center justify-center bg-white rounded-xl shadow">
              <h3 className="text-[#2563EB] font-semibold text-lg">Wiki Hii</h3>
              <p className="text-[#2563EB] font-bold text-2xl mt-2">{weekCount} mahudhurio</p>
            </div>
          </FormCard>

          {/* Kadi ya Mwezi Huu */}
          <FormCard title="Mwezi Huu">
            <div className="p-4 flex flex-col items-center justify-center bg-white rounded-xl shadow">
              <h3 className="text-[#2563EB] font-semibold text-lg">Mwezi Huu</h3>
              <p className="text-[#2563EB] font-bold text-2xl mt-2">{monthCount} mahudhurio</p>
            </div>
          </FormCard>

        </div>

        {/* Kadi ya Jedwali la Mahudhurio */}
        <FormCard title="Historia ya Mahudhurio">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border">Tarehe</th>
                  <th className="px-3 py-2 border">Kuingia</th>
                  <th className="px-3 py-2 border">Kutoka</th>
                  <th className="px-3 py-2 border">Maelezo</th>
                  <th className="px-3 py-2 border">Maoni</th>
                  <th className="px-3 py-2 border">Hali</th>
                  <th className="px-3 py-2 border">Imekubaliwa Na</th>
                  <th className="px-3 py-2 border">Ili Kubaliwa</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center px-3 py-2 text-gray-500">
                      Hakuna rekodi za mahudhurio.
                    </td>
                  </tr>
                ) : (
                  attendances.map((a) => (
                    <tr key={a.id} className="border-b align-top">
                      <td className="px-3 py-2">{dayjs(a.date).format("YYYY-MM-DD")}</td>
                      <td className="px-3 py-2">{a.check_in || "-"}</td>
                      <td className="px-3 py-2">{a.check_out || "-"}</td>
                      <td className="px-3 py-2">{a.remarks || "-"}</td>
                      <td className="px-3 py-2">{a.comment || "-"}</td>
                      <td className={`px-3 py-2 font-semibold text-center rounded-full ${
                        a.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                        a.status === "Approved" ? "bg-green-100 text-green-800" :
                        a.status === "Rejected" ? "bg-red-100 text-red-800" : ""
                      }`}>{a.status}</td>
                      <td className="px-3 py-2">{a.approver_display_name || "-"}</td>
                      <td className="px-3 py-2">{a.approved_at ? dayjs(a.approved_at).format("YYYY-MM-DD HH:mm") : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </FormCard>

        {/* Kadi ya Chati ya Mwezi */}
        <FormCard title="Muhtasari wa Mahudhurio wa Mwezi">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyAttendance}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => v.toLocaleString()} />
              <Bar dataKey="total" fill="#2563EB" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </FormCard>
      </>
    )}
  </div>
);

};

export default EmployeeAttendanceProfile;
