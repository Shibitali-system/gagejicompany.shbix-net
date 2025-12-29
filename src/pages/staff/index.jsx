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


const EmployeesOverview = () => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

const handleDeleteEmployee = async (id) => {
  try {
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", id);

    if (error) throw error;

    setEmployees((prev) => prev.filter((e) => e.id !== id));
    toast.success("Employee deleted successfully!");
  } catch (err) {
    console.error(err);
    toast.error("Failed to delete: " + err.message);
  }
};


  // Load system user
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
          .single();
        if (error) throw error;

        setUser(data);
      } catch (err) {
        console.error(err);
        toast.error(err.message);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchSystemUser();
  }, []);

  // Load employees
  useEffect(() => {
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
    fetchEmployees();
  }, [user]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Password copied!");
  };

  // Filtered employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (emp.phone?.includes(searchQuery) || false);

      const matchesRole = roleFilter ? emp.role === roleFilter : true;
      const matchesStatus =
        statusFilter === "active" ? emp.active :
        statusFilter === "inactive" ? !emp.active :
        true;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, roleFilter, statusFilter]);

  // Analytics
  const totalEmployees = filteredEmployees.length;
  const activeEmployees = filteredEmployees.filter(e => e.active).length;
  const inactiveEmployees = filteredEmployees.filter(e => !e.active).length;

  if (loadingUser || loading) {
    return <div className="p-6 animate-pulse text-gray-500">Loading employees...</div>;
  }

// Shared Card Components (same as Customers)
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


  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <CustomCard title="Employees">
        <h1 className="text-3xl font-bold text-[#2563EB]">
          Employees – {user?.office_name}
        </h1>
        <p className="text-gray-500 text-sm">
          Manage all employees here. Search, filter, edit, or view profiles.
        </p>

        <div className="flex flex-wrap gap-2 mt-2">
          <Link
            to="new"
            className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#d63a3a] flex items-center gap-2 shadow"
          >
            + Add New Employee
          </Link>
        </div>
      </CustomCard>

      {/* Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Total Employees" value={totalEmployees} />
        <SummaryCard title="Active Employees" value={activeEmployees} />
        <SummaryCard title="Inactive Employees" value={inactiveEmployees} />
      </div>

      {/* Search + Filters */}
      <CustomCard title="Filters & Search">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          
          {/* Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          {/* Filters */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="">All Roles</option>
            {[...new Set(employees.map(e => e.role))].map(role => (
              <option key={role}>{role}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

        </div>
      </CustomCard>

      {/* Employee List */}
<CustomCard title="Employees List">
  {filteredEmployees.length === 0 ? (
    <p className="text-gray-600">No employees found.</p>
  ) : (
    <div className="grid gap-4">

      {filteredEmployees.map(emp => (
        <div
          key={emp.id}
          className="
            bg-white border border-[#e5e7eb] rounded-[4px] p-4
            transition-all duration-200 hover:bg-[#fdfdfd]
            transform hover:-translate-y-[2px]
            shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
            w-full
          "
        >

          {/* NAME */}
          <div className="flex items-center gap-3 mb-3">
            <FaUser className="text-[#2563EB]" />
            <div>
              <p className="text-gray-500 text-sm">Name</p>
              <p className="font-semibold text-gray-700">{emp.name}</p>
            </div>
          </div>

          {/* ROLE */}
          <div className="flex items-center gap-3 mb-3">
            <FaUserTag className="text-[#2563EB]" />
            <div>
              <p className="text-gray-500 text-sm">Role</p>
              <p className="capitalize font-semibold text-gray-700">{emp.role}</p>
            </div>
          </div>

          {/* POSITION */}
          <div className="flex items-center gap-3 mb-3">
            <FaBriefcase className="text-[#2563EB]" />
            <div>
              <p className="text-gray-500 text-sm">Position</p>
              <p className="capitalize font-semibold text-gray-700">
                {emp.position || "-"}
              </p>
            </div>
          </div>

          {/* EMAIL */}
          <div className="flex items-center gap-3 mb-3">
            <FaEnvelope className="text-[#2563EB]" />
            <div>
              <p className="text-gray-500 text-sm">Email</p>
              <p className="text-gray-700">{emp.email || "-"}</p>
            </div>
          </div>

          {/* PHONE */}
          <div className="flex items-center gap-3 mb-3">
            <FaPhone className="text-[#2563EB]" />
            <div>
              <p className="text-gray-500 text-sm">Phone</p>
              <p className="text-gray-700">{emp.phone || "-"}</p>
            </div>
          </div>

          {/* PASSWORD */}
          <div className="flex items-center gap-3 mb-3">
            <FaLock className="text-[#2563EB]" />

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div>
                <p className="text-gray-500 text-sm">Password</p>
                <p className="font-mono bg-[#fff5f5] px-2 py-1 rounded border border-[#ffe2e2] inline-block">
                  {emp.password || "-"}
                </p>
              </div>

              {emp.password && (
                <button
                  onClick={() => handleCopy(emp.password)}
                  className="bg-[#2563EB] text-white px-3 py-1 rounded-lg hover:bg-[#d63a3a] flex items-center gap-1 shadow"
                >
                  <FaCopy /> Copy
                </button>
              )}
            </div>
          </div>

          {/* PERMISSIONS */}
          <div className="flex items-start gap-3 mb-3">
            <FaKey className="text-[#2563EB] mt-1" />
            <div>
              <p className="text-gray-500 text-sm">Permissions</p>

              <div className="flex flex-wrap gap-1 mt-1">
                {emp.permissions && emp.permissions.length > 0 ? (
                  emp.permissions.map((perm, idx) => (
                    <span
                      key={idx}
                      className="bg-[#fee2e2] text-[#2563EB] text-xs px-2 py-1 rounded-full"
                    >
                      {perm}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm">No permissions</span>
                )}
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-gray-500 text-sm">Status:</span>
            <span
              className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${emp.active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-600"
                }
              `}
            >
              {emp.active ? "Active" : "Inactive"}
            </span>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 mt-4">
            {/* Profile */}
            <Link to={`${emp.id}`}>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow">
                <FaUser /> Profile
              </button>
            </Link>

            {/* Edit */}
            <Link to={`edit/${emp.id}`}>
              <button className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#d63a3a] flex items-center gap-2 shadow">
                <FaEdit /> Edit
              </button>
            </Link>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 flex items-center gap-2 shadow">
                <FaTrash /> Delete
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">
                    Confirm Delete
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete:
                    <br />
                    <strong>{emp.name}</strong>?
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => handleDeleteEmployee(emp.id)}
                  >
                    <FaTrash className="mr-2" />
                    Delete
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
