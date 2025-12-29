import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaArrowLeft, FaFilePdf } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Card = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded px-5 py-4 flex flex-col gap-3 shadow font-sans">
    {title && <p className="text-gray-500 text-sm">{title}</p>}
    <div>{children}</div>
  </div>
);

const MeetingDetailsPage = () => {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);

  const detailsRef = useRef();

  /* ================= USERS MAP ================= */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: systemsUsers } = await supabase
          .from("systems_users")
          .select("id, customer_name");

        const { data: employees } = await supabase
          .from("employees")
          .select("id, name");

        const map = {};

        systemsUsers?.forEach(u => {
          map[u.id] = u.customer_name;                 
          map[`system:${u.id}`] = u.customer_name;     
        });

        employees?.forEach(e => {
          map[e.id] = e.name;                          
          map[`employee:${e.id}`] = e.name;            
        });

        setUserMap(map);
      } catch (err) {
        console.error(err);
        toast.error("Imeshindikana kupakua watumiaji");
      }
    };

    fetchUsers();
  }, []);

  /* ================= MEETING DATA ================= */
  useEffect(() => {
    const fetchMeeting = async () => {
      setLoading(true);
      try {
        const { data: meetingData, error } = await supabase
          .from("meetings")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!meetingData) throw new Error("Kikao hakipatikani");

        setMeeting(meetingData);

        const { data: attendeesData } = await supabase
          .from("meeting_attendees")
          .select("*")
          .eq("meeting_id", id);

        setAttendees(attendeesData || []);
      } catch (err) {
        console.error(err);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [id]);

  /* ================= PDF ================= */
  const exportToPDF = async () => {
    if (!detailsRef.current) return;
    const canvas = await html2canvas(detailsRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`kikao_${id}.pdf`);
  };

  if (loading) return <p className="p-6 text-gray-500">Inapakia kikao...</p>;
  if (!meeting) return <p className="p-6 text-red-600">Kikao hakipatikani</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster />
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between">
          <Link to="/dashboard/meeting" className="text-blue-600 flex gap-2">
            <FaArrowLeft /> Rudi
          </Link>
          <button onClick={exportToPDF} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <FaFilePdf /> Hifadhi PDF
          </button>
        </div>

        <div ref={detailsRef} className="space-y-4">
          <Card title="Kichwa">{meeting.title}</Card>
          <Card title="Maelezo">{meeting.description || "-"}</Card>

          <Card title="Tarehe & Muda">
            <div className="grid grid-cols-2 gap-2">
              <div>Tarehe: {dayjs(meeting.meeting_date).format("DD MMM YYYY")}</div>
              <div>Kuanza: {meeting.start_time ? dayjs(meeting.start_time).format("HH:mm") : "-"}</div>
              <div>Kumaliza: {meeting.end_time ? dayjs(meeting.end_time).format("HH:mm") : "-"}</div>
              <div>Mahali: {meeting.location || "-"}</div>
              <div>Mtandaoni: {meeting.is_virtual ? "Ndiyo" : "Hapana"}</div>
              <div>Imeanzishwa na: {userMap[meeting.created_by] || "-"}</div>
            </div>
          </Card>

          {/* ================= WASHIRIKI ================= */}
          <Card title="Washiriki">
            {attendees.length ? (
              <ul className="space-y-2">
                {attendees.map((a, idx) => {
                  const nameKey = a.user_type
                    ? `${a.user_type}:${a.user_id}`
                    : a.user_id;

                  return (
                    <li key={idx} className="border p-2 rounded">
                      <div><strong>Jina:</strong> {userMap[nameKey] || "-"}</div>
                      <div><strong>Jukumu:</strong> {a.role || "-"}</div>
                      <div><strong>Hali:</strong> {a.status || "Inasubiri"}</div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>Hakuna washiriki.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetailsPage;
