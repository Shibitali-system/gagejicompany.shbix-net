import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { motion } from "framer-motion";

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
};

const NOTIFICATION_KEYS = Object.keys(DEFAULT_SETTINGS);

export default function NotificationsPage() {
  const [sellerInfo, setSellerInfo] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState({ total: 0, unread: 0, byTitle: {} });

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(null);

  const limit = 15;

  // --------------------------------------------------------
  // 1. FETCH SELLER INFO
  // --------------------------------------------------------
  useEffect(() => {
    const run = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser)
          return setSellerInfo({
            id: systemUser.id,
            type: "system",
            office_id: systemUser.office_id,
          });

        const { data: employeeUser } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (employeeUser)
          setSellerInfo({
            id: employeeUser.id,
            type: "employee",
            office_id: employeeUser.office_id,
          });
      } catch {
        toast.error("Failed to load user info");
      }
    };
    run();
  }, []);

  // --------------------------------------------------------
  // 2. FETCH SETTINGS
  // --------------------------------------------------------
  useEffect(() => {
    if (!sellerInfo?.office_id) return;

    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("*")
          .eq("office_id", sellerInfo.office_id)
          .maybeSingle();

        setSettings(data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS);
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setSettingsLoaded(true);
      }
    };

    fetchSettings();
  }, [sellerInfo]);

  // --------------------------------------------------------
  // 3. ANALYTICS
  // --------------------------------------------------------
  const computeAnalytics = useCallback((list) => {
    const total = list.length;
    const unread = list.filter((n) => !n.read).length;

    const byTitle = {};
    list.forEach((n) => {
      byTitle[n.title] = (byTitle[n.title] || 0) + 1;
    });

    setAnalytics({ total, unread, byTitle });
  }, []);

  // --------------------------------------------------------
  // 4. LOAD PAGINATED NOTIFICATIONS
  // --------------------------------------------------------
  const loadNotifications = useCallback(async () => {
    if (!sellerInfo || !settingsLoaded || !hasMore) return;

    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * limit, page * limit + limit - 1);

      if (sellerInfo.type === "system")
        query = query.eq("office_id", sellerInfo.office_id);
      else query = query.eq("auth_user_id", sellerInfo.id);

      const { data, error } = await query;
      if (error) throw error;

      const filtered = data.filter((n) => settings[n.key] ?? true);

      if (data.length < limit) setHasMore(false);

      setNotifications((prev) => {
        const updated = [...prev, ...filtered];
        computeAnalytics(updated);
        return updated;
      });
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [sellerInfo, settingsLoaded, hasMore, settings, page, computeAnalytics]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // --------------------------------------------------------
  // 5. INFINITE SCROLL
  // --------------------------------------------------------
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore]);

  // --------------------------------------------------------
  // 6. REALTIME LISTENER
  // --------------------------------------------------------
  useEffect(() => {
    if (!sellerInfo || !settingsLoaded) return;

    const channel = supabase
      .channel("realtime:notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new;

          const match =
            (sellerInfo.type === "system" && n.office_id === sellerInfo.office_id) ||
            (sellerInfo.type === "employee" && n.auth_user_id === sellerInfo.id);

          if (match && (settings[n.key] ?? true)) {
            setNotifications((prev) => {
              const updated = [n, ...prev];
              computeAnalytics(updated);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe(); // FIXED cleanup
    };
  }, [sellerInfo, settings, settingsLoaded, computeAnalytics]);

  // --------------------------------------------------------
  // 7. MARK AS READ
  // --------------------------------------------------------
  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        computeAnalytics(updated);
        return updated;
      });
    } catch {
      toast.error("Failed to update");
    }
  };

  // --------------------------------------------------------
  // 8. TOGGLE SETTINGS
  // --------------------------------------------------------
  const toggleAllSettings = (value) => {
    const updated = {};
    NOTIFICATION_KEYS.forEach((k) => (updated[k] = value));
    setSettings(updated);
  };

  const toggleSingle = (key) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  // --------------------------------------------------------
  // 9. UI BELOW
  // --------------------------------------------------------
  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-10">
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Page Header */}
      <CustomCard>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#ef4444] mb-2">
          Notifications
        </h1>
        <p className="text-gray-500 text-sm">
          View your notifications, check unread items, and manage notification settings below.
        </p>
      </CustomCard>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormCard title="Total Notifications">
          <div className="p-4 flex flex-col items-center justify-center bg-white rounded-xl shadow">
            <p className="text-gray-500 text-sm mb-1">Total notifications received</p>
            <p className="text-[#ef4444] font-bold text-3xl">{analytics.total}</p>
          </div>
        </FormCard>

        <FormCard title="Unread Notifications">
          <div className="p-4 flex flex-col items-center justify-center bg-white rounded-xl shadow">
            <p className="text-gray-500 text-sm mb-1">Notifications not yet read</p>
            <p className="text-[#ef4444] font-bold text-3xl">{analytics.unread}</p>
          </div>
        </FormCard>

        <FormCard title="Notification Titles">
          <div className="p-4 flex flex-col items-center justify-center bg-white rounded-xl shadow">
            <p className="text-gray-500 text-sm mb-1">Different notification categories</p>
            <p className="text-[#ef4444] font-bold text-3xl">{Object.keys(analytics.byTitle).length}</p>
          </div>
        </FormCard>
      </div>

      {/* Notifications Breakdown */}
      <CustomCard title="Notifications Breakdown">
        <p className="text-gray-500 text-sm mb-2">
          Number of notifications grouped by title/category.
        </p>
        <div className="space-y-2">
          {Object.entries(analytics.byTitle).map(([title, count]) => (
            <div key={title} className="flex justify-between text-gray-700">
              <span>{title}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </CustomCard>

      {/* Notification Settings */}
      <CustomCard title="Notification Settings">
        <p className="text-gray-500 text-sm mb-2">
          Toggle your preferences for receiving notifications.
        </p>
        <div className="flex justify-between mb-3">
          <div className="space-x-2">
            <button
              onClick={() => toggleAllSettings(true)}
              className="px-3 py-1 bg-[#ef4444] text-white rounded"
            >
              Select All
            </button>
            <button
              onClick={() => toggleAllSettings(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded"
            >
              Deselect All
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NOTIFICATION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={() => toggleSingle(key)}
                className="h-5 w-5"
              />
              <span className="text-gray-700">
                {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </CustomCard>

      {/* Notifications List */}
      <CustomCard title="Notifications">
        <p className="text-gray-500 text-sm mb-2">All your notifications are listed below.</p>
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl shadow border ${
                n.read ? "border-gray-200" : "border-[#ef4444]"
              }`}
            >
              <div className="p-5 flex justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    {n.title}
                    {!n.read && (
                      <span className="text-xs bg-[#ef4444] text-white px-2 py-1 rounded">
                        New
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-700 mb-2">{n.message}</p>
                  {n.link && (
                    <a
                      href={n.link}
                      target="_blank"
                      className="text-[#ef4444] hover:underline"
                      rel="noreferrer"
                    >
                      View more
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {dayjs(n.created_at).format("DD MMM YYYY HH:mm")}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="px-3 py-1 bg-[#ef4444] text-white rounded shadow"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && <p className="text-center text-gray-500">Loading...</p>}
          <div ref={loaderRef} className="h-10"></div>
          {!hasMore && <p className="text-center text-gray-400">No more notifications</p>}
        </div>
      </CustomCard>

    </div>
  </div>
);

}
