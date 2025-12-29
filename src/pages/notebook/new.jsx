import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaSave, FaArrowLeft, FaThumbtack } from "react-icons/fa";
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


const NewNotebook = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  // Load user
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
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user");
      }
    };

    loadUser();
  }, []);

  const handleSave = async () => {
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    if (!user) return;

    setLoading(true);

    const { error } = await supabase.from("systems_notebooks").insert({
      office_id: user.office_id,
      title,
      content,
      is_pinned: isPinned,
      tags: tags ? tags.split(",").map(t => t.trim()) : null,
      created_by: user.id
    });

    if (error) {
      console.error(error);
      toast.error("Failed to save note");
    } else {
      toast.success("Notebook saved successfully");
      
    }

    setLoading(false);
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Kichwa */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2563EB]">Notebook Mpya</h1>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-[#2563EB]"
        >
          <FaArrowLeft /> Rudi
        </button>
      </div>

      {/* Kichwa cha Notebook */}
      <Card title="Kichwa cha Notebook">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Weka kichwa cha notebook"
          className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]"
        />
      </Card>

      {/* Maudhui */}
      <Card title="Maudhui ya Notebook">
        <textarea
          rows={10}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Andika maelezo yako ya biashara hapa..."
          className="w-full border border-[#e5e7eb] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563EB] resize-none"
        />
      </Card>

      {/* Viongeza */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Ambatisha Notebook">
          <label className="flex items-center gap-2 cursor-pointer">
            <FaThumbtack className={isPinned ? "text-[#2563EB]" : "text-gray-400"} />
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
            />
            <span className="text-sm">Ambatisha maelezo haya</span>
          </label>
        </Card>

        <Card title="Vitambulisho (kutenganishwa kwa koma)">
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="mauzo, madeni, hisa"
            className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2"
          />
        </Card>
      </div>

      {/* Vitendo */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 rounded-xl border border-[#e5e7eb] hover:bg-gray-100"
        >
          Ghairi
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 rounded-xl bg-[#2563EB] text-white flex items-center gap-2 shadow hover:bg-[#1e4fd8] disabled:opacity-50"
        >
          <FaSave /> {loading ? "Inaendelea kuhifadhi..." : "Hifadhi Notebook"}
        </button>
      </div>

    </div>
  </div>
);

};

export default NewNotebook;