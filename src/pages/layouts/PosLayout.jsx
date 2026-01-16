import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { 
  FaHome, FaBox, FaShoppingCart, FaFileInvoice, FaUsers, FaUser, FaFileAlt, FaPlus, FaBoxOpen, FaList,
  FaFileInvoiceDollar, FaTools, FaHandshake, FaCalendarCheck, FaSignOutAlt, FaBook, FaTrashAlt,
  FaRegClock, FaBell, FaIdCard, FaBars, FaUserCircle, FaBuilding, FaCogs, FaInfoCircle, FaSms, FaClipboardList, FaQuestionCircle, FaMobileAlt 
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

/* ===================== SIDEBAR LINK ===================== */
const SidebarLink = ({ to, icon, label, isActive, collapsed, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition
      ${collapsed ? "justify-center" : ""}
      ${isActive ? "bg-gray-200 font-medium" : "hover:bg-gray-100"}
      text-gray-700
    `}
  >
    <span className="text-lg">{icon}</span>
    {!collapsed && <span className="truncate">{label}</span>}
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
  { to: "/dashboard/branch", label: "Tawi la Ofisi", icon: <FaBuilding />, key: "branch" },
  { to: "/dashboard/office-info", label: "Taarifa za Ofisi", icon: <FaInfoCircle />, key: "office-info" },
  { to: "/dashboard/sms", label: "Bando la SMS", icon: <FaSms />, key: "sms" },
  { to: "/dashboard/products", label: "Bidhaa", icon: <FaBox />, key: "products" },
  { to: "/dashboard/customers", label: "Wateja", icon: <FaUser />, key: "customers" },
  { to: "/dashboard/employees", label: "Wafanyakazi", icon: <FaClipboardList />, key: "employees", adminOnly: true },
  { to: "/dashboard/sales", label: "Mauzo", icon: <FaShoppingCart />, key: "sales" },
  { to: "/dashboard/suppliers", label: "Wasambazaji", icon: <FaHandshake />, key: "suppliers" },
  { to: "/dashboard/purchases", label: "Manunuzi", icon: <FaFileInvoiceDollar />, key: "purchases" },
  { to: "/dashboard/debts", label: "Madeni", icon: <FaFileInvoiceDollar />, key: "debts" },
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
  { to: "/dashboard/subscription", label: "Lipia Mfumo", icon: <FaClipboardList />, key: "subscriptions", adminOnly: true },
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
    <div className="flex h-screen bg-gray-50">

      {/* DESKTOP SIDEBAR */}
      <aside className={`hidden md:flex flex-col bg-white border-r transition-all ${sidebarOpen ? "w-64" : "w-20"}`}>
        <div className="h-16 flex items-center justify-center border-b font-semibold truncate">
          {sidebarOpen ? user?.officeName : user?.officeName?.slice(0,2)}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto min-w-0">
          {allowedLinks.map(link => (
            <SidebarLink
              key={link.to}
              {...link}
              collapsed={!sidebarOpen}
              isActive={location.pathname.startsWith(link.to)}
            />
          ))}
        </nav>
      </aside>

      {/* MOBILE SIDEBAR */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden flex flex-col min-w-0">
            <div className="h-16 flex items-center justify-center border-b font-semibold flex-shrink-0 truncate">
              {user?.officeName || "Office"}
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto min-w-0">
              {allowedLinks.map(link => (
                <SidebarLink
                  key={link.to}
                  {...link}
                  isActive={location.pathname.startsWith(link.to)}
                  onClick={() => setMobileSidebarOpen(false)}
                />
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 flex justify-between items-center px-4 py-2 md:py-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={window.innerWidth >= 768 ? () => setSidebarOpen(!sidebarOpen) : () => setMobileSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <FaBars />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base truncate">{user?.name || "User"}</span>
              <span className="text-xs text-gray-500 truncate">
                {user?.role === "admin" ? "Admin / Owner" : "Employee"} - {user?.officeName || "Office"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-600 min-w-0">
            <FaBell className="cursor-pointer" />
            <Link to="/dashboard/profile">
              <FaUserCircle className="text-xl hover:text-gray-800" />
            </Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            >
              <FaSignOutAlt className="hover:text-gray-800" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto overflow-x-auto min-w-0">
          <CustomCard title="Quick Actions">
            <div className="flex gap-3 flex-wrap min-w-0">
              <Link to="/dashboard/sales" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 min-w-0">
                <FaPlus /> Mauzo
              </Link>
              <Link to="/dashboard/reports" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 min-w-0">
                <FaList /> Report
              </Link>
            </div>
          </CustomCard>

          {/* Container to prevent horizontal overflow */}
          <div className="max-w-full w-full overflow-x-auto min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PharmacyLayout;
