import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Link } from "react-router-dom";
import { FaSearch, FaPlus, FaFileExcel } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

const Card = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[6px] p-5 shadow-sm hover:shadow-md transition-all w-full">
    {title && <p className="text-gray-500 text-xs mb-2 tracking-wide">{title}</p>}
    {children}
  </div>
);

const CHUNK_SIZE = 20; // Infinite scroll size

const MeetingIndex = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userMap, setUserMap] = useState({}); // id -> name map

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("No authenticated user");

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
      }
    };

    fetchUser();
  }, []);

  // Fetch all users for mapping created_by -> name
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const { data: systemsUsers } = await supabase
          .from("systems_users")
          .select("id, customer_name");

        const { data: employees } = await supabase
          .from("employees")
          .select("id, name");

        const map = {};
        systemsUsers?.forEach(u => { map[u.id] = u.customer_name; });
        employees?.forEach(e => { map[e.id] = e.name; });

        setUserMap(map);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load users for mapping names");
      }
    };

    fetchAllUsers();
  }, []);

  // Fetch meetings
  useEffect(() => {
    if (user?.id) {
      setMeetings([]); // reset on user/search change
      setPage(1);
      setHasMore(true);
      fetchMeetings(true);
    }
  }, [user, searchTerm]);

  const fetchMeetings = async (reset = false) => {
    if (!hasMore && !reset) return;

    setLoading(true);
    setError(null);

    try {
      const offset = reset ? 0 : (page - 1) * CHUNK_SIZE;

      let query = supabase
        .from("meetings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        
        .range(offset, offset + CHUNK_SIZE - 1);

      if (user.role === "admin") {
        query = query.eq("office_id", user.office_id);
      } else {
        query = query.eq("office_id", user.office_id);
      }

      if (searchTerm) query = query.ilike("title", `%${searchTerm}%`);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setMeetings(prev => (reset ? data : [...prev, ...data]));
      setPage(prev => (reset ? 2 : prev + 1));
      setHasMore(offset + CHUNK_SIZE < count);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch meetings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop + 50 >= document.documentElement.scrollHeight) {
        fetchMeetings(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [meetings, user, hasMore]);

  // Export to Excel
  const exportToExcel = () => {
    if (!meetings || meetings.length === 0) {
      toast.error("No meetings to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      meetings.map(m => ({
        Title: m.title,
        Description: m.description || "-",
        Date: dayjs(m.meeting_date).format("DD MMM YYYY"),
        Start: m.start_time ? dayjs(m.start_time).format("HH:mm") : "-",
        End: m.end_time ? dayjs(m.end_time).format("HH:mm") : "-",
        Location: m.location || "-",
        Virtual: m.is_virtual ? "Yes" : "No",
        CreatedBy: userMap[m.created_by] || "-" // use mapped name
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Meetings");
    XLSX.writeFile(workbook, `meetings_export_${new Date().toISOString()}.xlsx`);
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Kichwa */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#2563EB]">Vikao</h1>
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Link to="new" className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#1e4fd8] flex items-center gap-2">
            <FaPlus /> Ongeza Kikao Kipya
          </Link>
          <button onClick={exportToExcel} className="bg-[#2563EB]/70 text-white px-4 py-2 rounded-xl hover:bg-[#2563EB]/90 flex items-center gap-2">
            <FaFileExcel /> Hamisha Excel
          </button>
        </div>
      </div>

      {/* Utafutaji */}
      <Card>
        <div className="flex items-center gap-2 w-full sm:w-1/3">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Tafuta vikao kwa kichwa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-[#e5e7eb] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
      </Card>

      {/* Orodha ya Vikao */}
      <Card title="Orodha ya Vikao">
        {meetings.length === 0 && loading && <p className="text-gray-600">Inapakia vikao...</p>}
        {error && <p className="text-red-600 font-semibold">{error}</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-2 sm:px-3 py-2 text-left">Kichwa</th>
                <th className="px-2 sm:px-3 py-2 text-left">Tarehe</th>
                <th className="px-2 sm:px-3 py-2 text-left">Anza</th>
                <th className="px-2 sm:px-3 py-2 text-left">Mwisho</th>
                <th className="px-2 sm:px-3 py-2 text-left">Mahali</th>
                <th className="px-2 sm:px-3 py-2 text-left">Mtandaoni</th>
                <th className="px-2 sm:px-3 py-2 text-left">Imeundwa Na</th>
                <th className="px-2 sm:px-3 py-2 text-center">Vitendo</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map(meeting => (
                <tr key={meeting.id} className="border-b hover:bg-[#f0f7ff]">
                  <td className="px-2 sm:px-3 py-2 font-medium">{meeting.title}</td>
                  <td className="px-2 sm:px-3 py-2">{dayjs(meeting.meeting_date).format("DD MMM YYYY")}</td>
                  <td className="px-2 sm:px-3 py-2">{meeting.start_time ? dayjs(meeting.start_time).format("HH:mm") : "-"}</td>
                  <td className="px-2 sm:px-3 py-2">{meeting.end_time ? dayjs(meeting.end_time).format("HH:mm") : "-"}</td>
                  <td className="px-2 sm:px-3 py-2">{meeting.location || "-"}</td>
                  <td className="px-2 sm:px-3 py-2">{meeting.is_virtual ? "Ndiyo" : "Hapana"}</td>
                  <td className="px-2 sm:px-3 py-2">{userMap[meeting.created_by] || "-"}</td>
                  <td className="px-2 sm:px-3 py-2 text-center">
                    <Link to={`${meeting.id}`} className="text-[#2563EB] hover:underline">Angalia</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="text-gray-600 mt-2 text-center">Inapakia zaidi...</p>}
        </div>
      </Card>
    </div>
  </div>
);

};

export default MeetingIndex;
