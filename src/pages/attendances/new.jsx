// src/pages/attendances/NewAttendance.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaArrowLeft, FaPlus, FaTimes, FaUser } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

/**
 * Staff Attendance (creates records into staff_attendance table WITHOUT foreign key constraints)
 *
 * Requirements satisfied:
 * - Uses "staff_attendance" table that expects staff_id, entered_by, office_id as TEXT (no FK)
 * - Dropdown lists only employees of the current user's office (fetched in batches)
 * - Time inputs use "HH:MM" format acceptable by PostgreSQL time column
 * - Robust validation + friendly toasts + loading states
 */

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

const BATCH_SIZE = 500; // fetch employees in batches (tuneable)

const NewAttendance = () => {
  const [userInfo, setUserInfo] = useState(null); // { id, name, office_id, office_name }
  const [employees, setEmployees] = useState([]); // employees for this office
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [submitting, setSubmitting] = useState(false);



  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [form, setForm] = useState({
    date: "",
    check_in: "",
    check_out: "",
    remarks: "",
    comment: ""
  });

  // load authenticated user info (systems_users OR employees)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("Not authenticated");

        // try systems_users
        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("id, customer_name, office_id, office_name, auth_user_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) {
          setUserInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            office_id: systemUser.office_id,
            office_name: systemUser.office_name
          });
          return;
        }

        // try employees
        const { data: employeeUser } = await supabase
          .from("employees")
          .select("id, name, office_id, office_name, auth_user_id")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employeeUser) {
          setUserInfo({
            id: employeeUser.id,
            name: employeeUser.name,
            office_id: employeeUser.office_id,
            office_name: employeeUser.office_name
          });
          return;
        }

        toast.error("User record not found in systems_users or employees");
      } catch (err) {
        console.error("fetchUser error:", err);
        toast.error("Failed to fetch user info");
      }
    };

    fetchUser();
  }, []);

  // fetch employees for user's office in batches
  useEffect(() => {
    if (!userInfo?.office_id) return;

    let cancelled = false;
    const fetchEmployeesBatch = async (officeId) => {
      setLoadingEmployees(true);
      try {
        let all = [];
        let from = 0;

        while (true) {
          const { data, error } = await supabase
            .from("employees")
            .select("id, name, office_id")
            .eq("office_id", officeId)
            .range(from, from + BATCH_SIZE - 1);

          if (error) {
            console.error("fetchEmployees batch error:", error);
            toast.error("Failed to load employees");
            break;
          }

          if (!data || data.length === 0) break;

          all = [...all, ...data];

          if (data.length < BATCH_SIZE) break; // finished
          from += BATCH_SIZE;
        }

        if (!cancelled) setEmployees(all);
      } catch (err) {
        console.error("fetchEmployees error:", err);
        toast.error("Failed to load employees");
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };

    fetchEmployeesBatch(userInfo.office_id);

    return () => {
      cancelled = true;
    };
  }, [userInfo]);

  // handle form field updates
  const onChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  // Validate and submit attendance record
  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (!userInfo) return toast.error("User info not loaded");
    if (!selectedEmployeeId) return toast.error("Please select a staff member");
    if (!form.date) return toast.error("Please pick a date");

    // Check times: accept "" or "HH:MM"
    const checkIn = form.check_in ? form.check_in : null;
    const checkOut = form.check_out ? form.check_out : null;

    // find staff name from employees list (falls back to empty string)
    const staff = employees.find(emp => String(emp.id) === String(selectedEmployeeId));
    const staff_name = staff?.name || "";

    const insertRow = {
      staff_id: String(selectedEmployeeId), // keep as text on DB (no FK)
      staff_name,
      entered_by: String(userInfo.id), // we store as text (no FK)
      office_id: String(userInfo.office_id || ""),
      office_name: userInfo.office_name || null,
      date: form.date,
      check_in: checkIn,   // time column accepts "HH:MM" or null
      check_out: checkOut, // time column accepts "HH:MM" or null
      remarks: form.remarks || null,
      comment: form.comment || null,
      status: "Pending"
    };

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("staff_attendance")
        .insert([insertRow]);

      if (error) throw error;

      toast.success("Attendance submitted successfully");
      // reset form
      setSelectedEmployeeId("");
      setForm({ date: "", check_in: "", check_out: "", remarks: "", comment: "" });
    } catch (err) {
      console.error("submit error:", err);
      toast.error("Failed to submit attendance: " + (err.message || err.toString()));
    } finally {
      setSubmitting(false);
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Card 1: Header + Tips */}
      <CustomCard>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
          <Link to="../attendances" className="flex items-center gap-2 font-bold text-[#ef4444] hover:underline">
            <FaArrowLeft /> Back to Attendance Records
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444] mt-2 sm:mt-0">Add Staff Attendance</h1>
        </div>
        <p className="text-gray-600 text-sm">
          Fill out the form below to add staff attendance. Fields marked with * are required.
        </p>
      </CustomCard>

      {/* Card 2: Staff Info + Date */}
      <CustomCard title="Staff & Date">
        <div className="mb-2 text-sm text-gray-700">
          <p><strong>Office:</strong> {userInfo?.office_name || "—"}</p>
          <p><strong>Entered By:</strong> {userInfo?.name || "—"}</p>
        </div>

        <div className="space-y-4">
          {/* Staff dropdown */}
          <div>
            <label className="block font-semibold mb-1">Select Staff *</label>
            <div className="relative">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
                required
              >
                <option value="">-- Select staff --</option>
                {loadingEmployees && <option disabled>Loading staff...</option>}
                {!loadingEmployees && employees.length === 0 && <option disabled>No staff found</option>}
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-2 text-gray-400"><FaUser /></div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block font-semibold mb-1">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange("date", e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
              required
            />
          </div>
        </div>
      </CustomCard>

      {/* Card 3: Attendance Times + Remarks + Comment */}
      <CustomCard title="Attendance Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block font-semibold mb-1">Check In</label>
            <input
              type="time"
              value={form.check_in}
              onChange={(e) => onChange("check_in", e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Check Out</label>
            <input
              type="time"
              value={form.check_out}
              onChange={(e) => onChange("check_out", e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
            />
          </div>
        </div>

        {/* Remarks */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Remarks</label>
          <textarea
            value={form.remarks}
            onChange={(e) => onChange("remarks", e.target.value)}
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
            placeholder="Optional"
            rows={3}
          />
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Comment</label>
          <textarea
            value={form.comment}
            onChange={(e) => onChange("comment", e.target.value)}
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
            placeholder="Optional (visible to approvers)"
            rows={2}
          />
        </div>



        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="bg-[#ef4444] text-white px-5 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2"
          >
            <FaPlus />
            {submitting ? "Submitting..." : "Submit Attendance"}
          </button>

          <Link
            to="/attendances"
            className="bg-gray-300 px-5 py-2 rounded-xl hover:bg-gray-400 flex items-center gap-2"
          >
            <FaTimes />
            Cancel
          </Link>
        </div>
      </CustomCard>

    </div>
  </div>
);

};

export default NewAttendance;
