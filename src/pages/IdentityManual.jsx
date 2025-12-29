import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useReactToPrint } from "react-to-print";
import { toast, Toaster } from "react-hot-toast";

const IDCard = ({ data, colors, showBack }) => (
  <div
    className="id-card rounded-lg shadow-md overflow-visible flex flex-col mb-4"
    style={{
      width: "85.6mm",
      height: "53.98mm",
      backgroundColor: colors.body || "#fff",
      fontFamily: "Arial, sans-serif",
      fontSize: "10pt",
      pageBreakInside: "avoid",
    }}
  >
    {!showBack ? (
      <div className="flex flex-col h-full" style={{ backgroundColor: colors.body }}>
        <header
          className="header px-2 py-1 text-white text-center font-bold"
          style={{ backgroundColor: colors.header }}
        >
          <img
            src={data.logo_src || "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/sample-logo.png"}
            alt="Logo"
            className="h-6 mx-auto mb-1"
          />
          {data.organization_name || "YOUR OFFICE NAME"}
        </header>

        <main className="flex flex-1 p-2 bg-white">
          <div className="flex-1 text-sm space-y-1">
            <div><strong>Name:</strong> {data.staff_name || "John Doe"}</div>
            <div><strong>Employee ID:</strong> {data.staff_id || "EMP001"}</div>
            <div><strong>Department:</strong> {data.department || "Department Name"}</div>
            <div><strong>Position:</strong> {data.position || "Position"}</div>
            <div><strong>Signature:</strong></div>
          </div>

          <img
            src={data.photo_src || "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/sample-photo.png"}
            alt="Staff"
            className="w-20 h-24 object-cover rounded-md ml-2"
          />
        </main>

        <footer
          className="footer p-1 text-center text-white text-sm"
          style={{ backgroundColor: colors.header }}
        >
          STAFF ID CARD
        </footer>
      </div>
    ) : (
      <div className="flex flex-col h-full text-xs" style={{ backgroundColor: colors.body }}>
        <header className="px-2 py-1 font-bold text-white text-center" style={{ backgroundColor: colors.header }}>
          INSTRUCTIONS
        </header>
        <main className="flex-1 p-2 space-y-1 text-black">
          <ul className="list-disc list-inside space-y-1">
            <li>This ID belongs to the Office.</li>
            <li>Use this ID only for official purposes.</li>
            <li>If lost, report to HR immediately.</li>
            <li>Do not tamper with or forge this ID.</li>
          </ul>
          <div className="text-center mt-auto text-[10px]">
            Valid Until: <strong>{data.validity || "31-Dec-2025"}</strong>
          </div>
          <img
            src={data.signature_src || "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/sample-signature.png"}
            alt="Signature"
            className="mx-auto h-7 mt-1"
          />
          <div className="border-b border-black mx-auto w-3/4"></div>
          <div className="text-center mt-1 text-[10px] font-semibold">
            Authorized by: {data.authorizer || "HR Manager"}
          </div>
        </main>
        <footer className="p-1 text-center text-white text-[10px]" style={{ backgroundColor: colors.header }}>
          Contact: {data.contact_info || "hr@organization.com"}
        </footer>
      </div>
    )}
  </div>
);

