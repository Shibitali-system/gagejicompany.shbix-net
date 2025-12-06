import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { FaSave, FaSpinner } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">
      {title}
    </p>
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
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">
        {title}
      </p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

const DEFAULT_SETTINGS = {
  low_stock_alert: true,
  payment_overdue_alert: true,
  returns_alert: true,
  new_expense_recorded: true,
  new_expense_request: true,
  sales_deleted: true,
  new_product_added: true,
  stock_updated: true,
  new_sale_recorded: true,
  expired_products_recorded: true,
  system_name: "",
  logo_url: "",
  default_role: "Employee",
};

const SettingsPage = () => {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("notifications");

  // ======================== Fetch seller info ========================
  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) throw new Error("User not authenticated");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser) {
          setSellerInfo(systemUser);
          return;
        }

        const { data: employeeUser } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (employeeUser) {
          const { data: officeData } = await supabase
            .from("systems_users")
            .select("office_name, office_id")
            .eq("office_id", employeeUser.office_id)
            .maybeSingle();

          setSellerInfo({
            ...employeeUser,
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
          return;
        }

        throw new Error("Seller information not found");
      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    };

    fetchSellerInfo();
  }, []);

  // ======================== Fetch settings ========================
  useEffect(() => {
    const fetchSettings = async () => {
      if (!sellerInfo?.office_id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("*")
          .eq("office_id", sellerInfo.office_id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          const { data: newData, error: insertError } = await supabase
            .from("system_settings")
            .insert({ ...DEFAULT_SETTINGS, office_id: sellerInfo.office_id })
            .select()
            .maybeSingle();
          if (insertError) throw insertError;

          setSettings(newData || DEFAULT_SETTINGS);
        } else {
          setSettings({ ...DEFAULT_SETTINGS, ...data });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch settings: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [sellerInfo]);

  // ======================== Input handler ========================
  const handleChange = (e) => {
    const { name, checked, value, type } = e.target;
    setSettings({
      ...settings,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // ======================== Select / Deselect All ========================
  const toggleAllNotifications = () => {
    const notificationKeys = [
      "low_stock_alert",
      "payment_overdue_alert",
      "returns_alert",
      "new_expense_recorded",
      "new_expense_request",
      "sales_deleted",
      "new_product_added",
      "stock_updated",
      "new_sale_recorded",
      "expired_products_recorded",
    ];

    const allChecked = notificationKeys.every((key) => settings[key] === true);
    const newSettings = { ...settings };
    notificationKeys.forEach((key) => {
      newSettings[key] = !allChecked;
    });
    setSettings(newSettings);
  };

  // ======================== Save Update ========================
  const handleUpdate = async () => {
    if (!sellerInfo?.office_id) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .update(settings)
        .eq("office_id", sellerInfo.office_id)
        .select()
        .maybeSingle();

      if (error) throw error;

      setSettings({ ...DEFAULT_SETTINGS, ...data });
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ======================== UI ========================
  if (loading) return <div className="p-6 text-gray-600">Loading settings...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const notificationFields = [
    { key: "low_stock_alert", label: "Low Stock Alert" },
    { key: "payment_overdue_alert", label: "Payment Overdue Alert" },
    { key: "returns_alert", label: "Returns Alert" },
    { key: "new_expense_recorded", label: "New Expense Recorded" },
    { key: "new_expense_request", label: "New Expense Request" },
    { key: "sales_deleted", label: "Sales Deleted" },
    { key: "new_product_added", label: "New Product Added" },
    { key: "stock_updated", label: "Stock Updated" },
    { key: "new_sale_recorded", label: "New Sale Recorded" },
    { key: "expired_products_recorded", label: "Expired Products Recorded" },
  ];

  return (
  <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
    <Toaster position="top-right" />

    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <CustomCard>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444] mb-2">
          System Settings
        </h1>
        <p className="text-gray-500 text-sm">
          Manage your system notifications, branding, and default roles. Tips are provided below each section.
        </p>
      </CustomCard>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {["notifications", "branding", "roles"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl font-semibold transition text-sm sm:text-base ${
              activeTab === tab
                ? "bg-[#ef4444] text-white shadow"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* === Notifications Tab === */}
        {activeTab === "notifications" && (
          <FormCard title="Notifications Settings">
            <p className="text-gray-500 text-sm mb-3">
              Toggle your notification preferences. Use the buttons below to select or deselect all options.
            </p>

            <div className="flex justify-end mb-3 gap-2">
              <button
                onClick={() => toggleAllNotifications(true)}
                className="px-3 py-1 bg-[#ef4444] text-white rounded"
              >
                Select All
              </button>
              <button
                onClick={() => toggleAllNotifications(false)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded"
              >
                Deselect All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {notificationFields.map((item) => (
                <label key={item.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={item.key}
                    checked={settings[item.key]}
                    onChange={handleChange}
                    className="h-5 w-5"
                  />
                  <span className="text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </FormCard>
        )}

        {/* === Branding Tab === */}
        {activeTab === "branding" && (
          <FormCard title="Branding Settings">
            <p className="text-gray-500 text-sm mb-3">
              Update your system branding. System name and logo will appear across the application.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">System Name</label>
                <input
                  type="text"
                  name="system_name"
                  value={settings.system_name}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Logo URL</label>
                <input
                  type="text"
                  name="logo_url"
                  value={settings.logo_url}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </FormCard>
        )}

        {/* === Roles Tab === */}
        {activeTab === "roles" && (
          <FormCard title="Default Role">
            <p className="text-gray-500 text-sm mb-3">
              Choose the default role assigned to new users.
            </p>

            <select
              name="default_role"
              value={settings.default_role}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="Admin">Admin</option>
              <option value="Employee">Employee</option>
            </select>
          </FormCard>
        )}

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="flex items-center gap-2 bg-[#ef4444] text-white px-6 py-2 rounded-xl hover:bg-red-600 transition"
          >
            {updating ? <FaSpinner className="animate-spin" /> : <FaSave />}
            {updating ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

};

export default SettingsPage;
