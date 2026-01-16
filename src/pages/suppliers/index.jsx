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
  <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
    <Toaster position="top-right" />

    <div className="max-w-7xl mx-auto flex flex-col gap-4">

      {/* Header */}
      <div className="bg-white border rounded-md shadow p-4 sm:p-6 flex flex-col lg:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2563EB] flex items-center gap-2">
            <FaUserTie /> Manunuzi ya Bidhaa
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Simamia suppliers wako: ongeza, angalia na fuatilia malipo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            to="new"
            className="w-full sm:w-auto bg-[#2563EB] text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm hover:bg-[#d63a3a]"
          >
            <FaPlus /> Ongeza Supplier
          </Link>

          <Link
            to="payments"
            className="w-full sm:w-auto bg-white text-[#2563EB] border px-4 py-2 rounded flex items-center justify-center gap-2 text-sm hover:bg-gray-50"
          >
            <FaMoneyBillWave /> Malipo
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow p-3 flex flex-col lg:flex-row gap-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {["all", "today", "week", "month", "year"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded border ${
                filterType === type
                  ? "bg-[#2563EB] text-white"
                  : "bg-white"
              }`}
            >
              {type === "all"
                ? "Zote"
                : type === "today"
                ? "Leo"
                : type === "week"
                ? "Wiki"
                : type === "month"
                ? "Mwezi"
                : "Mwaka"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              setFilterType("custom");
            }}
            className="border rounded px-2 py-1"
          />
          <span>hadi</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setFilterType("custom");
            }}
            className="border rounded px-2 py-1"
          />
        </div>

        <button
          onClick={exportToExcel}
          className="bg-[#2563EB] text-white px-4 py-2 rounded flex items-center gap-2 justify-center hover:bg-[#d63a3a]"
        >
          <FaFileExcel /> Excel
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded shadow flex items-center gap-2">
        <FaSearch className="text-gray-400" />
        <input
          type="text"
          placeholder="Tafuta supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-[#2563EB]"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Jumla ya Suppliers"
          value={totals.totalSuppliers}
          valueColor="text-[#2563EB]"
        />
      </div>

      {/* Delete Selected */}
      {user?.role === "admin" && (
        <AlertDialog>
          <AlertDialogTrigger
            disabled={!selectedSuppliers.length}
            className={`self-start px-4 py-2 rounded text-sm flex items-center gap-2 ${
              selectedSuppliers.length
                ? "bg-[#2563EB] text-white hover:bg-[#d63a3a]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <FaTrash /> Futa ({selectedSuppliers.length})
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#2563EB]">
                Thibitisha Kufuta
              </AlertDialogTitle>
              <AlertDialogDescription>
                Unataka kufuta suppliers {selectedSuppliers.length}? Hatua hii haiwezi kurudishwa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ghairi</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                className="bg-[#2563EB] text-white hover:bg-[#d63a3a]"
              >
                Futa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#2563EB] text-white">
            <tr>
              {user?.role === "admin" && <th className="p-2"></th>}
              <th className="p-2 text-left">Jina</th>
              <th className="p-2 text-left hidden sm:table-cell">Mtu</th>
              <th className="p-2 text-left">Simu</th>
              <th className="p-2 text-left hidden md:table-cell">Email</th>
              <th className="p-2 text-center">Vitendo</th>
            </tr>
          </thead>

          <tbody>
            {filteredSuppliers.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                {user?.role === "admin" && (
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.includes(s.id)}
                      onChange={() => handleSelectSupplier(s.id)}
                    />
                  </td>
                )}
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2 hidden sm:table-cell">{s.contact_person || "-"}</td>
                <td className="p-2">{s.phone || "-"}</td>
                <td className="p-2 hidden md:table-cell">{s.email || "-"}</td>
                <td className="p-2 flex gap-2 justify-center">
                  <Link
                    to={`${s.id}`}
                    className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs"
                  >
                    Angalia
                  </Link>
                  <Link
                    to={`edit/${s.id}`}
                    className="text-[#2563EB] bg-gray-100 px-2 py-1 rounded text-xs"
                  >
                    Hariri
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  </div>
);



};

export default SuppliersIndex;
