import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import {
  FaSearch,
  FaEye,
  FaPlus,
  FaEdit,
  FaFileExcel,
} from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

const SummaryCard = ({ title, value }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col items-center justify-center
    shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans
    w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className="text-xl font-semibold mt-1 text-[#2563EB]">{value}</p>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col items-start justify-center
    shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans
    w-full
  ">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);

const CHUNK_SIZE = 500;

const AssetsIndex = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [totals, setTotals] = useState({ totalAssets: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load User
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("No authenticated user");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) {
          setUser({ ...systemUser, role: "admin" });
          return;
        }

        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) {
          setUser({ ...employee, role: "employee" });
          return;
        }

        throw new Error("No user account found.");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user");
      }
    };
    fetchUser();
  }, []);

  // Fetch Assets
  useEffect(() => {
    if (!user?.office_id) return;
    fetchAssets(true);
  }, [user, searchTerm]);

  const fetchAssets = async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const offset = reset ? 0 : (page - 1) * CHUNK_SIZE;

      const { data: assetsData, error: assetsError, count } = await supabase
        .from("assets")
        .select("*", { count: "exact" })
        .ilike("name", `%${searchTerm}%`)
        .eq("office_id", user.office_id)  // filter by office_id
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (assetsError) throw assetsError;

      setAssets(prev => (reset ? assetsData : [...prev, ...assetsData]));
      setPage(prev => (reset ? 2 : prev + 1));
      setHasMore(offset + CHUNK_SIZE < count);

      if (reset) {
        setTotals({ totalAssets: count || 0 });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch assets: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!assets || assets.length === 0) {
      toast.error("No assets to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      assets.map(a => ({
        Name: a.name,
        Category: a.category,
        Quantity: a.quantity,
        Purchase_Date: a.purchase_date,
        Office: a.office_name || "-",
        Created_By: a.created_name || "-",
        Created_At: new Date(a.created_at).toLocaleString(),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
    XLSX.writeFile(workbook, `assets_export_${new Date().toISOString()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Card */}
        <CustomCard title="Assets">
          <h1 className="text-3xl font-bold text-[#2563EB]">Assets</h1>
          <p className="text-gray-500 text-sm">Manage all your office assets here. You can add, edit, or view details.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Link
              to="new"
              className="
                bg-white text-[#2563EB] border border-[#e5e7eb] rounded-[4px]
                px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                hover:bg-[#f0f7ff] hover:shadow-md transition-all duration-200
                font-sans
              "
            >
              <FaPlus /> Add New Asset
            </Link>

            <button
              onClick={exportToExcel}
              className="
                bg-[#2563EB] text-white border border-[#e5e7eb] rounded-[4px]
                px-4 py-2 flex items-center gap-2 shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
                hover:bg-[#1d4ed8] hover:shadow-md transition-all duration-200
                font-sans
              "
            >
              <FaFileExcel /> Export Excel
            </button>
          </div>
        </CustomCard>

        {/* Search Card */}
        <CustomCard title="Search Assets">
          <div className="mb-2 flex items-center w-full sm:w-1/3">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </CustomCard>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Assets" value={totals.totalAssets} />
        </div>

        {/* Assets Table Card */}
        <CustomCard title="Assets List">
          {loading ? (
            <p className="text-gray-600">Loading assets...</p>
          ) : error ? (
            <p className="text-red-600 font-semibold">{error}</p>
          ) : assets.length === 0 ? (
            <p className="text-gray-600">No assets found.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wider">
                  <tr>
                    {["Name","Category","Quantity","Purchase Date","Office Name","Created By","Created At","Actions"].map(th => (
                      <th key={th} className="px-2 sm:px-3 py-2 text-left">{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-3 py-2 font-medium">{a.name}</td>
                      <td className="px-2 sm:px-3 py-2">{a.category}</td>
                      <td className="px-2 sm:px-3 py-2">{a.quantity}</td>
                      <td className="px-2 sm:px-3 py-2">{a.purchase_date}</td>
                      <td className="px-2 sm:px-3 py-2">{a.office_name || "-"}</td>
                      <td className="px-2 sm:px-3 py-2">{a.created_name || "-"}</td>
                      <td className="px-2 sm:px-3 py-2">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="px-2 sm:px-3 py-2 text-center flex flex-col sm:flex-row justify-center gap-2">
                        <Link to={`${a.id}`} className="text-[#2563EB] hover:underline flex items-center gap-1"><FaEye /> View</Link>
                        <Link to={`edit/${a.id}`} className="text-[#2563EB] hover:underline flex items-center gap-1"><FaEdit /> Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={()=>fetchAssets(false)}
                className="bg-[#2563EB] text-white px-4 py-2 rounded hover:bg-[#1d4ed8]"
              >
                Load More
              </button>
            </div>
          )}
        </CustomCard>

      </div>
    </div>
  );
};

export default AssetsIndex;
