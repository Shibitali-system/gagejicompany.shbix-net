import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  FaSearch,
  FaFileExcel,
  FaPlus,
  FaTrash,
  FaUserTie,
  FaMoneyBillWave,
  FaPhoneAlt,
} from "react-icons/fa";
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

// Card Components
const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <div className="w-full">{children}</div>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-2 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">{title}</p>}
    <div className="w-full">{children}</div>
  </div>
);

const SuppliersIndex = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // 👈 DEFAULT = ALL
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [user, setUser] = useState(null);

const [selectedSuppliers, setSelectedSuppliers] = useState([]);
const [checkAll, setCheckAll] = useState(false);

const handleSelectSupplier = (id) => {
  setSelectedSuppliers((prev) =>
    prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
  );
};

const handleCheckAll = () => {
  if (checkAll) {
    setSelectedSuppliers([]);
  } else {
    setSelectedSuppliers(suppliers.map((s) => s.id));
  }
  setCheckAll(!checkAll);
};

const handleDeleteSelected = async () => {
  if (selectedSuppliers.length === 0) return;

  try {
    // If supplier has foreign key in purchases, prevent delete
    const { data: purchases } = await supabase
      .from("purchases")
      .select("supplier_id")
      .in("supplier_id", selectedSuppliers);

    if (purchases?.length > 0) {
      toast.error("Cannot delete supplier who has purchase records.");
      return;
    }

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .in("id", selectedSuppliers);

    if (error) throw error;

    setSuppliers((prev) =>
      prev.filter((s) => !selectedSuppliers.includes(s.id))
    );

    setSelectedSuppliers([]);
    setCheckAll(false);

    toast.success("Suppliers deleted successfully.");
  } catch (err) {
    toast.error("Delete failed: " + err.message);
  }
};


  // 🧩 Load current user (admin/employee simplified)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("No authenticated user");

        const { data: sysUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (sysUser) {
          setUser({
            id: sysUser.id,
            name: sysUser.customer_name,
            office_id: sysUser.customer_registration_no,
            role: "admin",
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
            id: employee.id,
            name: employee.name,
            office_id: employee.office_id,
            role: "employee",
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user.");
      }
    };
    fetchUser();
  }, []);

  // 🧾 Fetch suppliers
  useEffect(() => {
    if (!user?.office_id) return;
    fetchSuppliers();
  }, [user, filterType, customFrom, customTo, searchTerm]);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let fromDate, toDate;

      // 👉 DEFAULT: ALL = No date filtering
      if (filterType !== "all") {
        switch (filterType) {
          case "today":
            fromDate = new Date(now.setHours(0, 0, 0, 0));
            toDate = new Date(now.setHours(23, 59, 59, 999));
            break;
          case "week":
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            fromDate = new Date(now.setDate(diff));
            fromDate.setHours(0, 0, 0, 0);
            toDate = new Date();
            break;
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
        }
      }

      let query = supabase
        .from("suppliers")
        .select("*")
        .eq("office_id", user.office_id)
        .order("created_at", { ascending: false });

      // 💚 APPLY DATE RANGE ONLY IF NOT "ALL"
      if (filterType !== "all" && fromDate && toDate) {
        query = query
          .gte("created_at", fromDate.toISOString())
          .lte("created_at", toDate.toISOString());
      }

      if (searchTerm.trim()) {
        query = query.or(
          `name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      setSuppliers(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch suppliers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filtered results
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    const term = searchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.contact_person?.toLowerCase().includes(term) ||
        s.phone?.includes(term) ||
        s.email?.toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  const totals = useMemo(() => {
    return { totalSuppliers: filteredSuppliers.length };
  }, [filteredSuppliers]);

  // 📤 Export Excel
  const exportToExcel = () => {
    if (!filteredSuppliers.length) {
      toast.error("No suppliers to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      filteredSuppliers.map((s) => ({
        Name: s.name,
        "Contact Person": s.contact_person || "-",
        Phone: s.phone || "-",
        Email: s.email || "-",
        Notes: s.notes || "-",
        "Created By": s.created_by || "-",
        "Date Added": new Date(s.created_at).toLocaleString(),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    XLSX.writeFile(workbook, `suppliers_${new Date().toISOString()}.xlsx`);
  };

  if (!user)
    return <p className="p-6 text-gray-600">Loading user info...</p>;

  // ---------------------- Summary Card Component ----------------------
const SummaryCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
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
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto flex flex-col gap-4">

      {/* Header */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] shadow p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Title + Description */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] flex items-center gap-2">
            <FaUserTie /> Usimamizi wa Wauzaji
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Simamia wauzaji wako: ongeza wauzaji wapya, fuatilia malipo, na angalia maelezo ya wauzaji.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
          <Link
            to="new"
            className="bg-[#2563EB] text-white border border-[#e5e7eb] rounded-[4px] px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] hover:bg-[#d63a3a] transition-all duration-200 font-sans text-sm"
          >
            <FaPlus /> Ongeza Muuza Mpya
          </Link>

          <Link
            to="payments"
            className="
              bg-white text-[#2563EB] border border-[#e5e7eb] rounded-[4px]
              px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
              hover:bg-[#fdfdfd] transition-all duration-200 font-sans text-sm
            "
          >
            <FaMoneyBillWave /> Lipa Malipo
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-white rounded-[4px] p-3 shadow text-sm">
        <button
          className={`px-3 py-1 rounded-[4px] font-medium ${filterType === "all" ? "bg-[#2563EB] text-white" : "bg-white border"}`}
          onClick={() => setFilterType("all")}
        >
          Zote
        </button>

        {["today", "week", "month", "year"].map((type) => (
          <button
            key={type}
            className={`px-3 py-1 rounded-[4px] font-medium ${filterType === type ? "bg-[#2563EB] text-white" : "bg-white border"}`}
            onClick={() => setFilterType(type)}
          >
            {type === "today" ? "Leo" : type === "week" ? "Wiki Hii" : type === "month" ? "Mwezi Huu" : "Mwaka Huu"}
          </button>
        ))}

        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              setFilterType("custom");
            }}
            className="border px-2 py-1 rounded-[4px] text-sm"
          />
          <span className="text-sm">hadi</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setFilterType("custom");
            }}
            className="border px-2 py-1 rounded-[4px] text-sm"
          />
        </div>

        <button
          onClick={exportToExcel}
          className="bg-[#2563EB] text-white border border-[#e5e7eb] rounded-[4px] px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] hover:bg-[#d63a3a] transition-all duration-200 font-sans text-sm"
        >
          <FaFileExcel /> Hamisha Excel
        </button>
        <p className="text-gray-500 text-xs mt-1">Vidokezo: Hamisha orodha ya wauzaji kwa Excel kwa matumizi nje ya mtandao.</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-[4px] shadow">
        <FaSearch className="text-gray-400" />
        <input
          type="text"
          placeholder="Tafuta kwa jina, mtu wa mawasiliano au simu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-[4px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <SummaryCard title="Jumla ya Wauzaji" value={totals.totalSuppliers} valueColor="text-[#2563EB]" />
      </div>

      {/* DELETE SELECTED BUTTON */}
      {user?.role === "admin" && (
        <AlertDialog>
          <AlertDialogTrigger
            disabled={selectedSuppliers.length === 0}
            className={`px-3 py-2 rounded-[4px] flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] text-sm font-medium transition-all duration-200 font-sans ${
              selectedSuppliers.length === 0
                ? "bg-white text-[#2563EB] border border-[#e5e7eb] cursor-not-allowed"
                : "bg-[#2563EB] text-white hover:bg-[#d63a3a]"
            }`}
          >
            <FaTrash /> Futa Waliochaguliwa
            {selectedSuppliers.length > 0 && (
              <span className="bg-white text-[#2563EB] px-2 py-0.5 rounded-md text-xs font-semibold">
                {selectedSuppliers.length}
              </span>
            )}
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#2563EB]">Thibitisha Kufuta</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                Una uhakika unataka kufuta <b>{selectedSuppliers.length} muuza(s)</b> kwa kudumu? <br />
                Hatua hii haiwezi kurudishwa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel className="px-3 py-1 rounded-[4px] border text-sm">Ghairi</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                className="px-3 py-1 rounded-[4px] bg-[#2563EB] text-white hover:bg-[#d63a3a] text-sm flex items-center gap-1 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] transition-all duration-200 font-sans"
              >
                <FaTrash /> Futa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-gray-600 text-sm">Inapakia wauzaji...</p>
      ) : error ? (
        <p className="text-red-600 font-semibold text-sm">{error}</p>
      ) : suppliers.length === 0 ? (
        <p className="text-gray-600 text-sm">Hakuna wauzaji waliopatikana.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-[4px] shadow">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
              <tr>
                {user?.role === "admin" && (
                  <th className="px-3 py-2 text-center">
                    <input type="checkbox" checked={checkAll} onChange={handleCheckAll} />
                  </th>
                )}
                <th className="px-3 py-2 text-left">Jina</th>
                <th className="px-3 py-2 text-left">Mtu wa Mawasiliano</th>
                <th className="px-3 py-2 text-left">Simu</th>
                <th className="px-3 py-2 text-left">Barua Pepe</th>
                <th className="px-3 py-2 text-left">Maelezo</th>
                <th className="px-3 py-2 text-left">Iliundwa Na</th>
                <th className="px-3 py-2 text-left">Tarehe ya Kuongezwa</th>
                <th className="px-3 py-2 text-center">Vitendo</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="border-b hover:bg-[#ffecec] transition-colors">
                  {user?.role === "admin" && (
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.includes(s.id)}
                        onChange={() => handleSelectSupplier(s.id)}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2">{s.contact_person || "-"}</td>
                  <td className="px-3 py-2">{s.phone || "-"}</td>
                  <td className="px-3 py-2">{s.email || "-"}</td>
                  <td className="px-3 py-2 truncate max-w-xs" title={s.notes}>{s.notes || "-"}</td>
                  <td className="px-3 py-2">{s.created_by || "-"}</td>
                  <td className="px-3 py-2">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-center flex justify-center gap-2">
                    <Link
                      to={`${s.id}`}
                      className="bg-blue-100 text-blue-600 px-2 py-1 rounded-[4px] hover:bg-blue-200 flex items-center gap-1 text-sm"
                    >
                      <FaSearch /> Angalia
                    </Link>
                    <Link
                      to={`edit/${s.id}`}
                      className="bg-[#efefef] text-[#2563EB] px-2 py-1 rounded-[4px] hover:bg-[#ffecec] flex items-center gap-1 text-sm"
                    >
                      <FaUserTie /> Hariri
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

export default SuppliersIndex;
