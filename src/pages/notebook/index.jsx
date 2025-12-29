import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { Link } from "react-router-dom";
import { FaPlus, FaSearch, FaBookOpen, FaEdit, FaEye } from "react-icons/fa";
import dayjs from "dayjs";
import { toast, Toaster } from "react-hot-toast";

const Card = ({ title, children }) => (
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


const NotebookIndex = () => {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Load authenticated user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("No auth user");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) {
          setUser({ ...systemUser, role: "admin" });
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

        throw new Error("No matching user");
      } catch (err) {
        toast.error("Failed to load user");
        console.error(err);
      }
    };
    loadUser();
  }, []);

  // Load notes
  useEffect(() => {
    if (!user) return;

    const fetchNotes = async () => {
      setLoading(true);

      let query = supabase
        .from("systems_notebooks")
        .select("*")
        .eq("office_id", user.office_id)
        .order("created_at", { ascending: false });

      if (user.role === "employee") {
        query = query.eq("created_by", user.id);
      }

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        toast.error("Failed to load notes");
        console.error(error);
      } else {
        setNotes(data || []);
      }
      setLoading(false);
    };

    fetchNotes();
  }, [user, search]);

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Kichwa */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2563EB] flex items-center gap-2">
            <FaBookOpen /> Notebook ya Biashara
          </h1>
          <p className="text-gray-500 text-sm">Notebook ya kisasa ya kidigitali kwa rekodi za biashara</p>
        </div>

        <Link
          to="new"
          className="bg-[#2563EB] text-white px-5 py-2 rounded-xl flex items-center gap-2 shadow hover:bg-[#1e4fd8]"
        >
          <FaPlus /> Noti Mpya
        </Link>
      </div>

      {/* Utafutaji */}
      <Card>
        <div className="flex items-center gap-2 w-full sm:w-1/3">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Tafuta noti..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-[#e5e7eb] rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
      </Card>

      {/* Grid ya Noti */}
      {loading ? (
        <p className="text-gray-600">Inapakia noti...</p>
      ) : notes.length === 0 ? (
        <p className="text-gray-500">Hakuna noti zilizopatikana.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {notes.map(note => (
            <div
              key={note.id}
              className="bg-white border-l-4 border-[#2563EB] rounded-[8px] p-5 shadow hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <h3 className="font-semibold text-lg text-gray-800 line-clamp-2">
                  {note.title}
                </h3>
                <p className="text-gray-600 text-sm mt-2 line-clamp-4">
                  {note.content}
                </p>
              </div>

              <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                <span>{dayjs(note.created_at).format("DD MMM YYYY")}</span>
                <div className="flex gap-3">
                  <Link to={`${note.id}`} className="text-[#2563EB] flex items-center gap-1">
                    <FaEye /> Angalia
                  </Link>
                  <Link to={`edit/${note.id}`} className="text-[#2563EB] flex items-center gap-1">
                    <FaEdit /> Hariri
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  </div>
);

};

export default NotebookIndex;
