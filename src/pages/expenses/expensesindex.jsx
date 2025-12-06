import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaSearch, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
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

const RequestExpensesIndex = () => {
  const CHUNK_SIZE = 200;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Filters & Search
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Analytics
  const [totals, setTotals] = useState({ totalRequests: 0, totalApprovedToday: 0 });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
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

  // Fetch requests
  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from("request_expenses").select("*").order("created_at", { ascending: false });

      // Apply date filters
      const now = dayjs();
      let fromDate, toDate;

      switch(filterType) {
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
        default:
          break;
      }

      if (fromDate && toDate) query = query.gte("created_at", fromDate).lte("created_at", toDate);
      if (searchTerm) query = query.ilike("name", `%${searchTerm}%`);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user names
      const userIds = Array.from(new Set(data.map(r => r.created_by)));
      const { data: systemUsers } = await supabase.from("systems_users").select("id, customer_name").in("id", userIds);
      const { data: employees } = await supabase.from("employees").select("id, name").in("id", userIds);

      const usersMap = new Map();
      systemUsers.forEach(u => usersMap.set(u.id, u.customer_name));
      employees.forEach(e => usersMap.set(e.id, e.name));

      const requestsWithNames = data.map(r => ({
        ...r,
        created_by_name: usersMap.get(r.created_by) || "-",
        approved_by_name: r.approved_by ? usersMap.get(r.approved_by) || "-" : "-"
      }));

      setRequests(requestsWithNames);

      // Analytics
      const totalRequests = requestsWithNames.length;
      const totalApprovedToday = requestsWithNames.filter(r => r.status === "Approved" && r.approved_at && dayjs(r.approved_at).isSame(dayjs(), "day")).length;
      setTotals({ totalRequests, totalApprovedToday });

    } catch(err) {
      console.error(err);
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, filterType, customFrom, customTo, searchTerm]);

  // Modal handlers
  const openModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setComment("");
    setModalOpen(true);
  };

  const handleModalSubmit = async () => {
    if (!selectedRequest) return;
    try {
      const { error } = await supabase
        .from("request_expenses")
        .update({
          status: actionType === "Approve" ? "Approved" : "Rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          comment
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;
      toast.success(`Request ${actionType}d successfully`);
      setModalOpen(false);
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update request");
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      <CustomCard>
  {/* Header */}
  <div className="flex items-center justify-between mb-3">
    <Link
      to="../expenses"
      className="flex items-center gap-2 font-bold text-[#ef4444] hover:underline"
    >
      <FaArrowLeft /> Back to Expenses
    </Link>
    <h1 className="text-3xl font-bold text-[#ef4444]">Request Expenses</h1>
  </div>

  {/* Tips / short instructions */}
  <p className="text-gray-600 mb-4 text-sm">
    Use the button below to create a new expense request quickly.
  </p>

  {/* Action Button */}
  <div className="flex flex-wrap gap-2">
    <Link
      to="../expenses/expenses"
      className="bg-[#ef4444] text-white px-4 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2 shadow transition-all"
    >
      <FaPlus /> Request Expenses
    </Link>
  </div>
</CustomCard>


      {/* Filters & Search */}
      <CustomCard title="Filters & Search">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2 items-center">
            {["today","week","month","year","custom"].map(ft => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-3 py-1 rounded-xl ${filterType===ft ? "bg-[#ef4444] text-white" : "bg-white border border-[#e5e7eb]"}`}
              >
                {ft==="today"?"Today":ft==="week"?"This Week":ft==="month"?"This Month":ft==="year"?"This Year":"Custom"}
              </button>
            ))}
            {filterType==="custom" && (
              <div className="flex gap-2 items-center ml-2">
                <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="border border-[#e5e7eb] px-2 py-1 rounded"/>
                <span>to</span>
                <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="border border-[#e5e7eb] px-2 py-1 rounded"/>
                <button onClick={fetchRequests} className="px-3 py-1 bg-[#ef4444] text-white rounded hover:bg-red-600 transition">Apply</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={e=>setSearchTerm(e.target.value)}
              className="border border-[#e5e7eb] px-3 py-1 rounded w-full sm:w-auto"
            />
          </div>
        </div>
      </CustomCard>

      {/* Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormCard title="Total Requests">
          <p className="text-[#ef4444] font-bold text-lg">{totals.totalRequests}</p>
        </FormCard>
        <FormCard title="Approved Today">
          <p className="text-[#ef4444]/80 font-bold text-lg">{totals.totalApprovedToday}</p>
        </FormCard>
      </div>

      {/* Requests Table */}
      <CustomCard title="Expense Requests">
        {loading ? (
          <p className="text-gray-600">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-600">No requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[#ef4444] text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Office</th>
                  <th className="px-2 py-2">Created By</th>
                  <th className="px-2 py-2">Created At</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Approved By</th>
                  <th className="px-2 py-2">Approved At</th>
                  <th className="px-2 py-2">Comment</th>
                  <th className="px-2 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b hover:bg-[#ffe5e5]">
                    <td className="px-2 py-2">{r.name}</td>
                    <td className="px-2 py-2">{r.amount}</td>
                    <td className="px-2 py-2">{r.category || "-"}</td>
                    <td className="px-2 py-2">{r.description || "-"}</td>
                    <td className="px-2 py-2">{r.office_name || "-"}</td>
                    <td className="px-2 py-2">{r.created_by_name}</td>
                    <td className="px-2 py-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td
                      className={`px-2 py-2 font-semibold text-center rounded-full ${
                        r.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : r.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : r.status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : ""
                      }`}
                    >
                      {r.status}
                    </td>
                    <td className="px-2 py-2">{r.approved_by_name || "-"}</td>
                    <td className="px-2 py-2">{r.approved_at ? new Date(r.approved_at).toLocaleString() : "-"}</td>
                    <td className="px-2 py-2">{r.comment || "-"}</td>
                    <td className="px-2 py-2 text-center flex flex-col sm:flex-row justify-center gap-2">
  {r.status === "pending" && (
    <>
      <button
        onClick={() => openModal(r, "Approve")}
        className="bg-[#ef4444] text-white px-3 py-1 rounded-xl hover:bg-red-600 flex items-center gap-2 transition-all"
      >
        <FaCheckCircle /> Approve
      </button>
      <button
        onClick={() => openModal(r, "Reject")}
        className="bg-red-600 text-white px-3 py-1 rounded-xl hover:bg-red-700 flex items-center gap-2 transition-all"
      >
        <FaTimesCircle /> Reject
      </button>
    </>
  )}
</td>

                      
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CustomCard>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{actionType} Request</h2>
            <p className="mb-2">Comment (optional):</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="border rounded w-full px-3 py-2 mb-4"
              rows={4}
              placeholder="Enter comment"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                className={`px-4 py-2 rounded text-white ${
                  actionType === "Approve" ? "bg-[#ef4444] hover:bg-red-600" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

};

export default RequestExpensesIndex;
