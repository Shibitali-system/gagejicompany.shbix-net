import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../../supabaseClient";
import { FaSearch, FaEye, FaPlus, FaExchangeAlt, FaFileExcel, FaTrash } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";




const statusOptions = ["Pending", "Already Paid", "Rejected by Customer"];

const ProformerIndex = () => {
  const [proformers, setProformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [statusUpdateId, setStatusUpdateId] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedProformers, setSelectedProformers] = useState([]);


const handleDeleteSelected = async () => {
  try {
    const { error } = await supabase
      .from("proformer")
      .delete()
      .in("id", selectedProformers);

    if (error) throw error;

    toast.success("Deleted successfully!");
    setSelectedProformers([]);
    fetchProformers();
  } catch (err) {
    toast.error(err.message);
  }
};


  // Load current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadingUser(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: mainUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();
        if (mainUser) return setUser({ ...mainUser, role: "admin", permissions: mainUser.permissions || ["view_all_sales"] });

        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();
        if (employee) return setUser({ ...employee, role: "employee", permissions: employee.permissions || ["view_own_proformers"] });
      } catch(err){ 
        console.error(err); 
        toast.error("Failed to load user"); 
      } finally { 
        setLoadingUser(false); 
      }
    };
    fetchUser();
  }, []);

  // Fetch proformers whenever filters change
  useEffect(() => { if(user?.id) fetchProformers(); }, [user, searchTerm, filterType, customFrom, customTo, page]);

  const fetchProformers = async () => {
    setLoading(true); setError(null);
    try {
      let fromDate, toDate;
      const now = new Date();
      switch(filterType){
        case "today": fromDate=new Date(now.setHours(0,0,0,0)); toDate=new Date(now.setHours(23,59,59,999)); break;
        case "week": const d = now.getDay(); const diff= now.getDate()-d+(d===0?-6:1); fromDate=new Date(now.setDate(diff)); fromDate.setHours(0,0,0,0); toDate=new Date(); break;
        case "month": fromDate=new Date(now.getFullYear(),now.getMonth(),1); fromDate.setHours(0,0,0,0); toDate=new Date(); break;
        case "year": fromDate=new Date(now.getFullYear(),0,1); fromDate.setHours(0,0,0,0); toDate=new Date(); break;
        case "custom": 
          if(customFrom && customTo){ 
            fromDate=new Date(customFrom); fromDate.setHours(0,0,0,0); 
            toDate=new Date(customTo); toDate.setHours(23,59,59,999);
          } 
          break;
      }

      let query = supabase
        .from("proformer")
        .select("*", { count: 'exact' })
        .order("created_at",{ascending:false})
        .range((page-1)*perPage, page*perPage-1);

      if(user.role==="employee" && !user.permissions.includes("view_all_sales")) query = query.eq("seller_id", user.id);
      else if(user.role==="admin") query = query.eq("office_id", user.office_id);

      if(fromDate && toDate) query=query.gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString());
      if(searchTerm.trim()) query=query.or(`id::text.ilike.%${searchTerm}%,comment.ilike.%${searchTerm}%`);

      const { data, error, count } = await query;
      if(error) throw error;
      setTotalCount(count);

      // Fetch Customer names
      const customerIds = [...new Set(data.map(d => d.customer_id))];
      const { data: customersData } = await supabase
        .from("customers")
        .select("id,name")
        .in("id", customerIds);
      const customerMap = Object.fromEntries(customersData?.map(c => [c.id, c.name]) || []);

      // Fetch seller names
      const systemIds=[...new Set(data.filter(d=>d.seller_type==="system").map(d=>d.seller_id))];
      const employeeIds=[...new Set(data.filter(d=>d.seller_type==="employee").map(d=>d.seller_id))];
      const { data: systemSellers } = await supabase.from("systems_users").select("id,customer_name").in("id", systemIds);
      const { data: employeeSellers } = await supabase.from("employees").select("id,name").in("id", employeeIds);
      const systemMap=Object.fromEntries(systemSellers?.map(s=>[s.id,s.customer_name])||[]);
      const empMap=Object.fromEntries(employeeSellers?.map(e=>[e.id,e.name])||[]);

      // Fetch status history
      const proformerIds = data.map(d => d.id);
      const { data: historyData } = await supabase
        .from("proformer_status_history")
        .select("*")
        .in("proformer_id", proformerIds)
        .order("updated_at", { ascending: true });

      const historyMap = {};
      const userIds = [...new Set(historyData.map(h => h.updated_by).filter(Boolean))];
      const { data: users } = await supabase.from("systems_users").select("id, customer_name").in("id", userIds);
      const usersMap = Object.fromEntries(users.map(u => [u.id, u.customer_name]));

      historyData.forEach(h => {
        if (!historyMap[h.proformer_id]) historyMap[h.proformer_id] = [];
        historyMap[h.proformer_id].push({ ...h, updated_by_name: usersMap[h.updated_by] || "Unknown" });
      });

      setProformers(data.map(d => ({
        ...d,
        customer_name: customerMap[d.customer_id] || "-",
        seller_name: d.seller_type==="system"?systemMap[d.seller_id]||"-":empMap[d.seller_id]||"-",
        status_history: historyMap[d.id] || [],
      })));

    } catch(err){ 
      console.error(err); 
      setError(err.message); 
    } finally{ 
      setLoading(false); 
    }
  };

  const filteredProformers = useMemo(()=> {
    if(!searchTerm.trim()) return proformers;
    const term = searchTerm.toLowerCase();
    return proformers.filter(p=>p.id.toString().includes(term) || (p.comment?.toLowerCase().includes(term)) || (p.customer_name?.toLowerCase().includes(term)) || (p.seller_name?.toLowerCase().includes(term)));
  }, [proformers, searchTerm]);

  const handleStatusUpdate = async (id) => {
    if(!newStatus) return toast.error("Select new status");
    try{
      const { error } = await supabase.from("proformer")
        .update({ status: newStatus, status_comment: statusComment, status_updated_by: user.id })
        .eq("id", id);
      if(error) throw error;
      await supabase.from("proformer_status_history").insert({ proformer_id: id, status: newStatus, comment: statusComment, updated_by: user.id });
      toast.success("Status updated");
      setStatusUpdateId(null); setNewStatus(""); setStatusComment("");
      fetchProformers();
    }catch(err){ toast.error(err.message); }
  };

  const exportExcel = () => {
    if(proformers.length===0){ toast.error("No data"); return; }
    const ws=XLSX.utils.json_to_sheet(proformers.map((p,index)=>({
      SN: index+1,
      Customer:p.customer_name, 
      Seller:p.seller_name, 
      Office:p.office_name, 
      Status:p.status, 
      Comment:p.status_comment||p.comment, 
      CreatedAt:p.created_at
    })));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Proformers");
    XLSX.writeFile(wb,`proformers_${new Date().toISOString()}.xlsx`);
  };

  const totalPages = Math.ceil(totalCount/perPage);
  if(loadingUser) return <p className="p-6">Loading user...</p>;

  // ---------------------- Summary / Info Card Component ----------------------
const InfoCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4
      flex flex-col items-center justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
  </div>
);

return (
  <div className="min-h-screen p-4 sm:p-6 bg-gray-50">
    <Toaster position="top-right" />

    <div className="max-w-7xl mx-auto space-y-6">

      {/* Kadi ya Kichwa */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      flex flex-col md:flex-row items-start md:items-center justify-between gap-4
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB]">Orodha ya Proformer</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vidokezo: Tumia vichujio kupunguza matokeo. Bonyeza proformer ili kuona maelezo, sasisha hali, au fanya vitendo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="new" className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#e03636] flex items-center gap-2 shadow-sm">
            <FaPlus /> Unda Proformer
          </Link>
          <button onClick={exportExcel} className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#e03636] flex items-center gap-2 shadow-sm">
            <FaFileExcel /> Hamisha Excel
          </button>
        </div>
      </div>

      {/* Kadi ya Vichujio na Utafutaji */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Vichujio */}
          <div className="flex items-center gap-2 flex-wrap">
            {["today","week","month","year","custom"].map(ft => (
              <button key={ft} onClick={() => setFilterType(ft)}
                      className={`px-3 py-1 rounded-xl border ${filterType===ft ? "bg-[#2563EB] text-white" : "bg-white"}`}>
                {ft.charAt(0).toUpperCase() + ft.slice(1)}
              </button>
            ))}
            {filterType==="custom" && <>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="border px-2 py-1 rounded"/>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="border px-2 py-1 rounded"/>
            </>}
          </div>

          {/* Utafutaji */}
          <div className="flex items-center gap-2 mt-2 lg:mt-0">
            <FaSearch className="text-gray-400" />
            <input type="text" placeholder="Tafuta..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                   className="border px-3 py-1 rounded w-full lg:w-auto"/>
          </div>
        </div>
      </div>

      {/* Kadi ya Vitendo vya Pamoja */}
      {user?.role === "admin" && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={selectedProformers.length === 0}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition-all
                  ${selectedProformers.length === 0 ? "bg-red-200 cursor-not-allowed text-gray-600" : "bg-[#2563EB] text-white hover:bg-[#e03636]"}`}>
                <FaTrash /> Futa Zilizochaguliwa
                {selectedProformers.length > 0 && (
                  <span className="bg-white text-[#2563EB] px-2 py-0.5 rounded-lg text-xs font-semibold">
                    {selectedProformers.length}
                  </span>
                )}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[12px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#2563EB] flex items-center gap-2">
                  <FaTrash /> Thibitisha Kufutwa
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Una uhakika unataka kufuta <strong>{selectedProformers.length}</strong> proformer waliyochaguliwa? Kitendo hiki hakiwezi kubadilishwa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl border px-4 py-2">Ghairi</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected} className="bg-[#2563EB] text-white rounded-xl hover:bg-[#e03636] px-4 py-2">
                  Ndiyo, Futa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Kadi ya Jedwali */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                      transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] active:translate-y-[1px]
                      overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[#2563EB] text-white">
            <tr>
              <th className="px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedProformers.length === filteredProformers.length && filteredProformers.length > 0}
                  onChange={e => setSelectedProformers(e.target.checked ? filteredProformers.map(p=>p.id) : [])}
                />
              </th>
              <th className="px-3 py-3 text-left">SN</th>
              <th className="px-3 py-3 text-left">Mteja</th>
              <th className="px-3 py-3 text-left">Muuzaji</th>
              <th className="px-3 py-3 text-left">Ofisi</th>
              <th className="px-3 py-3 text-left">Hali</th>
              <th className="px-3 py-3 text-left">Maoni</th>
              <th className="px-3 py-3 text-left">Imeundwa</th>
              <th className="px-3 py-3 text-center">Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center p-4">Inapakia...</td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="text-center text-red-600 p-4">{error}</td></tr>
            ) : filteredProformers.length===0 ? (
              <tr><td colSpan={9} className="text-center p-4">Hakuna proformer waliopatikana.</td></tr>
            ) : (
              filteredProformers.map((p,index) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-[#fdeeee]">
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedProformers.includes(p.id)}
                      onChange={e => setSelectedProformers(
                        e.target.checked
                          ? [...selectedProformers, p.id]
                          : selectedProformers.filter(id => id !== p.id)
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">{(page-1)*perPage + index + 1}</td>
                  <td className="px-3 py-2">{p.customer_name || "-"}</td>
                  <td className="px-3 py-2">{p.seller_name}</td>
                  <td className="px-3 py-2">{p.office_name || "-"}</td>
                  <td className="px-3 py-2">
                    {p.status || "-"}
                    {p.status_history.length > 0 && (
                      <details className="mt-1 text-xs text-gray-600">
                        <summary className="cursor-pointer">Historia</summary>
                        <ul className="pl-3">
                          {p.status_history.map(h => (
                            <li key={h.id}>
                              {new Date(h.updated_at).toLocaleString()} - {h.status} {h.comment ? `(${h.comment})` : ""} - na {h.updated_by_name}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                  <td className="px-3 py-2">{p.status_comment || p.comment || "-"}</td>
                  <td className="px-3 py-2">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-center flex flex-col sm:flex-row gap-2 justify-center items-center">
                    <Link to={`${p.id}`} className="text-[#2563EB] hover:underline flex items-center gap-1"><FaEye/> Angalia</Link>
                    {statusUpdateId===p.id ? (
                      <div className="flex flex-col gap-1">
                        <select value={newStatus} onChange={e=>setNewStatus(e.target.value)} className="border px-2 py-1 rounded">
                          <option value="">Chagua hali</option>
                          {statusOptions.map(s=> <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="text" value={statusComment} onChange={e=>setStatusComment(e.target.value)} placeholder="Maoni (hiari)" className="border px-2 py-1 rounded"/>
                        <button onClick={()=>handleStatusUpdate(p.id)} className="bg-[#2563EB] text-white px-2 py-1 rounded">Hifadhi</button>
                        <button onClick={()=>setStatusUpdateId(null)} className="bg-gray-300 px-2 py-1 rounded">Ghairi</button>
                      </div>
                    ) : (
                      <button onClick={()=>setStatusUpdateId(p.id)} className="bg-[#2563EB] text-white px-2 py-1 rounded flex items-center gap-1"><FaExchangeAlt/> Badilisha Hali</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ukurasa / Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 border rounded disabled:opacity-50">Kabla</button>
        <span className="px-3 py-1">{page} / {totalPages}</span>
        <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 border rounded disabled:opacity-50">Ifuatayo</button>
      </div>

    </div>
  </div>
);

};

export default ProformerIndex;
