import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {  
  FiHome,  
  FiUsers,  
  FiUserPlus,  
  FiFileText,  
  FiActivity,  
  FiPlus,  
  FiBell,  
  FiSettings,  
  FiLogOut,  
  FiClipboard,  
  FiTool,  
  FiBriefcase,  
  FiHeart,  
  FiAlertCircle,
  FiShield,  
  FiCpu,  
  FiBookOpen  
} from "react-icons/fi";

import {  
  FaHome,  
  FaUserMd,  
  FaBell,
  FaUserNurse,  
  FaHospitalAlt,  
  FaExclamationTriangle,  
  FaTools,  
  FaClipboardList,  
  FaFileInvoiceDollar,  
  FaRegFileAlt,  
  FaArchive,  
  FaRegClock,  
  FaUserCheck,  
  FaBoxOpen,  
  FaClinicMedical,  
  FaCogs,  
  FaQuestionCircle,  
  FaSignOutAlt,  
  FaCalendarAlt,  
  FaFlask,  
  FaPlus,  
  FaUsers 
} from "react-icons/fa";

const FormCard = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col gap-3 transition-all duration-200 hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] font-sans w-full">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <div className="w-full">{children}</div>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col gap-2 transition-all duration-200 hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] font-sans w-full">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">{title}</p>}
    <div className="w-full">{children}</div>
  </div>
);

const SidebarLink = ({ to, icon, children, isActive, collapsed }) => (
  <Link
    to={to}
    className={`relative flex items-center gap-2 py-1.5 px-4 rounded-lg transition-all duration-300 group ${isActive ? "bg-blue-600 text-white shadow-md scale-105" : "text-gray-700 hover:bg-blue-100 hover:text-blue-600 hover:shadow-sm"} ${collapsed ? "justify-center" : ""}`}
  >
    {icon && <span className="text-xl">{icon}</span>}
    {!collapsed && <span className="font-medium text-sm tracking-wide">{children}</span>}
  </Link>
);

const PolyclinicLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (!sessionUser?.id) return navigate("/systems/polyclinic/auth/login");

      const { data: mainUser } = await supabase
        .from("systems_users")
        .select("*")
        .eq("auth_user_id", sessionUser.id)
        .maybeSingle();

      if (mainUser) {
        setUser({
          id: mainUser.id,
          name: mainUser.customer_name || "Admin User",
          officeName: mainUser.office_name || "My Clinic",
          officeId: mainUser.office_id,
          role: "admin",
          permissions: mainUser.permissions || ["dashboard","patients","appointments","services","departments","laboratory","imaging","pharmacy","expenses","deleted-sales","expired-items","attendence","suppliers","purchases","prescriptions","help","profile","notifications"]
        });
        return;
      }

      const { data: employeeUser } = await supabase
        .from("employees")
        .select("*")
        .eq("auth_user_id", sessionUser.id)
        .maybeSingle();

      if (employeeUser) {
        const { data: officeData } = await supabase
          .from("systems_users")
          .select("office_name, office_id")
          .eq("office_id", employeeUser.office_id)
          .maybeSingle();

        setUser({
          id: employeeUser.id,
          name: employeeUser.name || "Employee",
          officeName: officeData?.office_name || "Unknown Clinic",
          officeId: officeData?.office_id || employeeUser.office_id,
          role: "employee",
          permissions: employeeUser.permissions || ["dashboard","patients","appointments","services","departments","laboratory","imaging","pharmacy","expenses","deleted-sales","expired-items","attendence","suppliers","purchases","prescriptions","help","profile","notifications"]
        });
        return;
      }

      setUser({ id: null, name: "Unknown User", officeName: "Unknown Clinic", role: "employee", permissions: [] });
    };

    fetchUser();
  }, [navigate]);

  const sidebarLinks = [
    { to: "/hospital/dashboard", label: "Dashboard", icon: <FaHome />, key: "dashboard" },
    { to: "/hospital/dashboard/patients", label: "Patients", icon: <FaUsers />, key: "patients" },
    { to: "/hospital/dashboard/employees", label: "Staff", icon: <FaUsers />, key: "employees", adminOnly: true },
    { to: "/hospital/dashboard/consultations", label: "Consultations", icon: <FaCalendarAlt />, key: "consultations" },
    { to: "/hospital/dashboard/appointments", label: "Appointments", icon: <FaCalendarAlt />, key: "appointments" },
    { to: "/hospital/dashboard/services", label: "Services", icon: <FaClipboardList />, key: "services" },
    { to: "/hospital/dashboard/departments", label: "Departments", icon: <FaClinicMedical />, key: "departments" },
    { to: "/hospital/dashboard/laboratory/tests", label: "Laboratory", icon: <FaFlask />, key: "laboratory" },
    { to: "/hospital/dashboard/imaging/tests", label: "Imaging", icon: <FaClipboardList />, key: "imaging" },
    { to: "/hospital/dashboard/pharmacy", label: "Pharmacy", icon: <FaBoxOpen />, key: "pharmacy" },
    { to: "/hospital/dashboard/prescriptions", label: "Prescriptions", icon: <FaClipboardList />, key: "prescriptions" },
    { to: "/hospital/dashboard/sales", label: "Billing", icon: <FaFileInvoiceDollar />, key: "billing" },
    { to: "/hospital/dashboard/insurance", label: "Insurance", icon: <FiShield />, key: "insurance" },
    { to: "/hospital/dashboard/wards", label: "Wards", icon: <FaHospitalAlt />, key: "wards" },
    { to: "/hospital/dashboard/emergency", label: "Emergency", icon: <FaExclamationTriangle />, key: "emergency" },
    { to: "/hospital/dashboard/assets", label: "Assets", icon: <FaTools />, key: "assets" },
    { to: "/hospital/dashboard/employees", label: "Staff", icon: <FaUsers />, key: "employees", adminOnly: true },
    { to: "/hospital/dashboard/reports", label: "Reports", icon: <FaRegFileAlt />, key: "reports" },
    { to: "/hospital/dashboard/expenses", label: "Expenses", icon: <FaFileInvoiceDollar />, key: "expenses" },
    { to: "/hospital/dashboard/deleted", label: "Deleted Sales", icon: <FaArchive />, key: "deleted-sales" },
    { to: "/hospital/dashboard/expired", label: "Expired Items", icon: <FaRegClock />, key: "expired-items" },
    { to: "/hospital/dashboard/attendances", label: "Attendence", icon: <FaUserCheck />, key: "attendence" },
    { to: "/hospital/dashboard/suppliers", label: "Suppliers", icon: <FaUsers />, key: "suppliers" },
    { to: "/hospital/dashboard/purchases", label: "Purchases", icon: <FaClipboardList />, key: "purchases" },
    { to: "/hospital/dashboard/notifications", label: "Notifications", icon: <FaBell />, key: "notifications" },
    { to: "/hospital/dashboard/subscription", label: "Subscription", icon: <FaClipboardList />, key: "subscription" },
    { to: "/hospital/dashboard/settings", label: "Settings", icon: <FaCogs />, key: "settings", adminOnly: true },
    { to: "/hospital/dashboard/help", label: "Help", icon: <FaQuestionCircle />, key: "help" },
    { to: "/hospital/dashboard/profile", label: "Profile", icon: <FaUsers />, key: "profile" },
  ];

  const allowedLinks = user
    ? sidebarLinks.filter(link => user.role === "admin" || (link.adminOnly ? false : user.permissions.includes(link.key)))
    : [];

  const displayRole = user?.role === "admin" ? "Admin / Owner" : "Employee";

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className={`bg-white border-r shadow-md flex flex-col ${sidebarOpen ? "w-64" : "w-20"} flex-shrink-0`}>
        <div className="p-4 text-2xl font-bold border-b flex justify-center items-center h-16 text-blue-600 sticky top-0 z-40 bg-white">
          {sidebarOpen ? user?.officeName || "Loading..." : user?.officeName?.split(" ")[0]?.substring(0,2)?.toUpperCase() || "??"}
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {allowedLinks.map(link => (
            <SidebarLink
              key={link.to}
              to={link.to}
              icon={link.icon}
              isActive={location.pathname.startsWith(link.to)}
              collapsed={!sidebarOpen}
            >
              {link.label}
            </SidebarLink>
          ))}
        </nav>

        <div className="text-center py-2 text-xs text-gray-400 border-t">© 2025 {user?.officeName || "Loading..."}</div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-blue-600 shadow-md flex justify-between items-center gap-4 px-4 md:px-6 py-3 sticky top-0 z-50">
          <button onClick={toggleSidebar} className="text-white text-2xl hover:scale-110 transition-transform">
            <FaPlus className={`${sidebarOpen ? "rotate-0" : "rotate-90"} transition-transform`} />
          </button>

          <div className="flex items-center gap-3 md:gap-4 flex-1 justify-end">
            <div className="relative">
              <FaBell className="text-white text-2xl cursor-pointer hover:scale-110 transition" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-700 rounded-full animate-pulse"></span>
            </div>

            <div className="hidden sm:flex flex-col text-right">
              <span className="font-semibold text-white text-sm md:text-base">{user?.name || "Loading..."}</span>
              <span className="text-blue-100 text-xs md:text-sm">
                {user?.officeName || "Loading..."} -
                <span className={`ml-1 px-2 py-0.5 rounded-full text-white text-xs ${user?.role === "admin" ? "bg-blue-800" : "bg-blue-500"}`}>{displayRole}</span>
              </span>
            </div>

            <Link to="/systems/polyclinic/profile" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-blue-600 font-semibold shadow hover:scale-105">
              <FaUsers className="text-xl md:text-2xl" />
              <span className="hidden sm:inline">Profile</span>
            </Link>

            <button onClick={async () => { await supabase.auth.signOut(); navigate('/systems/polyclinic/auth/login'); }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white font-semibold shadow hover:scale-105">
              <FaSignOutAlt className="text-xl md:text-2xl" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content Scroll */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <CustomCard title="Quick Actions">
            <div className="flex flex-wrap gap-3">
              <Link to="/systems/polyclinic/appointments" className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow text-sm font-medium">
                <FaPlus /> New Appointment
              </Link>
              <Link to="/systems/polyclinic/patients" className="bg-white text-blue-600 border border-[#e5e7eb] px-4 py-2 rounded-xl hover:bg-blue-50 flex items-center gap-2 shadow text-sm font-medium">
                <FaUsers /> Add Patient
              </Link>
              <Link to="/systems/polyclinic/reports" className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow text-sm font-medium">
                <FaClipboardList /> Reports
              </Link>
            </div>
          </CustomCard>

          {children}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PolyclinicLayout;
