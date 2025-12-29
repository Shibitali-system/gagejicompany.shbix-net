import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaSave, FaPlus, FaTrash } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import dayjs from "dayjs";

const Card = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>}
    <div className="w-full">{children}</div>
  </div>
);

const MeetingNew = () => {
  const navigate = useNavigate();

  // Meeting main fields
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Implementation points
  const [implementationPoints, setImplementationPoints] = useState([
    { description: "", responsible_id: "" } // default first point
  ]);

  // Attendees
  const [attendees, setAttendees] = useState([]);
  const [attendeeRoles, setAttendeeRoles] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [searchAttendee, setSearchAttendee] = useState("");

  // Fetch current user and office users
  useEffect(() => {
    const fetchUserAndUsers = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("No authenticated user");

        // Try systems_users
        let { data: mainUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (!mainUser) {
          const { data: employee } = await supabase
            .from("employees")
            .select("*")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();
          mainUser = employee;
        }

        if (!mainUser) throw new Error("No user found");
        setUser(mainUser);

        // Load all users in office for attendees
        const { data: systemUsers } = await supabase
          .from("systems_users")
          .select("id, customer_name")
          .eq("office_id", mainUser.office_id);

        const { data: employees } = await supabase
          .from("employees")
          .select("id, name")
          .eq("office_id", mainUser.office_id);

        const mergedUsers = [
          ...systemUsers.map(u => ({ id: u.id, name: u.customer_name })),
          ...employees.map(e => ({ id: e.id, name: e.name }))
        ];

        setAllUsers(mergedUsers);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user or attendees");
      }
    };

    fetchUserAndUsers();
  }, []);

  // Implementation points handlers
  const addImplementationPoint = () =>
    setImplementationPoints(prev => [...prev, { description: "", responsible_id: "" }]);
  const removeImplementationPoint = idx =>
    setImplementationPoints(prev => prev.filter((_, i) => i !== idx));
  const updateImplementationPoint = (idx, field, value) =>
    setImplementationPoints(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  // Attendees handlers
  const handleAttendeeCheck = (id, checked) => {
    if (checked) setAttendees(prev => [...prev, id]);
    else {
      setAttendees(prev => prev.filter(a => a !== id));
      setAttendeeRoles(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };
  const handleRoleChange = (id, role) => setAttendeeRoles(prev => ({ ...prev, [id]: role }));

  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchAttendee.toLowerCase()));

  const handleSave = async () => {
    if (!user || !user.id || !user.office_id) {
      toast.error("User not loaded yet");
      return;
    }
    if (!title || !meetingDate) {
      toast.error("Title and meeting date are required");
      return;
    }

    setSaving(true);
    try {
      // Combine date + time properly
      const startISO = startTime ? dayjs(`${meetingDate} ${startTime}`).toISOString() : null;
      const endISO = endTime ? dayjs(`${meetingDate} ${endTime}`).toISOString() : null;
      const meetingISO = meetingDate ? dayjs(meetingDate).toISOString() : null;

      const { data: newMeeting, error } = await supabase
        .from("meetings")
        .insert([{
          office_id: user.office_id,
          title,
          description,
          meeting_date: meetingISO,
          start_time: startISO,
          end_time: endISO,
          location,
          is_virtual: isVirtual,
          tags: tags ? tags.split(",").map(t => t.trim()) : null,
          created_by: user.id,
          implementation_points: implementationPoints
        }])
        .select() // ensure data is returned
        .single();

      if (error || !newMeeting) throw error || new Error("Failed to create meeting");

      // Insert attendees with roles
      const attendeeRecords = attendees
        .filter(aid => aid && allUsers.some(u => u.id === aid))
        .map(aid => ({
          meeting_id: newMeeting.id,
          user_id: aid,
         
          role: attendeeRoles[aid] || "participant",
          status: "pending"
        }));

      if (attendeeRecords.length > 0) {
        const { error: attError } = await supabase.from("meeting_attendees").insert(attendeeRecords);
        if (attError) console.error("Insert attendees error:", attError);
      }

      toast.success("Meeting created successfully");
     
    } catch (err) {
      console.error(err);
      toast.error("Failed to create meeting");
    } finally {
      setSaving(false);
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-[#2563EB]">Tengeneza Kikao Kipya</h1>

      <Card title="Kichwa cha Kikao">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]"
        />
      </Card>

      <Card title="Maelezo">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={5}
          className="w-full border border-[#e5e7eb] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563EB] resize-none"
        />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Tarehe ya Kikao">
          <input
            type="date"
            value={meetingDate}
            onChange={e => setMeetingDate(e.target.value)}
            className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]"
          />
        </Card>

        <Card title="Muda wa Kuanzia">
          <input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]"
          />
        </Card>

        <Card title="Muda wa Mwisho">
          <input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]"
          />
        </Card>

        <Card title="Mahali">
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]"
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Kikao cha Mtandaoni">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isVirtual}
              onChange={e => setIsVirtual(e.target.checked)}
            />
            <span className="text-sm">Je, kikao hiki ni mtandaoni?</span>
          </label>
        </Card>

        <Card title="Maneno Muhimu (Tags)">
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="mauzo, bodi, mpango"
            className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2"
          />
        </Card>
      </div>

      {/* Pointi za Utekelezaji */}
      <Card title="Pointi za Utekelezaji">
        {implementationPoints.map((point, idx) => (
          <div key={idx} className="flex gap-2 items-center mb-2">
            <input
              type="text"
              placeholder="Maelezo ya utekelezaji"
              value={point.description}
              onChange={e => updateImplementationPoint(idx, "description", e.target.value)}
              className="border border-[#e5e7eb] rounded-xl px-3 py-1 flex-1 focus:ring-2 focus:ring-[#2563EB]"
            />
            <select
              value={point.responsible_id}
              onChange={e => updateImplementationPoint(idx, "responsible_id", e.target.value)}
              className="border border-[#e5e7eb] rounded-xl px-3 py-1 focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">Chagua anayehusika</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button
              onClick={() => removeImplementationPoint(idx)}
              className="text-red-500 p-1 rounded hover:bg-red-100"
            >
              <FaTrash />
            </button>
          </div>
        ))}
        <button
          onClick={addImplementationPoint}
          className="mt-2 px-4 py-1 rounded-xl bg-[#2563EB] text-white flex items-center gap-2 hover:bg-[#1e4fd8]"
        >
          <FaPlus /> Ongeza Pointi
        </button>
      </Card>

      {/* Washiriki */}
      <Card title="Washiriki">
        <input
          type="text"
          placeholder="Tafuta mshiriki..."
          value={searchAttendee}
          onChange={e => setSearchAttendee(e.target.value)}
          className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 mb-2 focus:ring-2 focus:ring-[#2563EB]"
        />
        <div className="max-h-60 overflow-y-auto">
          {filteredUsers.map(u => (
            <div key={u.id} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={attendees.includes(u.id)}
                onChange={e => handleAttendeeCheck(u.id, e.target.checked)}
              />
              <span className="flex-1">{u.name}</span>
              {attendees.includes(u.id) && (
                <input
                  type="text"
                  placeholder="Cheo (mfano: Mwenyekiti)"
                  value={attendeeRoles[u.id] || ""}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                  className="border border-[#e5e7eb] rounded-xl px-2 py-1 w-36 focus:ring-2 focus:ring-[#2563EB]"
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Vitufe */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 rounded-xl border border-[#e5e7eb] hover:bg-gray-100"
        >
          Ghairi
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-xl bg-[#2563EB] text-white flex items-center gap-2 shadow hover:bg-[#1e4fd8] disabled:opacity-50"
        >
          <FaSave /> {saving ? "Inaendelea kuhifadhi..." : "Tengeneza Kikao"}
        </button>
      </div>

    </div>
  </div>
);

};

export default MeetingNew;