const StaffIDCardPage = () => {
  const [data, setData] = useState({});
  const [colors, setColors] = useState({ header: "#004080", body: "#ffffff" });
  const [showBack, setShowBack] = useState(false);
  const [idList, setIdList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [readyToPrint, setReadyToPrint] = useState(false);

  const printRef = useRef(null);

  // Fetch logged-in user info
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
          setUserInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            office_id: systemUser.office_id,
            office_name: systemUser.office_name,
          });
          return;
        }

        toast.error("User info not found");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  // Fetch ID list after userInfo is available
  useEffect(() => {
    if (userInfo) fetchList();
  }, [userInfo]);

  async function fetchList() {
    if (!userInfo?.office_id) return;

    const { data: items, error } = await supabase
      .from("staff_id_cards")
      .select("*")
      .eq("office_id", userInfo.office_id); // filter by office

    if (!error) setIdList(items || []);
  }

  async function loadCard(id) {
    const { data: recs } = await supabase.from("staff_id_cards").select("*").eq("id", id);
    if (recs?.[0]) {
      const rec = recs[0];
      let parsedColors = {};
      try { parsedColors = rec.colors ? JSON.parse(rec.colors) : {}; } catch {}
      setData({
        ...rec,
        logo_src: rec.logo_src || "",
        photo_src: rec.photo_src || "",
        signature_src: rec.signature_src || "",
      });
      setColors(parsedColors || colors);
      setSelectedId(id);
      setShowBack(false);
    }
  }

  const handleInputChange = (key, value) => setData({ ...data, [key]: value });

  async function uploadImageToBucket(file, path) {
    const { data: uploadData, error } = await supabase.storage
      .from("id-card-images")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) return null;
    const { publicURL } = supabase.storage.from("id-card-images").getPublicUrl(path);
    return publicURL;
  }

  const handleFileUpload = async (id, file) => {
    if (!file.type.startsWith("image/")) return toast.error("Upload an image file.");
    if (file.size > 2 * 1024 * 1024) return toast.error("File too large >2MB");
    const filePath = `${data.staff_id || "temp"}/${id}-${Date.now()}.${file.name.split(".").pop()}`;
    const url = await uploadImageToBucket(file, filePath);
    if (url) setData(prev => ({ ...prev, [`${id}_src`]: url }));
  };

  useEffect(() => {
    setReadyToPrint(false);
    const timer = setTimeout(() => setReadyToPrint(true), 200);
    return () => clearTimeout(timer);
  }, [data]);

  const handleSelect = id => {
    if (id) loadCard(id);
    else { setSelectedId(null); setData({}); setColors({ header: "#004080", body: "#ffffff" }); setShowBack(false); }
  };

  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const filteredList = idList.filter(item => item.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const saveCard = async () => {
    if (!userInfo) return toast.error("User info not loaded");
    const toSave = {
      ...data,
      office_id: userInfo.office_id,
      office_name: userInfo.office_name,
      colors: JSON.stringify(colors),
    };
    const { error } = await supabase.from("staff_id_cards").upsert(toSave);
    if (error) toast.error(error.message); else { fetchList(); toast.success("Saved successfully!"); }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Toaster position="top-right" />

      {/* ID List */}
      <div className="w-64 p-4 bg-white h-screen overflow-auto border-r">
        <input
          type="text"
          placeholder="Search by name"
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); if(!e.target.value) handleSelect(null); }}
          className="w-full mb-3 p-2 border rounded"
        />
        {filteredList.length === 0 ? <div className="text-gray-500 text-sm">No matching records</div> :
          <ul>
            {filteredList.map(item => (
              <li key={item.id} className="mb-1">
                <button onClick={() => handleSelect(item.id)} className={`w-full text-left p-2 border rounded ${selectedId===item.id?'bg-blue-200':'hover:bg-gray-100'}`}>
                  <div className="font-medium">{item.staff_name || "Unnamed"}</div>
                  <div className="text-xs text-gray-500">{item.staff_id}</div>
                </button>
              </li>
            ))}
          </ul>
        }
      </div>

      {/* Card Preview */}
      <div className="flex flex-col flex-1 items-center justify-center gap-4 p-4 overflow-auto">
        <IDCard data={data} colors={colors} showBack={false} />
        <IDCard data={data} colors={colors} showBack={true} />
      </div>

      {/* Sidebar */}
      <div className="w-72 p-4 bg-gray-100 space-y-4 h-screen overflow-auto flex flex-col">
        {["organization_name","staff_name","staff_id","department","position","validity","authorizer","contact_info"].map(key => (
          <div key={key}>
            <label className="block mb-1 text-sm font-medium">{key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</label>
            <input
              value={data[key]||""}
              onChange={e=>handleInputChange(key,e.target.value)}
              placeholder={`Enter ${key.replace(/_/g,' ')}`}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        <div>
          <label className="block mb-1 text-sm font-medium">Header Color</label>
          <input type="color" value={colors.header} onChange={e=>setColors({...colors, header:e.target.value})} className="w-full h-10 cursor-pointer"/>
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Body Color</label>
          <input type="color" value={colors.body} onChange={e=>setColors({...colors, body:e.target.value})} className="w-full h-10 cursor-pointer"/>
        </div>

        {["logo","photo","signature"].map(id => (
          <div key={id}>
            <label className="block mb-1 text-sm font-medium">Upload {id}</label>
            <input type="file" accept="image/*" onChange={e=>handleFileUpload(id,e.target.files?.[0])} className="w-full"/>
            {data[`${id}_src`] && <img src={data[`${id}_src`]} alt={`${id} preview`} className="mt-2 max-h-20 object-contain border rounded"/>}
          </div>
        ))}

        <div className="mt-4 space-x-4 flex">
          <button onClick={handlePrint} disabled={!readyToPrint || !data.staff_name} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
            Print ID Card
          </button>
          <button onClick={saveCard} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded">
            Save Card
          </button>
        </div>
      </div>

      <div ref={printRef} style={{ position:'absolute', left:'-9999px', top:0, width:'85.6mm' }} aria-hidden="true">
        <IDCard data={data} colors={colors} showBack={false} />
        <IDCard data={data} colors={colors} showBack={true} />
      </div>

    </div>
  );
};

export default StaffIDCardPage;
