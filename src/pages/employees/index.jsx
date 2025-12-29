import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaEdit,
  FaTrash,
  FaUserTag,
  FaLock,
  FaBriefcase,
  FaCopy,
  FaKey,
  FaSearch,
} from "react-icons/fa";

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
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-start justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
  >
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">
        {title}
      </p>
    )}
    {children}
  </div>
);

const EmployeesOverview = () => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ==============================
  // FETCH MAIN USER
  // ==============================
  useEffect(() => {
    const fetchSystemUser = async () => {
      try {
        setLoadingUser(true);
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authUser) throw new Error("No authenticated user found.");

        const { data, error } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (error) throw error;

        setUser(data || null);
      } catch (err) {
        console.error(err);
        toast.error(err.message);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchSystemUser();
  }, []);

  // ==============================
  // FETCH EMPLOYEES
  // ==============================
  const fetchEmployees = async () => {
    if (!user?.customer_registration_no) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id, name, email, phone, role, position, active, password, permissions, office_id, created_at"
        )
        .eq("office_id", user.customer_registration_no)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch employees: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  // ==============================
  // REALTIME SUBSCRIPTION (Supabase v2)
  // ==============================
  useEffect(() => {
    if (!user?.customer_registration_no) return;

    const channel = supabase
      .channel("employees_channel")
      .on(
        "postgres_changes",
        {
          event: "*", // listen for INSERT, UPDATE, DELETE
          schema: "public",
          table: "employees",
          filter: `office_id=eq.${user.customer_registration_no}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEmployees(prev => [payload.new, ...prev]);
            toast.success(`New employee added: ${payload.new.name}`);
          }
          if (payload.eventType === "UPDATE") {
            setEmployees(prev =>
              prev.map(emp => emp.id === payload.new.id ? payload.new : emp)
            );
          }
          if (payload.eventType === "DELETE") {
            setEmployees(prev => prev.filter(emp => emp.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ==============================
  // DELETE EMPLOYEE
  // ==============================
  const handleDeleteEmployee = async (id) => {
    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
      setEmployees(prev => prev.filter(e => e.id !== id));
      toast.success("Employee deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete: " + err.message);
    }
  };

  // ==============================
  // COPY PASSWORD
  // ==============================
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Password copied!");
  };

  // ==============================
  // FILTERED EMPLOYEES
  // ==============================
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (emp.phone?.replace(/\s+/g, "").includes(searchQuery.replace(/\s+/g, "")) || false);

      const matchesRole = roleFilter ? emp.role === roleFilter : true;
      const matchesStatus =
        statusFilter === "active" ? emp.active :
        statusFilter === "inactive" ? !emp.active :
        true;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, roleFilter, statusFilter]);

  // ==============================
  // ANALYTICS
  // ==============================
  const totalEmployees = filteredEmployees.length;
  const activeEmployees = filteredEmployees.filter(e => e.active).length;
  const inactiveEmployees = filteredEmployees.filter(e => !e.active).length;

  // ==============================
  // UI COMPONENTS
  // ==============================
  // Shared Card Components (same as Customers)


  if (loadingUser || loading) {
    return <div className="p-6 animate-pulse text-gray-500">Loading employees...</div>;
  }

  // ==============================
// RENDER
// ==============================
return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Kichwa */}
      <CustomCard title="Wafanyakazi">
        <h1 className="text-3xl font-bold text-[#2563EB]">
          Wafanyakazi – {user?.office_name}
        </h1>
        <p className="text-gray-500 text-sm">
          Simamia wafanyakazi wote hapa. Tafuta, chuja, hariri, au ona profaili.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Link to="new" className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#d63a3a] flex items-center gap-2 shadow">
            + Ongeza Mfanyakazi Mpya
          </Link>
        </div>
      </CustomCard>

      {/* Takwimu */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Wafanyakazi Wote" value={totalEmployees} />
        <SummaryCard title="Wafanyakazi Walioko Hai" value={activeEmployees} />
        <SummaryCard title="Wafanyakazi Waliokosa" value={inactiveEmployees} />
      </div>

      {/* Vichujio na Tafutaji */}
      <CustomCard title="Vichujio na Tafutaji">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tafuta kwa jina, barua pepe au simu"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#2563EB]">
            <option value="">Majukumu Yote</option>
            {[...new Set(employees.map(e => e.role))].sort().map(role => (
              <option key={role}>{role}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#2563EB]">
            <option value="">Hali Zote</option>
            <option value="active">Hai</option>
            <option value="inactive">Hali Haikufanyika</option>
          </select>
        </div>
      </CustomCard>

      {/* Orodha ya Wafanyakazi */}
      <CustomCard title="Orodha ya Wafanyakazi">
        {filteredEmployees.length === 0 ? (
          <p className="text-gray-600">Hakuna wafanyakazi waliopatikana.</p>
        ) : (
          <div className="grid gap-4">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className="bg-white border border-[#e5e7eb] rounded-[4px] p-4 transition-all duration-200 hover:bg-[#fdfdfd] transform hover:-translate-y-[2px] shadow w-full">
                {/* Maeneo & Vitendo */}
                <div className="flex items-center gap-3 mb-3">
                  <FaUser className="text-[#2563EB]" />
                  <div>
                    <p className="text-gray-500 text-sm">Jina</p>
                    <p className="font-semibold text-gray-700">{emp.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <FaUserTag className="text-[#2563EB]" />
                  <div>
                    <p className="text-gray-500 text-sm">Jukumu</p>
                    <p className="capitalize font-semibold text-gray-700">{emp.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <FaBriefcase className="text-[#2563EB]" />
                  <div>
                    <p className="text-gray-500 text-sm">Cheo</p>
                    <p className="capitalize font-semibold text-gray-700">{emp.position || "-"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <FaEnvelope className="text-[#2563EB]" />
                  <div>
                    <p className="text-gray-500 text-sm">Barua Pepe</p>
                    <p className="text-gray-700">{emp.email || "-"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <FaPhone className="text-[#2563EB]" />
                  <div>
                    <p className="text-gray-500 text-sm">Simu</p>
                    <p className="text-gray-700">{emp.phone || "-"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <FaLock className="text-[#2563EB]" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div>
                      <p className="text-gray-500 text-sm">Nywila</p>
                      <p className="font-mono bg-[#fff5f5] px-2 py-1 rounded border border-[#ffe2e2] inline-block">{emp.password || "-"}</p>
                    </div>
                    {emp.password && (
                      <button onClick={() => handleCopy(emp.password)} className="bg-[#2563EB] text-white px-3 py-1 rounded-lg hover:bg-[#d63a3a] flex items-center gap-1 shadow">
                        <FaCopy /> Nakili
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <FaKey className="text-[#2563EB] mt-1" />
                  <div>
                    <p className="text-gray-500 text-sm">Idhini</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {emp.permissions?.length > 0 ? emp.permissions.map((perm, idx) => (
                        <span key={idx} className="bg-[#fee2e2] text-[#2563EB] text-xs px-2 py-1 rounded-full">{perm}</span>
                      )) : (
                        <span className="text-gray-400 text-sm">Hakuna idhini</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-gray-500 text-sm">Hali:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${emp.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                    {emp.active ? "Hai" : "Hali Haikufanyika"}
                  </span>
                </div>

                <div className="flex gap-3 mt-4">
                  <Link to={`${emp.id}`}>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow">
                      <FaUser /> Profaili
                    </button>
                  </Link>
                  <Link to={`edit/${emp.id}`}>
                    <button className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#d63a3a] flex items-center gap-2 shadow">
                      <FaEdit /> Hariri
                    </button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 flex items-center gap-2 shadow">
                      <FaTrash /> Futa
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">Thibitisha Kufuta</AlertDialogTitle>
                        <AlertDialogDescription>
                          Una hakika unataka kufuta:<br /><strong>{emp.name}</strong>?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Ghairi</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => handleDeleteEmployee(emp.id)}>
                          <FaTrash className="mr-2" /> Futa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

              </div>
            ))}
          </div>
        )}
      </CustomCard>

    </div>
  </div>
);

};

export default EmployeesOverview;
