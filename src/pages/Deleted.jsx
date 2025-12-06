import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { FaUndo, FaSearch } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

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

const PAGE_SIZE = 20;

const DeletedSalesIndex = () => {
  const [deletedSales, setDeletedSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    customerName: "",
    productName: "",
    sellerId: "",
    startDate: "",
    endDate: "",
  });
  const [analytics, setAnalytics] = useState({
    totalSales: 0,
    totalAmount: 0,
  });
  const [sellers, setSellers] = useState([]);

  // 🧩 Fetch logged-in user info
  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) return;

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (systemUser) {
          setSellerInfo({
            id: systemUser.id,
            name: systemUser.customer_name,
            type: "system",
            office_id: systemUser.office_id,
            office_name: systemUser.office_name,
          });
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
            id: employeeUser.id,
            name: employeeUser.name,
            type: "employee",
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
          return;
        }

        toast.error("Seller information not found.");
      } catch (err) {
        toast.error("Failed to fetch seller information.");
        console.error(err);
      }
    };
    fetchSellerInfo();
  }, []);

  // 🏗️ Fetch deleted sales + map deleted_by to names + seller dropdown
  useEffect(() => {
    if (!sellerInfo) return;
    const fetchDeletedSales = async () => {
      setLoading(true);
      try {
        let allSales = [];
        let offset = 0;

        while (true) {
          const { data: salesBatch, error } = await supabase
            .from("deleted_sales")
            .select("*")
            .eq("office_id", sellerInfo.office_id)
            .order("deleted_at", { ascending: false })
            .range(offset, offset + 999);

          if (error) throw error;
          if (!salesBatch || salesBatch.length === 0) break;
          allSales = [...allSales, ...salesBatch];
          if (salesBatch.length < 1000) break;
          offset += 1000;
        }

        const { data: allItems } = await supabase.from("deleted_sale_items").select("*");

        // Join items
        const joinedSales = allSales.map(sale => ({
          ...sale,
          deleted_sale_items: allItems.filter(i => i.deleted_sale_id === sale.id),
        }));

        // Fetch customer names
        const customerIds = [...new Set(joinedSales.map(s => s.customer_id).filter(Boolean))];
        const { data: customers } = await supabase
          .from("customers")
          .select("id, name")
          .in("id", customerIds);

        // Fetch product names
        const productIds = [...new Set(allItems.map(i => i.product_id).filter(Boolean))];
        const { data: products } = await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds);

        // Fetch deleted_by names
        const deletedByIds = [...new Set(allSales.map(s => s.deleted_by).filter(Boolean))];
        let deletedByMap = {};
        if (deletedByIds.length > 0) {
          const { data: sysUsers } = await supabase
            .from("systems_users")
            .select("id, customer_name")
            .in("id", deletedByIds);
          const { data: employees } = await supabase
            .from("employees")
            .select("id, name")
            .in("id", deletedByIds);

          sysUsers?.forEach(u => (deletedByMap[u.id] = u.customer_name));
          employees?.forEach(e => (deletedByMap[e.id] = e.name));
        }

        // Fetch sellers in this office for dropdown
        const { data: officeSellers } = await supabase
          .from("systems_users")
          .select("id, customer_name")
          .eq("office_id", sellerInfo.office_id);

        setSellers(officeSellers || []);

        const finalSales = joinedSales.map(sale => ({
          ...sale,
          customer_name: customers?.find(c => c.id === sale.customer_id)?.name || "-",
          deleted_sale_items: sale.deleted_sale_items.map(item => ({
            ...item,
            product_name: products?.find(p => p.id === item.product_id)?.name || `#${item.product_id}`,
          })),
          deleted_by_name: deletedByMap[sale.deleted_by] || sale.deleted_by || "-",
        }));

        setDeletedSales(finalSales);

        const totalAmount = finalSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
        setAnalytics({ totalSales: finalSales.length, totalAmount });
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch deleted sales.");
      } finally {
        setLoading(false);
      }
    };
    fetchDeletedSales();
  }, [sellerInfo]);

  // Filtered + paginated
  const filteredSales = useMemo(() => {
    return deletedSales.filter(s => {
      const matchesCustomer = s.customer_name.toLowerCase().includes(filters.customerName.toLowerCase());
      const matchesProduct = s.deleted_sale_items.some(i => i.product_name.toLowerCase().includes(filters.productName.toLowerCase()));
      const matchesSeller = filters.sellerId ? s.seller_id === filters.sellerId : true;
      const matchesStartDate = filters.startDate ? new Date(s.deleted_at) >= new Date(filters.startDate) : true;
      const matchesEndDate = filters.endDate ? new Date(s.deleted_at) <= new Date(filters.endDate) : true;
      return matchesCustomer && matchesProduct && matchesSeller && matchesStartDate && matchesEndDate;
    });
  }, [deletedSales, filters]);

  const paginatedSales = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, page]);

  const handleRestoreSale = async (sale) => {
    try {
      const { data: restoredSale, error: insertError } = await supabase
        .from("sales")
        .insert([{
          office_id: sale.office_id,
          seller_id: sale.seller_id,
          customer_id: sale.customer_id,
          total_amount: sale.total_amount,
          payment_status: sale.payment_status,
          payment_method: sale.payment_method,
          comment: sale.comment,
        }])
        .select()
        .single();
      if (insertError) throw insertError;

      for (let item of sale.deleted_sale_items) {
        await supabase.from("sale_items").insert([{
          sale_id: restoredSale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
        }]);
        await supabase.rpc("decrement_product_stock", {
          product_id_input: item.product_id,
          qty_input: item.quantity,
        });
      }

      await supabase.from("deleted_sale_items").delete().eq("deleted_sale_id", sale.id);
      await supabase.from("deleted_sales").delete().eq("id", sale.id);

      setDeletedSales(prev => prev.filter(s => s.id !== sale.id));
      toast.success(`Sale #${sale.id} restored successfully`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore sale: " + err.message);
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />

    {/* Header + Tips */}
    <CustomCard>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#ef4444]">
          Deleted Sales - {sellerInfo?.office_name || ""}
        </h1>
      </div>
      <p className="text-gray-600 text-sm">
        Use the buttons below to restore deleted sales quickly.
      </p>
    </CustomCard>

    {/* Analytics */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
      <FormCard title="Total Deleted Sales">
        <p className="text-[#ef4444] font-bold">{analytics.totalSales}</p>
      </FormCard>
      <FormCard title="Total Amount">
        <p className="text-[#ef4444] font-bold">TZS {analytics.totalAmount.toLocaleString()}</p>
      </FormCard>
    </div>

    {/* Filters */}
    <CustomCard title="Filters">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <FaSearch className="absolute left-2 top-2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by customer"
            className="border rounded pl-8 pr-2 py-1 w-full"
            value={filters.customerName}
            onChange={e => setFilters(f => ({ ...f, customerName: e.target.value }))}
          />
        </div>

        <div className="relative flex-1">
          <FaSearch className="absolute left-2 top-2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by product"
            className="border rounded pl-8 pr-2 py-1 w-full"
            value={filters.productName}
            onChange={e => setFilters(f => ({ ...f, productName: e.target.value }))}
          />
        </div>

        <select
          className="border rounded p-1"
          value={filters.sellerId}
          onChange={e => setFilters(f => ({ ...f, sellerId: e.target.value }))}
        >
          <option value="">All Sellers</option>
          {sellers.map(s => (
            <option key={s.id} value={s.id}>{s.customer_name}</option>
          ))}
        </select>

        <input
          type="date"
          className="border rounded p-1"
          value={filters.startDate}
          onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
        />
        <input
          type="date"
          className="border rounded p-1"
          value={filters.endDate}
          onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
        />
      </div>
    </CustomCard>

    {/* Deleted Sales Table */}
    <CustomCard title="Deleted Sales">
      {loading ? (
        <p>Loading deleted sales...</p>
      ) : filteredSales.length === 0 ? (
        <p>No deleted sales found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[#ef4444] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-2 py-2 text-left">Sale ID</th>
                <th className="px-2 py-2 text-left">Customer</th>
                <th className="px-2 py-2 text-left">Products</th>
                <th className="px-2 py-2 text-left">Deleted By</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map(sale => (
                <tr key={sale.id} className="border-b hover:bg-red-50">
                  <td className="px-2 py-2">{sale.id}</td>
                  <td className="px-2 py-2">{sale.customer_name}</td>
                  <td className="px-2 py-2">
                    <ul className="list-disc list-inside">
                      {sale.deleted_sale_items.map(i => (
                        <li key={i.id}>
                          {i.product_name} x{i.quantity} | TZS {i.price.toLocaleString()} | Discount: {i.discount || 0}%
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-2 py-2">{sale.deleted_by_name}</td>
                  <td className="px-2 py-2 text-right">{(sale.total_amount || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => handleRestoreSale(sale)}
                      className="bg-[#ef4444] text-white px-3 py-1 rounded-xl hover:bg-red-600 flex items-center gap-1"
                    >
                      <FaUndo /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CustomCard>

    {/* Pagination */}
    <CustomCard>
      <div className="flex justify-center gap-2">
        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
          className="px-3 py-1 border rounded"
        >
          Prev
        </button>
        <span>Page {page}</span>
        <button
          disabled={page * PAGE_SIZE >= filteredSales.length}
          onClick={() => setPage(p => p + 1)}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
    </CustomCard>
  </div>
);

};

export default DeletedSalesIndex;
