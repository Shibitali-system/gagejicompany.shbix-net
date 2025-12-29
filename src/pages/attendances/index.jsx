import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaSearch, FaCheckCircle, FaTimesCircle, FaEye } from "react-icons/fa";
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

const StaffAttendanceIndex = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Filters & Search
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Analytics
  const [totals, setTotals] = useState({ totalRecords: 0, totalApprovedToday: 0 });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [actionType, setActionType] = useState(""); // Approve / Reject
  const [comment, setComment] = useState("");

  // Load user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("Not authenticated");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) {
          setUser(systemUser);
          return;
        }

        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) {
          setUser(employee);
          return;
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  const fetchAttendances = async () => {
  if (!user) return;
  setLoading(true);

  try {
    let query = supabase
      .from("staff_attendance")
      .select("*")
      .order("date", { ascending: false });

    // ----- FILTERS -----
    const now = dayjs();
    let fromDate, toDate;

    switch (filterType) {
      case "today":
        fromDate = now.startOf("day").toISOString();
        toDate = now.endOf("day").toISOString();
        break;
      case "week":
        fromDate = now.startOf("week").toISOString();
        toDate = now.endOf("day").toISOString();
        break;
      case "month":
        fromDate = now.startOf("month").toISOString();
        toDate = now.endOf("day").toISOString();
        break;
      case "year":
        fromDate = now.startOf("year").toISOString();
        toDate = now.endOf("day").toISOString();
        break;
      case "custom":
        if (customFrom && customTo) {
          fromDate = dayjs(customFrom).startOf("day").toISOString();
          toDate = dayjs(customTo).endOf("day").toISOString();
        }
        break;
    }

    if (fromDate && toDate)
      query = query.gte("date", fromDate).lte("date", toDate);

    if (searchTerm)
      query = query.ilike("staff_name", `%${searchTerm}%`);

    const { data, error } = await query;
    if (error) throw error;

    // ---------- RESOLVE APPROVER NAME (NO COLUMN REQUIRED) ----------
    const enriched = [];

    for (const item of data) {
      let approverName = "-";

      if (item.approved_by) {
        // 1. First search in systems_users
        const { data: sysUser } = await supabase
          .from("systems_users")
          .select("customer_name")
          .eq("id", item.approved_by)
          .maybeSingle();

        if (sysUser) {
          approverName = sysUser.customer_name;
        } else {
          // 2. If not found, search employees
          const { data: emp } = await supabase
            .from("employees")
            .select("name")
            .eq("id", item.approved_by)
            .maybeSingle();

          if (emp) approverName = emp.name;
        }
      }

      enriched.push({
        ...item,
        approver_display_name: approverName
      });
    }

    setAttendances(enriched);

    // ---------- ANALYTICS ----------
    const totalApprovedToday = enriched.filter(
      r =>
        r.status === "Approved" &&
        r.approved_at &&
        dayjs(r.approved_at).isSame(now, "day")
    ).length;

    setTotals({
      totalRecords: enriched.length,
      totalApprovedToday
    });

  } catch (err) {
    console.error(err);
    toast.error("Failed to fetch attendance records");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (user) fetchAttendances();
  }, [user, filterType, customFrom, customTo, searchTerm]);

  // Modal handlers
  const openModal = (record, type) => {
    setSelectedAttendance(record);
    setActionType(type);
    setComment("");
    setModalOpen(true);
  };

  const handleModalSubmit = async () => {
    if (!selectedAttendance) return;
    try {
      const { error } = await supabase
        .from("staff_attendance")
        .update({
          status: actionType === "Approve" ? "Approved" : "Rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          comment
        })
        .eq("id", selectedAttendance.id);

      if (error) throw error;
      toast.success(`Attendance ${actionType}d successfully`);
      setModalOpen(false);
      fetchAttendances();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update attendance");
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* KICHWA + MWONGOZO + VITENDO */}
      <CustomCard>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB]">Mahudhurio ya Wafanyakazi</h1>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            <Link
              to="new"
              className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2 shadow"
            >
              <FaPlus /> Ongeza Mahudhurio
            </Link>
          </div>
        </div>

        {/* Mwongozo */}
        <p className="text-gray-600 text-sm">
          Tumia kitufe hapo juu kurekodi mahudhurio mapya. Unaweza kuchuja, kutafuta, kuidhinisha, au kukataa rekodi hapa chini.
        </p>
      </CustomCard>

      {/* CHUZO */}
      <CustomCard title="Chuzo">
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          {["all","today","week","month","year","custom"].map(ft => (
            <button
              key={ft}
              className={`px-3 py-1 rounded-xl ${filterType===ft?"bg-[#2563EB] text-white":"bg-white border border-[#e5e7eb]"}`}
              onClick={()=>setFilterType(ft)}
            >
              {ft === "all" ? "Zote" :
               ft === "today" ? "Leo" :
               ft === "week" ? "Wiki" :
               ft === "month" ? "Mwezi" :
               ft === "year" ? "Mwaka" :
               "Binafsi"}
            </button>
          ))}

          {filterType==="custom" && (
            <div className="flex gap-2 items-center ml-2">
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="border border-[#e5e7eb] px-2 py-1 rounded" />
              <span>hadi</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="border border-[#e5e7eb] px-2 py-1 rounded" />
              <button onClick={fetchAttendances} className="px-3 py-1 bg-[#2563EB] text-white rounded hover:bg-red-600">Tumia</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Tafuta kwa jina la mfanyakazi..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full sm:w-1/3 border border-[#e5e7eb] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
      </CustomCard>

      {/* KADI ZA MUHTASARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormCard title="Jumla ya Rekodi">
          <p className="text-[#2563EB] font-bold">{totals.totalRecords}</p>
        </FormCard>
        <FormCard title="Imeidhinishwa Leo">
          <p className="text-[#2563EB] font-bold">{totals.totalApprovedToday}</p>
        </FormCard>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {actionType === "Approve" ? <FaCheckCircle className="text-green-600" /> : <FaTimesCircle className="text-red-600" />}
              {actionType === "Approve" ? "Idhinisha Mahesabu" : "Kataa Mahesabu"}
            </h2>

            <p className="mb-2">Maoni (hiari):</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="border rounded w-full px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              rows={4}
              placeholder="Weka maoni"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Ghairi
              </button>
              <button
                onClick={handleModalSubmit}
                className={`px-4 py-2 rounded text-white ${actionType === "Approve" ? "bg-green-600 hover:bg-green-700" : "bg-[#2563EB] hover:bg-red-600"}`}
              >
                {actionType === "Approve" ? "Idhinisha" : "Kataa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JEDWALI LA MAHESABU */}
      <CustomCard title="Rekodi za Mahesabu">
        {loading ? <p className="text-gray-600">Inapakia rekodi za mahesabu...</p> :
         attendances.length === 0 ? <p className="text-gray-600">Hakuna rekodi zilizopatikana.</p> :
         <div className="overflow-x-auto">
           <table className="min-w-full border-collapse text-sm">
             <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
               <tr>
                 <th className="px-2 py-2">Jina la Mfanyakazi</th>
                 <th className="px-2 py-2">Tarehe</th>
                 <th className="px-2 py-2">Kuingia</th>
                 <th className="px-2 py-2">Kutoka</th>
                 <th className="px-2 py-2">Hali</th>
                 <th className="px-2 py-2">Imeidhinishwa Na</th>
                 <th className="px-2 py-2">Imeidhinishwa Saa</th>
                 <th className="px-2 py-2">Maoni</th>
                 <th className="px-2 py-2 text-center">Vitendo</th>
               </tr>
             </thead>
             <tbody>
               {attendances.map(r => (
                 <tr key={r.id} className="border-b hover:bg-[#ffe5e5]">
                   <td className="px-2 py-2">{r.staff_name}</td>
                   <td className="px-2 py-2">{r.date ? dayjs(r.date).format("YYYY-MM-DD") : "-"}</td>
                   <td className="px-2 py-2">{r.check_in || "-"}</td>
                   <td className="px-2 py-2">{r.check_out || "-"}</td>
                   <td className={`px-2 py-2 font-semibold text-center rounded-full ${
                     r.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                     r.status === "Approved" ? "bg-[#2563EB]/20 text-[#2563EB]" :
                     r.status === "Rejected" ? "bg-red-100 text-red-800" : ""
                   }`}>{r.status === "Pending" ? "Inasubiri" : r.status === "Approved" ? "Imeidhinishwa" : "Imekataliwa"}</td>
                   <td className="px-2 py-2">{r.approver_display_name}</td>
                   <td className="px-2 py-2">{r.approved_at ? dayjs(r.approved_at).format("YYYY-MM-DD HH:mm") : "-"}</td>
                   <td className="px-2 py-2">{r.comment || "-"}</td>
                   <td className="px-2 py-2 text-center flex flex-col sm:flex-row justify-center gap-2">
                     {r.status === "Pending" && (
                       <>
                         <button
                           onClick={() => openModal(r, "Approve")}
                           className="bg-[#2563EB] text-white px-3 py-1 rounded-xl hover:bg-red-600 flex items-center gap-2"
                         >
                           <FaCheckCircle /> Idhinisha
                         </button>
                         <button
                           onClick={() => openModal(r, "Reject")}
                           className="bg-red-600 text-white px-3 py-1 rounded-xl hover:bg-red-700 flex items-center gap-2"
                         >
                           <FaTimesCircle /> Kataa
                         </button>
                       </>
                     )}
                     <Link
                       to={`../attendances/${r.staff_id}`}
                       className="bg-blue-600 text-white px-3 py-1 rounded-xl hover:bg-blue-700 flex items-center gap-2"
                     >
                       <FaEye /> Angalia
                     </Link>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
        }
      </CustomCard>

    </div>
  </div>
);

};

export default StaffAttendanceIndex;
