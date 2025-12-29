import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaSearch, FaEye, FaPlus, FaFileExcel } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

const SummaryCard = ({ title, value }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col items-center justify-center shadow font-sans w-full">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className="text-xl font-semibold mt-1 text-[#2563EB]">{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col items-start justify-center shadow font-sans w-full">
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">
        {title}
      </p>
    )}
    {children}
  </div>
);

const CHUNK_SIZE = 500;

const AssetsIndex = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [totals, setTotals] = useState({ totalAssets: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showInput, setShowInput] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [usersMap, setUsersMap] = useState({}); // key: auth_user_id, value: name

  // 🔹 LOAD USER (IMEBORESHWA)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("No authenticated user");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) {
          setUser({
            ...systemUser,
            role: "admin",
            auth_user_id: authUser.id,
          });
          return;
        }

        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) {
          setUser({
            ...employee,
            role: "employee",
            auth_user_id: authUser.id,
          });
          return;
        }

        throw new Error("No user account found.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user");
      }
    };

    fetchUser();
  }, []);

  // 🔹 LOAD ALL USERS FOR HISTORY
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: sysUsers } = await supabase
          .from("systems_users")
          .select("auth_user_id, customer_name");

        const { data: employees } = await supabase
          .from("employees")
          .select("auth_user_id, name");

        const map = {};
        (sysUsers || []).forEach(u => { map[u.auth_user_id] = u.customer_name; });
        (employees || []).forEach(u => { map[u.auth_user_id] = u.name; });
        setUsersMap(map);
      } catch (err) {
        console.error("Failed to load users for history", err);
      }
    };

    fetchUsers();
  }, []);

  // FETCH ASSETS
  useEffect(() => {
    if (!user?.office_id) return;
    setPage(1);
    fetchAssets(true);
  }, [user, searchTerm, usersMap]);

  const fetchAssets = async (reset = false) => {
    setLoading(true);
    setError(null);

    try {
      const offset = reset ? 0 : (page - 1) * CHUNK_SIZE;

      const { data: assetsData, error: assetsError, count } = await supabase
        .from("assets")
        .select("*", { count: "exact" })
        .eq("office_id", user.office_id)
        .ilike("name", `%${searchTerm}%`)
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (assetsError) throw assetsError;
      if (!assetsData || assetsData.length === 0) {
        setAssets([]);
        return;
      }

      const assetIds = assetsData.map(a => a.id);

      const { data: historyData, error: historyError } = await supabase
        .from("asset_quantity_history")
        .select("*")
        .in("asset_id", assetIds);

      if (historyError) throw historyError;

      const historyMap = {};
      (historyData || []).forEach(h => {
        if (!historyMap[h.asset_id]) historyMap[h.asset_id] = [];
        historyMap[h.asset_id].push(h);
      });

      const enrichedAssets = assetsData.map(a => {
        const history = historyMap[a.id] || [];

        const addedHistory = history.filter(h => h.type === "added");
        const damagedHistory = history.filter(h => h.type === "damaged");

        const totalAdded = addedHistory.reduce((sum, h) => sum + Number(h.change || 0), 0);
        const totalDamaged = damagedHistory.reduce((sum, h) => sum + Math.abs(Number(h.change || 0)), 0);

        const formatHistory = hList =>
          hList
            .map(h => {
              const name = usersMap[h.created_by] || "Unknown";
              return `${h.change}${h.comment ? ` (${h.comment})` : ""} by ${name}`;
            })
            .join(" | ");

        return {
          ...a,
          totalAdded,
          totalDamaged,
          addedHistoryText: formatHistory(addedHistory),
          damagedHistoryText: formatHistory(damagedHistory),
        };
      });

      setAssets(prev => (reset ? enrichedAssets : [...prev, ...enrichedAssets]));
      setPage(prev => (reset ? 2 : prev + 1));
      setHasMore(offset + CHUNK_SIZE < count);
      if (reset) setTotals({ totalAssets: count || 0 });

    } catch (err) {
      console.error(err);
      setError("Failed to fetch assets: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 ADD QUANTITY
  const handleAddQuantity = async (assetId, qty, comment) => {
    if (!qty || isNaN(qty)) return toast.error("Enter valid quantity");
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    try {
      await supabase
        .from("assets")
        .update({ quantity: asset.quantity + Number(qty) })
        .eq("id", assetId);

      const { error } = await supabase.from("asset_quantity_history").insert({
        asset_id: assetId,
        change: Number(qty),
        comment: comment || null,
        created_by: user.auth_user_id,
        type: "added",
      });

      if (error) throw error;

      toast.success("Quantity added successfully");
      fetchAssets(true);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  // 🔹 DAMAGED
  const handleEnterDamaged = async (assetId, qty, comment) => {
    if (!qty || isNaN(qty)) return toast.error("Enter valid quantity");
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    if (asset.quantity - qty < 0)
      return toast.error("Quantity cannot be negative");

    try {
      await supabase
        .from("assets")
        .update({ quantity: asset.quantity - Number(qty) })
        .eq("id", assetId);

      const { error } = await supabase.from("asset_quantity_history").insert({
        asset_id: assetId,
        change: -Number(qty),
        comment: comment || null,
        created_by: user.auth_user_id,
        type: "damaged",
      });

      if (error) throw error;

      toast.success("Damaged quantity recorded");
      fetchAssets(true);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  const exportToExcel = () => {
    if (!assets || assets.length === 0) {
      toast.error("No assets to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      assets.map(a => ({
        Name: a.name,
        Category: a.category,
        Quantity: a.quantity,
        Total_Added: a.totalAdded,
        Total_Damaged: a.totalDamaged,
        Added_History: a.addedHistoryText,
        Damaged_History: a.damagedHistoryText,
        Purchase_Date: a.purchase_date,
        Office: a.office_name || "-",
        Created_By: a.created_name || "-"
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
    XLSX.writeFile(
      workbook,
      `assets_export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">

        <CustomCard title="Assets">
          <h1 className="text-3xl font-bold text-[#2563EB]">Assets</h1>
          <p className="text-gray-500 text-sm">Manage all your office assets here. Add, view, or record damaged quantities.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Link to="new" className="bg-white text-[#2563EB] border px-4 py-2 rounded shadow flex items-center gap-2 hover:bg-[#f0f7ff]"><FaPlus /> Add New Asset</Link>
            <button onClick={exportToExcel} className="bg-[#2563EB] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#1d4ed8]"><FaFileExcel /> Export Excel</button>
          </div>
        </CustomCard>

        <CustomCard title="Search Assets">
          <div className="mb-2 flex items-center w-full sm:w-1/3">
            <FaSearch className="text-gray-400 mr-2" />
            <input type="text" placeholder="Search by name..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
          </div>
        </CustomCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Assets" value={totals.totalAssets} />
        </div>

        <CustomCard title="Assets List">
          {loading ? <p className="text-gray-600">Loading assets...</p> :
           error ? <p className="text-red-600 font-semibold">{error}</p> :
           assets.length === 0 ? <p className="text-gray-600">No assets found.</p> :
           <div className="overflow-x-auto w-full">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
                <tr>
                  {["Name","Category","Quantity","Total Added","Total Damaged","Added History","Damaged History","Purchase Date","Office Name","Created By","Created At","Actions"].map(th => <th key={th} className="px-2 sm:px-3 py-2 text-left">{th}</th>)}
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-2 sm:px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-2 sm:px-3 py-2">{a.category}</td>
                    <td className="px-2 sm:px-3 py-2">{a.quantity}</td>
                    <td className="px-2 sm:px-3 py-2">{a.totalAdded}</td>
                    <td className="px-2 sm:px-3 py-2">{a.totalDamaged}</td>
                    <td className="px-2 sm:px-3 py-2">{a.addedHistoryText || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{a.damagedHistoryText || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{a.purchase_date}</td>
                    <td className="px-2 sm:px-3 py-2">{a.office_name || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{a.created_name || "-"}</td>
                    <td className="px-2 sm:px-3 py-2">{a.created_at ? new Date(a.created_at).toLocaleString() : "-"}</td>
                    <td className="px-2 sm:px-3 py-2 flex flex-col gap-2">
                      <Link to={`${a.id}`} className="text-[#2563EB] hover:underline flex items-center gap-1"><FaEye /> View</Link>

                      <button onClick={()=>setShowInput(prev=>({...prev,[a.id]:{...prev[a.id], add:true}}))} className="bg-green-600 text-white px-2 py-1 rounded text-sm">Add Quantity</button>
                      {showInput[a.id]?.add && (
                        <div className="flex flex-col gap-1 mt-1">
                          <input type="number" placeholder="Qty to add" value={commentInput[a.id]?.qty || ""} onChange={e=>setCommentInput(prev=>({...prev,[a.id]:{...prev[a.id], qty:e.target.value}}))} className="border px-2 py-1 rounded text-sm" />
                          <input type="text" placeholder="Comment" value={commentInput[a.id]?.comment || ""} onChange={e=>setCommentInput(prev=>({...prev,[a.id]:{...prev[a.id], comment:e.target.value}}))} className="border px-2 py-1 rounded text-sm" />
                          <button onClick={()=>handleAddQuantity(a.id, commentInput[a.id]?.qty, commentInput[a.id]?.comment)} className="bg-green-600 text-white px-2 py-1 rounded text-sm">Submit</button>
                        </div>
                      )}

                      <button onClick={()=>setShowInput(prev=>({...prev,[a.id]:{...prev[a.id], damaged:true}}))} className="bg-red-600 text-white px-2 py-1 rounded text-sm mt-1">Enter Damaged</button>
                      {showInput[a.id]?.damaged && (
                        <div className="flex flex-col gap-1 mt-1">
                          <input type="number" placeholder="Damaged Qty" value={commentInput[a.id]?.damagedQty || ""} onChange={e=>setCommentInput(prev=>({...prev,[a.id]:{...prev[a.id], damagedQty:e.target.value}}))} className="border px-2 py-1 rounded text-sm" />
                          <input type="text" placeholder="Comment" value={commentInput[a.id]?.damagedComment || ""} onChange={e=>setCommentInput(prev=>({...prev,[a.id]:{...prev[a.id], damagedComment:e.target.value}}))} className="border px-2 py-1 rounded text-sm" />
                          <button onClick={()=>handleEnterDamaged(a.id, commentInput[a.id]?.damagedQty, commentInput[a.id]?.damagedComment)} className="bg-red-600 text-white px-2 py-1 rounded text-sm">Submit</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
          }
          {hasMore && <div className="mt-4 text-center">
            <button onClick={()=>fetchAssets(false)} className="bg-[#2563EB] text-white px-4 py-2 rounded hover:bg-[#1d4ed8]">Load More</button>
          </div>}
        </CustomCard>

      </div>
    </div>
  );
};

export default AssetsIndex;
