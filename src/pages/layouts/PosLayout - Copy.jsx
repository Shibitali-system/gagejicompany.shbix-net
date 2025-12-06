import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaCashRegister,
  FaBox,
  FaUsers,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaWarehouse,
  FaShoppingCart,
  FaUserTie,
  FaBell,
  FaHome,
} from "react-icons/fa";
import { MdInventory, MdCategory, MdPayment } from "react-icons/md";
import { supabase } from "../../../supabaseClient";

const PosLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/pos");
  };

  const navLinks = [
    { name: "Dashboard", path: "/pos/dashboard", icon: <FaHome /> },
    { name: "Sales", path: "/pos/dashboard/sales", icon: <FaCashRegister /> },
    { name: "Products", path: "/pos/dashboard/products", icon: <FaBox /> },
    { name: "Inventory", path: "/pos/dashboard/inventory", icon: <MdInventory /> },
    { name: "Categories", path: "/pos/dashboard/categories", icon: <MdCategory /> },
    { name: "Customers", path: "/pos/dashboard/customers", icon: <FaUsers /> },
    { name: "Suppliers", path: "/pos/dashboard/suppliers", icon: <FaWarehouse /> },
    { name: "Staff", path: "/pos/dashboard/staff", icon: <FaUserTie /> },
    { name: "Reports", path: "/pos/dashboard/reports/sales", icon: <FaChartLine /> },
    { name: "Expenses", path: "/pos/dashboard/expenses", icon: <MdPayment /> },
    { name: "Settings", path: "/pos/dashboard/settings", icon: <FaCog /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white shadow-lg flex flex-col transition-all duration-300`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h1
            className={`font-bold text-lg text-blue-600 ${
              !sidebarOpen && "hidden"
            }`}
          >
            POS System
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:text-blue-500"
          >
            <FaBars />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {navLinks.map((link, idx) => (
            <NavLink
              key={idx}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 py-3 px-4 hover:bg-blue-100 transition-all ${
                  isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
                }`
              }
            >
              <span className="text-lg">{link.icon}</span>
              {sidebarOpen && <span>{link.name}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 w-full"
          >
            <FaSignOutAlt />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="flex items-center justify-between bg-white shadow p-4">
          <div className="flex items-center gap-2">
            <FaShoppingCart className="text-blue-600 text-xl" />
            <span className="font-semibold text-gray-800 text-lg">
              POS Dashboard
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative">
              <FaBell className="text-gray-600 text-lg" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="flex items-center gap-2">
              <img
                src="https://ui-avatars.com/api/?name=Admin+User"
                alt="User Avatar"
                className="w-8 h-8 rounded-full border"
              />
              <span className="text-sm font-medium text-gray-700">Admin</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default PosLayout;
