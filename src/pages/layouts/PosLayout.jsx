import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { 
  FaHome, FaBox, FaShoppingCart, FaFileInvoice, FaUsers, FaUser, FaFileAlt, FaPlus, FaBoxOpen, FaList,
  FaFileInvoiceDollar, FaTools, FaHandshake, FaCalendarCheck, FaSignOutAlt, FaBook, FaTrashAlt,
  FaRegClock, FaBell, FaIdCard, FaBars, FaUserCircle, FaCogs, FaClipboardList, FaQuestionCircle, FaMobileAlt 
} from 'react-icons/fa';

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
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">{title}</p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

const SidebarLink = ({ to, icon, children, isActive, collapsed, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`
      group relative flex items-center gap-3 px-4 py-3 rounded-xl
      text-sm font-medium transition-all duration-300
      ${collapsed ? "justify-center" : ""}
      ${isActive ? "bg-white/20 shadow-lg" : "hover:bg-white/10"}
    `}
  >
    {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-white" />}
    <span className="text-lg">{icon}</span>
    <span className={`transition-all duration-300 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      {children}
    </span>
  </Link>
);



const PharmacyLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); // mobile

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const toggleMobileSidebar = () => setMobileSidebarOpen(prev => !prev);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (!sessionUser?.id) return navigate("/login");

      let mainUser = await supabase
        .from("systems_users")
        .select("*")
        .eq("auth_user_id", sessionUser.id)
        .maybeSingle()
        .then(r => r.data);

      let employeeUser;
      if (!mainUser) {
        employeeUser = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", sessionUser.id)
          .maybeSingle()
          .then(r => r.data);

        if (employeeUser) {
          const officeData = await supabase
            .from("systems_users")
            .select("office_name, office_id")
            .eq("office_id", employeeUser.office_id)
            .maybeSingle()
            .then(r => r.data);

          employeeUser.office_name = officeData?.office_name;
        }
      }

      const officeId = mainUser?.office_id || employeeUser?.office_id;

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("office_id", officeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isExpired = subs && (subs.usagedays <= 0 || subs.status === "pending");
      setSubscriptionExpired(isExpired);

      if (mainUser) {
        setUser({
          id: mainUser.id,
          name: mainUser.customer_name || "Admin User",
          officeName: mainUser.office_name || "My Office",
          officeId: mainUser.office_id,
          role: "admin",
          permissions: mainUser.permissions || ["dashboard","products","sales","customers","suppliers","help","profile","notifications"]
        });
      } else if (employeeUser) {
        setUser({
          id: employeeUser.id,
          name: employeeUser.name || "Employee",
          officeName: employeeUser.office_name || "Unknown Office",
          officeId: employeeUser.office_id,
          role: "employee",
          permissions: employeeUser.permissions || DEFAULT_EMPLOYEE_PERMISSIONS
        });
      }
    };

    fetchUser();
  }, [navigate]);

  const DEFAULT_EMPLOYEE_PERMISSIONS = [
  // Core
  "dashboard",

  // Sales & Products
  "products",
  "sales",
  "customers",
  "suppliers",

  // Finance & Management
  "purchases",
  "expenses",
  "assets",
  "reports",

  // Logs & Tracking
  "deleted",
  "expired",
  "attendances",

  // Office tools
  "meeting",
  "notebook",

  // System / Info
  "insurance",
  "identitymanual",
  "installinstructions",

  // Common
  "notifications",
  "profile",
  "help",
];


const sidebarLinks = [
  { to: "/dashboard", label: "Dashibodi", icon: <FaHome />, key: "dashboard" },
  { to: "/dashboard/products", label: "Bidhaa", icon: <FaBox />, key: "products" },
  { to: "/dashboard/sales", label: "Mauzo", icon: <FaShoppingCart />, key: "sales" },
  { to: "/dashboard/purchases", label: "Manunuzi", icon: <FaFileInvoiceDollar />, key: "purchases" },
  { to: "/dashboard/suppliers", label: "Wasambazaji", icon: <FaHandshake />, key: "suppliers" },
  { to: "/dashboard/customers", label: "Wateja", icon: <FaUser />, key: "customers" },
  { to: "/dashboard/employees", label: "Wafanyakazi", icon: <FaClipboardList />, key: "employees", adminOnly: true },
  { to: "/dashboard/reports", label: "Ripoti", icon: <FaFileAlt />, key: "reports" },
  { to: "/dashboard/expenses", label: "Matumizi", icon: <FaFileInvoice />, key: "expenses" },
  { to: "/dashboard/assets", label: "Mali za Ofisi", icon: <FaTools />, key: "assets" },
  { to: "/dashboard/meeting", label: "Vikao", icon: <FaCalendarCheck />, key: "meeting" },
  { to: "/dashboard/notebook", label: "Notebook", icon: <FaBook />, key: "notebook" },
  { to: "/dashboard/deleted", label: "Mauzo Yaliyofutwa", icon: <FaTrashAlt />, key: "deleted" },
  { to: "/dashboard/expired", label: "Expired", icon: <FaRegClock />, key: "expired" },
  { to: "/dashboard/attendances", label: "Mahudhurio", icon: <FaCalendarCheck />, key: "attendances" },
  { to: "/dashboard/notifications", label: "Notifications", icon: <FaBell />, key: "notifications" },
  { to: "/dashboard/identitymanual", label: "Vitambulisho", icon: <FaIdCard />, key: "identitymanual" },
  { to: "/dashboard/settings", label: "Settings", icon: <FaCogs />, key: "settings", adminOnly: true },
  { to: "/dashboard/subscription", label: "Subscriptions", icon: <FaClipboardList />, key: "subscriptions", adminOnly: true },
  { to: "/dashboard/help", label: "Msaada", icon: <FaQuestionCircle />, key: "help" },
  { to: "/dashboard/install/installinstructions", label: "Install App", icon: <FaMobileAlt />, key: "installinstructions" },
  { to: "/dashboard/profile", label: "Profile", icon: <FaUser />, key: "profile" },
];



  const allowedLinks = user
    ? sidebarLinks.filter(link => {
        if (subscriptionExpired && !["/dashboard", "/dashboard/subscription"].includes(link.to)) return false;
        return user.role === "admin" || (link.adminOnly ? false : user.permissions.includes(link.key));
      })
    : [];

  const displayRole = user?.role === "admin" ? "Admin / Owner" : "Employee";

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col h-screen bg-gradient-to-b from-[#2563EB] to-[#3360C3] text-white transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"}`}>
        <div className="h-16 flex items-center justify-center bg-white/10 backdrop-blur-md text-center px-2">
          {sidebarOpen 
            ? <span className="transition-all duration-300 opacity-100">{user?.officeName}</span>
            : <span className="text-lg font-bold">{user?.officeName?.substring(0,2)?.toUpperCase()}</span>
          }
        </div>
        <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
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
        <div className="py-3 text-center text-xs text-white/60">© 2025 {user?.officeName || ""}</div>
      </aside>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 md:hidden transition-transform duration-300 ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="absolute inset-0 bg-black/20" onClick={() => setMobileSidebarOpen(false)}></div>
        <aside className="relative h-full w-64 bg-gradient-to-b from-[#2563EB] to-[#3360C3] text-white flex flex-col shadow-xl">
          <div className="h-16 flex items-center justify-center bg-white/10 backdrop-blur-md">{user?.officeName || "Loading..."}</div>
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {allowedLinks.map(link => (
              <SidebarLink
                key={link.to}
                to={link.to}
                icon={link.icon}
                isActive={location.pathname.startsWith(link.to)}
                collapsed={false}
                onClick={() => setMobileSidebarOpen(false)}
              >
                {link.label}
              </SidebarLink>
            ))}
          </nav>
          <div className="py-3 text-center text-xs text-white/60">© 2025 {user?.officeName || ""}</div>
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
       {/* Header */}
<header className="sticky top-0 z-50 bg-gradient-to-r from-green-100 to-green-50 shadow-lg rounded-b-xl flex justify-between items-center px-4 md:px-6 py-2 transition-all duration-300">
  <div className="flex items-center gap-2 md:gap-3">
    <button
      className="text-[#2563EB] text-xl md:text-2xl hover:scale-110 transition-transform p-1 rounded-md hover:bg-[#2563EB]/10"
      onClick={window.innerWidth >= 768 ? toggleSidebar : toggleMobileSidebar}
    >
      <FaBars className={`${sidebarOpen ? "rotate-0" : "rotate-90"} transition-transform`} />
    </button>
    <span className="font-bold text-[#2563EB] text-base md:text-lg tracking-wide">{user?.officeName || "My Office"}</span>
  </div>

  <div className="flex items-center gap-2 md:gap-4">
    <div className="relative">
      <FaBell className="text-[#2563EB] text-xl md:text-2xl cursor-pointer hover:scale-105 transition" />
      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
    </div>
    <div className="hidden sm:flex flex-col items-start bg-[#2563EB]/5 px-2 py-1.5 rounded-xl backdrop-blur-sm">
      <span className="font-semibold text-[#2563EB] text-xs md:text-sm">{user?.name || "Loading..."}</span>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[#2563EB]/70 text-[9px] md:text-xs">{user?.role === "admin" ? "Admin / Owner" : "Employee"}</span>
        <span className={`px-1.5 py-0.5 rounded-full text-white text-[9px] md:text-xs font-semibold ${user?.role === "admin" ? "bg-[#2563EB]" : "bg-[#1D4ED8]"}`}>{displayRole}</span>
      </div>
    </div>
    <Link to="/dashboard/profile" className="flex items-center gap-1 md:gap-2 px-3 py-1.5 rounded-full bg-[#2563EB] text-white font-semibold shadow hover:scale-105 hover:brightness-105 transition text-sm md:text-base">
      <FaUserCircle className="text-lg md:text-xl" /><span className="hidden sm:inline">Profile</span>
    </Link>
    <button
      onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
      className="flex items-center gap-1 md:gap-2 px-3 py-1.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] font-semibold shadow hover:scale-105 hover:bg-[#2563EB]/20 transition text-sm md:text-base"
    >
      <FaSignOutAlt className="text-lg md:text-xl" /><span className="hidden sm:inline">Logout</span>
    </button>
  </div>
</header>




        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <CustomCard title="Quick Actions">
            <div className="flex flex-wrap gap-3">
              <Link to="/dashboard/sales" className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#e3342f] flex items-center gap-2 shadow text-sm font-medium"><FaPlus /> Mauzo</Link>
         
              <Link to="/dashboard/reports" className="bg-[#2563EB] text-white px-4 py-2 rounded-xl hover:bg-[#e3342f] flex items-center gap-2 shadow text-sm font-medium"><FaList /> Reports</Link>
              <Link to="/dashboard/customers" className="bg-white text-[#2563EB] border border-[#e5e7eb] px-4 py-2 rounded-xl hover:bg-[#ffeaea] flex items-center gap-2 shadow text-sm font-medium"><FaBoxOpen /> Mteja Mpya</Link>
            </div>
          </CustomCard>
          {children}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PharmacyLayout;
