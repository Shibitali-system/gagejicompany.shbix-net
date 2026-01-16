// src/pages/attendances/NewAttendance.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaArrowLeft, FaPlus, FaTimes, FaUser } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

/**
 * Mahudhurio ya Wafanyakazi (inaunda rekodi kwenye meza ya staff_attendance bila FK constraints)
 *
 * Inakidhi:
 * - Inatumia meza ya "staff_attendance" inayotarajia staff_id, entered_by, office_id kama TEXT (hakuna FK)
 * - Dropdown inaorodhesha wafanyakazi tu wa ofisi ya mtumiaji (inachukuliwa kwa batches)
 * - Time inputs zinatumia format ya "HH:MM" inayokubalika na PostgreSQL time column
 * - Validation thabiti + toasts rafiki + loading states
 */

const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
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
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">{title}</p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

const BATCH_SIZE = 500; // wafanyakazi wanachukuliwa kwa batches

const NewAttendance = () => {
  const [userInfo, setUserInfo] = useState(null); 
  const [employees, setEmployees] = useState([]); 
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

  // Pata info ya mtumiaji aliye authenticate
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("Hauja authenticate");

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

        toast.error("Rekodi ya mtumiaji haipatikani kwenye systems_users au employees");
      } catch (err) {
        console.error("fetchUser error:", err);
        toast.error("Imeshindikana kupata info ya mtumiaji");
      }
    };

    fetchUser();
  }, []);

  // Chukua wafanyakazi wa ofisi ya mtumiaji
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
            toast.error("Imeshindikana kupakia wafanyakazi");
            break;
          }

          if (!data || data.length === 0) break;

          all = [...all, ...data];

          if (data.length < BATCH_SIZE) break;
          from += BATCH_SIZE;
        }

        if (!cancelled) setEmployees(all);
      } catch (err) {
        console.error("fetchEmployees error:", err);
        toast.error("Imeshindikana kupakia wafanyakazi");
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };

    fetchEmployeesBatch(userInfo.office_id);

    return () => { cancelled = true; };
  }, [userInfo]);

  const onChange = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (!userInfo) return toast.error("Info ya mtumiaji haijapakuliwa");
    if (!selectedEmployeeId) return toast.error("Tafadhali chagua mfanyakazi");
    if (!form.date) return toast.error("Tafadhali chagua tarehe");

    const checkIn = form.check_in || null;
    const checkOut = form.check_out || null;

    const staff = employees.find(emp => String(emp.id) === String(selectedEmployeeId));
    const staff_name = staff?.name || "";

    const insertRow = {
      staff_id: String(selectedEmployeeId),
      staff_name,
      entered_by: String(userInfo.id),
      office_id: String(userInfo.office_id || ""),
      office_name: userInfo.office_name || null,
      date: form.date,
      check_in: checkIn,
      check_out: checkOut,
      remarks: form.remarks || null,
      comment: form.comment || null,
      status: "Pending"
    };

    setSubmitting(true);
    try {
      const { error } = await supabase.from("staff_attendance").insert([insertRow]);
      if (error) throw error;

      toast.success("Mahudhurio yamewasilishwa kwa mafanikio");
      setSelectedEmployeeId("");
      setForm({ date: "", check_in: "", check_out: "", remarks: "", comment: "" });
    } catch (err) {
      console.error("submit error:", err);
      toast.error("Imeshindikana kuwasilisha mahudhurio: " + (err.message || err.toString()));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Kadi 1: Kichwa + Maelezo */}
        <CustomCard>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
            <Link to="../attendances" className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline">
              <FaArrowLeft /> Rudi kwenye Rekodi za Mahudhurio
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] mt-2 sm:mt-0">Ongeza Mahudhurio ya Wafanyakazi</h1>
          </div>
          <p className="text-gray-600 text-sm">
            Jaza fomu hapa chini ili kuongeza mahudhurio ya mfanyakazi. Sehemu zilizo na * ni lazima kujazwa.
          </p>
        </CustomCard>

        {/* Kadi 2: Taarifa za Mfanyakazi + Tarehe */}
        <CustomCard title="Mfanyakazi & Tarehe">
          <div className="mb-2 text-sm text-gray-700">
            <p><strong>Ofisi:</strong> {userInfo?.office_name || "—"}</p>
            <p><strong>Imeingizwa Na:</strong> {userInfo?.name || "—"}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Chagua Mfanyakazi *</label>
              <div className="relative">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  required
                >
                  <option value="">-- Chagua mfanyakazi --</option>
                  {loadingEmployees && <option disabled>Inapakia wafanyakazi...</option>}
                  {!loadingEmployees && employees.length === 0 && <option disabled>Hakuna mfanyakazi aliye patikana</option>}
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-2 text-gray-400"><FaUser /></div>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Tarehe *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => onChange("date", e.target.value)}
                className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>
          </div>
        </CustomCard>

        {/* Kadi 3: Muda wa Mahudhurio + Maelezo + Maoni */}
        <CustomCard title="Maelezo ya Mahudhurio">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-1">Angalia Kuingia</label>
              <input
                type="time"
                value={form.check_in}
                onChange={(e) => onChange("check_in", e.target.value)}
                className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Angalia Kutoka</label>
              <input
                type="time"
                value={form.check_out}
                onChange={(e) => onChange("check_out", e.target.value)}
                className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-1">Maelezo</label>
            <textarea
              value={form.remarks}
              onChange={(e) => onChange("remarks", e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              placeholder="Hiari"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-1">Maoni</label>
            <textarea
              value={form.comment}
              onChange={(e) => onChange("comment", e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              placeholder="Hiari (inaonekana kwa wahakiki)"
              rows={2}
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={submitting}
              onClick={handleSubmit}
              className="bg-[#2563EB] text-white px-5 py-2 rounded-xl hover:bg-red-600 flex items-center gap-2"
            >
              <FaPlus />
              {submitting ? "Inatuma..." : "Wasilisha Mahudhurio"}
            </button>

            <Link
              to="../attendances"
              className="bg-gray-300 px-5 py-2 rounded-xl hover:bg-gray-400 flex items-center gap-2"
            >
              <FaTimes />
              Ghairi
            </Link>
          </div>
        </CustomCard>

      </div>
    </div>
  );
};

export default NewAttendance;
