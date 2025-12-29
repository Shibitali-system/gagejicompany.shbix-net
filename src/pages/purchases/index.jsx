// PurchasesIndex.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { FaSearch, FaEye, FaUndo, FaFileExcel, FaPlus, FaTrash } from "react-icons/fa";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const PurchasesIndex = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
const [selectedPurchases, setSelectedPurchases] = useState([]);
const [checkAll, setCheckAll] = useState(false);

const handleSelectPurchase = (id) => {
  setSelectedPurchases((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );
};

const handleCheckAll = () => {
  if (checkAll) {
    setSelectedPurchases([]);
  } else {
    setSelectedPurchases(purchases.map((p) => p.id));
  }
  setCheckAll(!checkAll);
};

const handleDeleteSelected = async () => {
  if (selectedPurchases.length === 0) return;

  try {
    // 1️⃣ DELETE purchase_history (first!)
    const { error: histErr } = await supabase
      .from("purchase_history")
      .delete()
      .in("purchase_id", selectedPurchases);

    if (histErr) throw histErr;

    // 2️⃣ DELETE purchase_items
    const { error: itemsErr } = await supabase
      .from("purchase_items")
      .delete()
      .in("purchase_id", selectedPurchases);

    if (itemsErr) throw itemsErr;

    // 3️⃣ DELETE purchases (main table)
    const { error: purErr } = await supabase
      .from("purchases")
      .delete()
      .in("id", selectedPurchases);

    if (purErr) throw purErr;

    toast.success("Purchases deleted successfully");

    // Update UI
    setPurchases(prev => prev.filter(p => !selectedPurchases.includes(p.id)));
    setSelectedPurchases([]);
    setCheckAll(false);

  } catch (err) {
    console.error("Delete error:", err);
    toast.error("Failed to delete purchases: " + err.message);
  }
};



  // Load system user / employee (set role + office_id if available)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadingUser(true);
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        if (!authUser?.id) {
          throw new Error("No authenticated user");
        }

        // try systems_users (main/system account)
        const { data: mainUser, error: mainErr } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (mainErr) {
          console.error("systems_users lookup error:", mainErr);
        }
        if (mainUser) {
          // try to get the office identifier (customer_registration_no or office_id)
          const officeId = mainUser.customer_registration_no || mainUser.office_id || null;
          setUser({ ...mainUser, role: "admin", office_id: officeId });
          return;
        }

        // try employees
        const { data: emp, error: empErr } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (empErr) {
          console.error("employees lookup error:", empErr);
        }
        if (emp) {
          // ensure we can show office name from systems_users if available
          let officeName = null;
          if (emp.office_id) {
            const { data: officeData } = await supabase
              .from("systems_users")
              .select("customer_name, customer_registration_no")
              .eq("customer_registration_no", emp.office_id)
              .maybeSingle();
            officeName = officeData?.customer_name || null;
          }
          setUser({
            ...emp,
            role: "employee",
            office_id: emp.office_id || null,
            office_name: officeName || null,
          });
          return;
        }

        throw new Error("No matching system or employee account found.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user.");
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch purchases (and map created_by -> name)
  useEffect(() => {
    if (!user?.id) return;

    const fetchPurchases = async () => {
      setLoading(true);
      try {
        let fromDate, toDate;
        const now = new Date();

        switch (filterType) {
          case "today":
            fromDate = new Date(now);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date(now);
            toDate.setHours(23, 59, 59, 999);
            break;
          case "week": {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            fromDate = new Date(now);
            fromDate.setDate(diff);
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date();
            break;
          }
          case "month":
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            toDate = new Date();
            break;
          case "year":
            fromDate = new Date(now.getFullYear(), 0, 1);
            toDate = new Date();
            break;
          case "custom":
            if (customFrom && customTo) {
              fromDate = new Date(customFrom);
              fromDate.setHours(0, 0, 0, 0);
              toDate = new Date(customTo);
              toDate.setHours(23, 59, 59, 999);
            }
            break;
          default:
            fromDate = undefined;
            toDate = undefined;
        }

        // Build base query
        let query = supabase
          .from("purchases")
          .select("*, suppliers(name)")
          .order("created_at", { ascending: false });

        // If user is employee, restrict to created_by (employee id)
        if (user.role === "employee") {
          // created_by column is bigint referencing internal id; user.id from employees row might be bigint
          // ensure we use user.id
          query = query.eq("created_by", user.id);
        } else if (user.role === "admin" && user.office_id) {
          // Admins can be scoped to office if office_id exists on the user and in purchases
          query = query.eq("office_id", user.office_id);
        }

        // Date filter using created_at (exists on table)
        if (fromDate && toDate) {
          query = query.gte("created_at", fromDate.toISOString()).lte("created_at", toDate.toISOString());
        }

        // Search
        if (searchTerm.trim()) {
          query = query.ilike("invoice_number", `%${searchTerm.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const purchasesData = data || [];

        // Collect unique created_by ids (bigint)
        const createdByIds = [
          ...new Set(purchasesData.map((p) => p.created_by).filter((v) => v !== null && v !== undefined)),
        ];

        let employees = [];
        let systems = [];

        if (createdByIds.length > 0) {
          // Fetch employee names by id (employees.id is bigint)
          const { data: empData, error: empErr } = await supabase
            .from("employees")
            .select("id, name")
            .in("id", createdByIds);
          if (empErr) {
            console.warn("employees fetch warning:", empErr);
          } else {
            employees = empData || [];
          }

          // Fetch systems_users by id (systems_users.id assumed bigint)
          const { data: sysData, error: sysErr } = await supabase
            .from("systems_users")
            .select("id, customer_name")
            .in("id", createdByIds);
          if (sysErr) {
            console.warn("systems_users fetch warning:", sysErr);
          } else {
            systems = sysData || [];
          }
        }

        // Map created_by -> name (employee.name or systems_users.customer_name)
        const purchasesWithNames = purchasesData.map((p) => {
          const emp = employees.find((e) => String(e.id) === String(p.created_by));
          const sys = systems.find((s) => String(s.id) === String(p.created_by));
          return {
            ...p,
            created_by_name: emp?.name || sys?.customer_name || p.created_by_name || "-",
          };
        });

        setPurchases(purchasesWithNames);
      } catch (err) {
        console.error("fetch purchases error:", err);
        toast.error("Failed to fetch purchases: " + (err.message || err));
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [user, filterType, customFrom, customTo, searchTerm]);


// ---------------------- Summary Card Component ----------------------
const SummaryCard = ({ title, value, valueColor }) => (
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

  // Export to Excel
  const exportToExcel = () => {
    if (!purchases || purchases.length === 0) {
      toast.error("No purchases to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      purchases.map((p) => ({
        "Invoice #": p.invoice_number,
        Supplier: p.suppliers?.name || "-",
        "Created By": p.created_by_name || "-",
        "Total Amount": p.total_amount ?? p.total_price ?? 0,
        Date: p.created_at ? new Date(p.created_at).toLocaleString() : p.date || "-",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases");
    XLSX.writeFile(wb, `purchases_export_${new Date().toISOString()}.xlsx`);
  };

  if (loadingUser) return <p className="p-6 text-gray-600">Loading user data...</p>;

 return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      <div className="w-full">
        {/* Kadi yenye Kichwa, Maelezo, na Vitendo vya Kichwa */}
        <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow p-6 flex flex-col gap-4 items-start">
          
          {/* Kichwa na Maelekezo */}
          <div className="flex flex-col gap-2 w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB]">Rekodi za Manunuzi</h1>

            <p className="text-gray-700 text-sm">
              Angalia vocha zote za manunuzi, tafuta kwa namba ya vocha, changanya kwa tarehe, na simamia rekodi. 
              Watumiaji wa admin wanaweza kufuta manunuzi yaliyochaguliwa au kuongeza mapya. 
              Tumia vitendo ili kuangalia au kurudisha manunuzi.
            </p>
          </div>

          {/* Vitendo vya Kichwa – upande wa kushoto */}
          <div className="flex flex-wrap gap-2 w-full">
            {/* Futa Yaliyote Yaliyochaguliwa – ADMIN PEKEE */}
            {user?.role === "admin" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={selectedPurchases.length === 0}
                    className={`px-4 py-2 rounded-xl flex items-center gap-2
                    ${selectedPurchases.length === 0
                      ? "bg-red-300 cursor-not-allowed"
                      : "bg-[#2563EB] hover:bg-red-700 text-white"
                    }`}
                  >
                    <FaTrash /> Futa Yaliyote Yaliyochaguliwa
                    {selectedPurchases.length > 0 && (
                      <span className="bg-white text-[#2563EB] px-2 py-0.5 rounded-lg text-xs font-semibold">
                        {selectedPurchases.length}
                      </span>
                    )}
                  </button>
                </AlertDialogTrigger>

                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[#2563EB] flex items-center gap-2">
                      <FaTrash /> Thibitisha Kufutwa
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Futa kabisa manunuzi {selectedPurchases.length}? Hatua hii haiwezi kubadilishwa.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">
                      Ghairi
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSelected}
                      className="bg-[#2563EB] text-white rounded-xl hover:bg-red-700"
                    >
                      Ndio, Futa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Link
              to="new"
              className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-red-700 flex items-center gap-2"
            >
              <FaPlus /> Manunuzi Mpya
            </Link>

            <button
              onClick={exportToExcel}
              className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-red-700 flex items-center gap-2"
            >
              <FaFileExcel /> Hamisha Excel
            </button>
          </div>
        </div>
      </div>

      {/* Vichujio */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
          {["today", "week", "month", "year"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1 rounded-xl ${
                filterType === f ? "bg-[#2563EB] text-white" : "bg-white border"
              }`}
            >
              {f === "today" ? "Leo" : f === "week" ? "Wiki Hii" : f === "month" ? "Mwezi Huu" : "Mwaka Huu"}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              setFilterType("custom");
            }}
            className="border px-2 py-1 rounded"
          />
          <span>hadi</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setFilterType("custom");
            }}
            className="border px-2 py-1 rounded"
          />
        </div>

        <div className="flex items-center w-full sm:w-1/3">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Tafuta kwa namba ya vocha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
      </div>

      {/* Jedwali la Manunuzi */}
      {loading ? (
        <p className="text-gray-600">Inapakia manunuzi...</p>
      ) : purchases.length === 0 ? (
        <p className="text-gray-600">Hakuna manunuzi yaliyopatikana.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-[12px] shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
              <tr>
                {user?.role === "admin" && (
                  <th className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={checkAll}
                      onChange={handleCheckAll}
                    />
                  </th>
                )}
                <th className="px-2 py-2">Vocha #</th>
                <th className="px-2 py-2">Msuppliers</th>
                <th className="px-2 py-2">Aliyeingiza</th>
                <th className="px-2 py-2">Jumla ya Kiasi</th>
                <th className="px-2 py-2">Tarehe</th>
                <th className="px-2 py-2 text-center">Vitendo</th>
              </tr>
            </thead>

            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  {user?.role === "admin" && (
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedPurchases.includes(p.id)}
                        onChange={() => handleSelectPurchase(p.id)}
                      />
                    </td>
                  )}

                  <td className="px-2 py-2">{p.invoice_number}</td>
                  <td className="px-2 py-2">{p.suppliers?.name || "-"}</td>
                  <td className="px-2 py-2">{p.created_by_name || "-"}</td>
                  <td className="px-2 py-2">
                    {(p.total_amount ?? p.total_price ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2">
                    {p.created_at ? new Date(p.created_at).toLocaleString() : p.date || "-"}
                  </td>

                  <td className="px-2 py-2 text-center flex flex-col sm:flex-row justify-center gap-2">
                    <Link
                      to={`${p.id}`}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FaEye /> Angalia
                    </Link>

                    <Link
                      to={`returns?id=${p.id}`}
                      className="text-red-600 hover:underline flex items-center gap-1"
                    >
                      <FaUndo /> Rudisha
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);


};

export default PurchasesIndex;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 