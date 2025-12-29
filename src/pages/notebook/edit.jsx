import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { useParams, useNavigate } from "react-router-dom";
import { FaSave, FaArrowLeft, FaThumbtack } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

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

const EditNotebook = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("systems_notebooks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Failed to load notebook");
        console.error(error);
      } else {
        setNote(data);
        setTitle(data.title);
        setContent(data.content);
        setIsPinned(data.is_pinned);
        setTags(data.tags ? data.tags.join(", ") : "");
      }
      setLoading(false);
    };

    fetchNote();
  }, [id]);

  const handleSave = async () => {
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("systems_notebooks")
      .update({
        title,
        content,
        is_pinned: isPinned,
        tags: tags ? tags.split(",").map(t => t.trim()) : null,
        updated_at: new Date()
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update notebook");
      console.error(error);
    } else {
      toast.success("Notebook updated successfully");
      
    }
    setSaving(false);
  };

  if (loading) return <p className="p-6 text-gray-500">Loading notebook...</p>;
  if (!note) return <p className="p-6 text-red-600">Notebook not found</p>;

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Kichwa */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2563EB]">Hariri Notebook</h1>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-[#2563EB]"
        >
          <FaArrowLeft /> Rudi
        </button>
      </div>

      {/* Kichwa cha Noti */}
      <Card title="Kichwa cha Notebook">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#2563EB]"
        />
      </Card>

      {/* Yaliyomo */}
      <Card title="Yaliyomo kwenye Notebook">
        <textarea
          rows={10}
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full border border-[#e5e7eb] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2563EB] resize-none"
        />
      </Card>

      {/* Ziada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Ambatisha Noti">
          <label className="flex items-center gap-2 cursor-pointer">
            <FaThumbtack className={isPinned ? "text-[#2563EB]" : "text-gray-400"} />
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
            />
            <span className="text-sm">Ambatisha noti hii</span>
          </label>
        </Card>

        <Card title="Tags (zimegawanywa kwa koma)">
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="mauzo, madeni, bidhaa"
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
          disabled={saving}
          className="px-6 py-2 rounded-xl bg-[#2563EB] text-white flex items-center gap-2 shadow hover:bg-[#1e4fd8] disabled:opacity-50"
        >
          <FaSave /> {saving ? "Inaendelea kuhifadhi..." : "Hifadhi Notebook"}
        </button>
      </div>

    </div>
  </div>
);

};

export default EditNotebook;