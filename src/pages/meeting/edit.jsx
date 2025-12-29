import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useParams, useNavigate } from "react-router-dom";
import { FaSave, FaArrowLeft } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import dayjs from "dayjs";

const Card = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[6px] p-5 shadow-sm hover:shadow-md transition-all w-full">
    {title && <p className="text-gray-500 text-xs mb-2 tracking-wide">{title}</p>}
    {children}
  </div>
);

const MeetingEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [tags, setTags] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("Hakuna mtumiaji aliyeingia");

        const { data: mainUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (mainUser) setUser({ ...mainUser, role: "admin" });
        else {
          const { data: employee } = await supabase
            .from("employees")
            .select("*")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();
          if (employee) setUser({ ...employee, role: "employee" });
        }

        // Pata kikao
        const { data: meetingData, error } = await supabase
          .from("meetings")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        setMeeting(meetingData);
        setTitle(meetingData.title);
        setDescription(meetingData.description || "");
        setMeetingDate(dayjs(meetingData.meeting_date).format("YYYY-MM-DD"));
        setStartTime(meetingData.start_time ? dayjs(meetingData.start_time).format("HH:mm") : "");
        setEndTime(meetingData.end_time ? dayjs(meetingData.end_time).format("HH:mm") : "");
        setLocation(meetingData.location || "");
        setIsVirtual(meetingData.is_virtual);
        setTags(meetingData.tags ? meetingData.tags.join(", ") : "");

        // Pata washiriki
        const { data: attendeeData } = await supabase
          .from("meeting_attendees")
          .select("user_id")
          .eq("meeting_id", id);
        setAttendees(attendeeData.map(a => a.user_id));

        // Pata watumiaji wote ofisini
        const { data: systemUsers } = await supabase
          .from("systems_users")
          .select("id, customer_name")
          .eq("office_id", meetingData.office_id);
        const { data: employees } = await supabase
          .from("employees")
          .select("id, name")
          .eq("office_id", meetingData.office_id);

        const mergedUsers = [
          ...systemUsers.map(u => ({ id: u.id, name: u.customer_name })),
          ...employees.map(e => ({ id: e.id, name: e.name }))
        ];
        setAllUsers(mergedUsers);

        setLoading(false);
      } catch (err) {
        console.error(err);
        toast.error("Imeshindikana kupakua kikao au mtumiaji");
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!title || !meetingDate) {
      toast.error("Kichwa na tarehe ya kikao ni lazima");
      return;
    }

    setSaving(true);
    try {
      await supabase.from("meetings").update({
        title,
        description,
        meeting_date: dayjs(meetingDate).toISOString(),
        start_time: startTime ? dayjs(startTime).toISOString() : null,
        end_time: endTime ? dayjs(endTime).toISOString() : null,
        location,
        is_virtual: isVirtual,
        tags: tags ? tags.split(",").map(t => t.trim()) : null
      }).eq("id", id);

      // Sasisha washiriki
      await supabase.from("meeting_attendees").delete().eq("meeting_id", id);
      if (attendees.length > 0) {
        const attendeeRecords = attendees.map(aid => ({ meeting_id: id, user_id: aid }));
        await supabase.from("meeting_attendees").insert(attendeeRecords);
      }

      toast.success("Kikao kimesasishwa kwa mafanikio");
      navigate(`/meetings/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Imeshindikana kusasisha kikao");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Inapakia kikao...</div>;
  if (!meeting) return <div className="min-h-screen flex items-center justify-center text-red-600">Kikao hakipatikani</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-[#2563EB]"><FaArrowLeft /> Rudi</button>
          <h1 className="text-3xl font-bold text-[#2563EB]">Hariri Kikao</h1>
        </div>

        <Card title="Kichwa cha Kikao">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Weka kichwa cha kikao" className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" />
        </Card>

        <Card title="Maelezo">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Andika maelezo ya kikao" className="w-full border border-[#e5e7eb] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563EB] resize-none" />
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card title="Tarehe ya Kikao">
            <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" />
          </Card>

          <Card title="Muda wa Kuanza">
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" />
          </Card>

          <Card title="Muda wa Kumaliza">
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" />
          </Card>

          <Card title="Mahali">
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Weka mahali pa kikao" className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" />
          </Card>
        </div>

        <Card title="Kikao Mtandaoni">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isVirtual} onChange={e => setIsVirtual(e.target.checked)} />
            <span className="text-sm">Je hiki ni kikao cha mtandaoni?</span>
          </label>
        </Card>

        <Card title="Maneno Muhimu (Comma Separated)">
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="mauzo, bodi, mipango" className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2" />
        </Card>

        <Card title="Washiriki">
          <select multiple value={attendees} onChange={e => setAttendees(Array.from(e.target.selectedOptions, option => option.value))} className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 h-40 focus:ring-2 focus:ring-[#2563EB]">
            {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Card>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button onClick={() => navigate(-1)} className="px-5 py-2 rounded-xl border border-[#e5e7eb] hover:bg-gray-100">Ghairi</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-xl bg-[#2563EB] text-white flex items-center gap-2 shadow hover:bg-[#1e4fd8] disabled:opacity-50"><FaSave /> {saving ? "Inaendelea kuhifadhi..." : "Sasisha Kikao"}</button>
        </div>
      </div>
    </div>
  );
};

export default MeetingEdit;
