import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEdit,
  FaThumbtack,
  FaTag,
  FaCalendarAlt,
  FaUser
} from "react-icons/fa";
import dayjs from "dayjs";
import { toast, Toaster } from "react-hot-toast";

/* =========================
   Reusable Card Component
========================= */
const Card = ({ title, children, className = "" }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col gap-3 transition-all duration-200
      hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans w-full ${className}
    `}
  >
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">
        {title}
      </p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

/* =========================
   Notebook Details Page
========================= */
const NotebookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [createdByName, setCreatedByName] = useState("-");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNoteAndUser = async () => {
      setLoading(true);

      /* 1. Fetch notebook */
      const { data: noteData, error } = await supabase
        .from("systems_notebooks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Failed to load notebook");
        console.error(error);
        setLoading(false);
        return;
      }

      setNote(noteData);

      /* 2. Resolve created by name (systems_users first) */
      const { data: systemUser } = await supabase
        .from("systems_users")
        .select("customer_name")
        .eq("id", noteData.created_by)
        .maybeSingle();

      if (systemUser?.customer_name) {
        setCreatedByName(systemUser.customer_name);
        setLoading(false);
        return;
      }

      /* 3. Else resolve from employees */
      const { data: employee } = await supabase
        .from("employees")
        .select("name")
        .eq("id", noteData.created_by)
        .maybeSingle();

      if (employee?.name) {
        setCreatedByName(employee.name);
      }

      setLoading(false);
    };

    fetchNoteAndUser();
  }, [id]);

  /* =========================
     Loading & Error States
  ========================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading notebook...
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Notebook not found
      </div>
    );
  }

  /* =========================
     Render Page
  ========================= */
  return (
  <div className="min-h-screen bg-[#f4f6fb] p-4 sm:p-6">
    <Toaster position="top-right" />

    <div className="max-w-4xl mx-auto space-y-6">

      {/* Bara Juu */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-[#2563EB]"
        >
          <FaArrowLeft /> Rudi
        </button>

        <button
          onClick={() => navigate(`/dashboard/notebook/edit/${note.id}`)}
          className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-xl shadow hover:bg-[#1e4fd8]"
        >
          <FaEdit /> Hariri
        </button>
      </div>

      {/* Kichwa cha Noti */}
      <Card title="Kichwa cha Notebook" className="relative">
        {note.is_pinned && (
          <div className="absolute top-4 right-4 flex items-center gap-1 text-[#2563EB] text-sm font-medium">
            <FaThumbtack /> Imeambatishwa
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-bold text-[#2563EB] leading-snug">
          {note.title}
        </h1>
      </Card>

      {/* Taarifa Zaidi */}
      <Card title="Maelezo" className="bg-[#f9fafb]">
        <div className="flex flex-wrap gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-[#2563EB]" />
            {dayjs(note.created_at).format("DD MMM YYYY, HH:mm")}
          </div>
          <div className="flex items-center gap-2">
            <FaUser className="text-[#2563EB]" />
            {createdByName}
          </div>
        </div>
      </Card>

      {/* Yaliyomo */}
      <Card title="Yaliyomo kwenye Notebook" className="min-h-[200px]">
        <div className="whitespace-pre-line text-gray-800 leading-relaxed text-[15px]">
          {note.content}
        </div>
      </Card>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <Card title="Maneno Muhimu (Tags)">
          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-xs font-medium"
              >
                <FaTag /> {tag}
              </span>
            ))}
          </div>
        </Card>
      )}

    </div>
  </div>
);

};

export default NotebookDetails;
