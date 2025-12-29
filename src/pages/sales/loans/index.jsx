import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../../supabaseClient";
import { sendNotification } from "../../utils/sendNotification";
import { FaSearch, FaMoneyBillWave, FaChartLine, FaPlus, FaBolt, FaArrowLeft } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const LoanManagement = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [newPayment, setNewPayment] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  // SMS states
  const [selectedForSMS, setSelectedForSMS] = useState([]);
  const [smsBalance, setSmsBalance] = useState(0);
  const [smsSending, setSmsSending] = useState(false);
  const [smsFilter, setSmsFilter] = useState("all");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [recharging, setRecharging] = useState(false);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
const [showSelectedCustomers, setShowSelectedCustomers] = useState(false);


  // Load current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadingUser(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("No authenticated user");

        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee) setUser(employee);
        else {
          const { data: sysUser } = await supabase
            .from("systems_users")
            .select("*")
            .eq("auth_user_id", authUser.id)
            .maybeSingle();
          if (sysUser) setUser(sysUser);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user info");
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch sales
  const fetchSales = async () => {
    if (!user?.office_id) return;
    setLoading(true);
    try {
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("*")
        .gt("loan_amount", 0)
        .eq("office_id", user.office_id)
        .order("created_at", { ascending: false });
      if (salesError) throw salesError;

      const [customersRes, employeesRes, sysUsersRes, loanPaymentsRes] = await Promise.all([
        supabase.from("customers").select("id, name, phone"),
        supabase.from("employees").select("id, name"),
        supabase.from("systems_users").select("id, customer_name"),
        supabase.from("loan_payments").select("*"),
      ]);

      const customers = customersRes.data || [];
      const employees = employeesRes.data || [];
      const systemUsers = sysUsersRes.data || [];
      const loanPayments = loanPaymentsRes.data || [];

      const joinedSales = salesData.map((sale) => {
        const customer = customers.find(c => c.id === sale.customer_id);
        const empSeller = employees.find(e => e.id === sale.seller_id);
        const sysSeller = systemUsers.find(u => u.id === sale.seller_id);
        const seller = empSeller || sysSeller;

        const paymentsForSale = loanPayments
          .filter(p => p.sale_id === sale.id)
          .map(p => {
            const enteredBy = employees.find(e => e.id === p.entered_by) || systemUsers.find(u => u.id === p.entered_by);
            return { ...p, entered_by_name: enteredBy?.name || enteredBy?.customer_name || "N/A" };
          });

        const loan_payment_date = sale.loan_payment_date
          ? new Date(sale.loan_payment_date)
          : new Date(sale.created_at);

        return {
          ...sale,
          customers: customer ? { name: customer.name, phone: customer.phone } : { name: "N/A", phone: "" },
          seller_name: seller?.name || seller?.customer_name || "N/A",
          loan_payments: paymentsForSale,
          loan_payment_date,
          balance: sale.loan_amount || 0,
        };
      });

      setSales(joinedSales);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchSales(); }, [user]);

  // Fetch SMS balance
  const fetchSmsBalance = async () => {
    if (!user?.office_id) return;
    try {
      const { data, error } = await supabase
        .from("sms_balance")
        .select("balance")
        .eq("office_id", user.office_id)
        .maybeSingle();
      if (error) throw error;
      setSmsBalance(data?.balance || 0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load SMS balance");
    }
  };
  useEffect(() => { if (user) fetchSmsBalance(); }, [user]);

  // Filtered sales for search
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter(
      s => s.customers?.name?.toLowerCase().includes(term) ||
           s.id.toString().includes(term) ||
           s.comment?.toLowerCase().includes(term)
    );
  }, [sales, searchTerm]);

 // Replace existing smsFilteredSales and analytics with this

// Refined SMS filtering
const smsFilteredSales = useMemo(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return sales.filter(s => {
    if (!s.loan_payment_date) return false;
    const dueDate = new Date(s.loan_payment_date);
    const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

    if (smsFilter === "custom") {
      if (!customFromDate || !customToDate) return true;
      const from = new Date(customFromDate);
      const to = new Date(customToDate);
      return dueDate >= from && dueDate <= to;
    }

    switch (smsFilter) {
      case "overdue": return diffDays < 0;       // Only past due
      case "today": return diffDays === 0;       // Due today
      case "3days": return diffDays >= 0 && diffDays <= 3;
      case "7days": return diffDays >= 0 && diffDays <= 7;
      case "30days": return diffDays >= 0 && diffDays <= 30;
      default: return true;
    }
  });
}, [sales, smsFilter, customFromDate, customToDate]);



const selectedAnalytics = useMemo(() => {
  const selectedSales = smsFilteredSales.filter(s => selectedForSMS.includes(s.id));
  const totalLoan = selectedSales.reduce((sum, s) => sum + (s.loan_amount || 0), 0);
  const totalPaid = selectedSales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
  const customerCount = selectedSales.length;
  const customerDetails = selectedSales.map(s => ({
    name: s.customers?.name || "N/A",
    dueDate: s.loan_payment_date.toLocaleDateString(),
    balance: s.balance.toLocaleString()
  }));
  return { totalLoan, totalPaid, totalBalance: totalLoan - totalPaid, customerCount, customerDetails };
}, [smsFilteredSales, selectedForSMS]);



  // Auto-select filtered loans for SMS when filter changes
useEffect(() => {
  const filteredIds = smsFilteredSales.map(sale => sale.id);
  setSelectedForSMS(filteredIds);
}, [smsFilter, customFromDate, customToDate, smsFilteredSales]);


  // Analytics
  const analytics = useMemo(() => {
    const totalLoan = sales.reduce((sum, s) => sum + (s.loan_amount || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    return { totalLoan, totalPaid, totalBalance: totalLoan - totalPaid };
  }, [sales]);

  // Add payment with notifications
const handleAddPayment = async (saleId) => {
  if (!newPayment || isNaN(newPayment)) return toast.error("Enter a valid amount");
  const amount = parseFloat(newPayment);
  const sale = sales.find(s => s.id === saleId);
  if (!sale) return;

  try {
    setAddingPayment(true);

    // 1️⃣ Insert payment
    const { error: insertError } = await supabase
      .from("loan_payments")
      .insert([{ sale_id: saleId, amount, entered_by: user.id }]);
    if (insertError) throw insertError;

    // 2️⃣ Update sale
    const newPaid = (sale.paid_amount || 0) + amount;
    const newLoan = Math.max((sale.loan_amount || 0) - amount, 0);

    const { error: updateError } = await supabase
      .from("sales")
      .update({ paid_amount: newPaid, loan_amount: newLoan })
      .eq("id", saleId);
    if (updateError) throw updateError;

    // 3️⃣ Send notifications
    await sendNotification({
      auth_user_id: user.id,
      office_id: user.office_id,
      title: "Payment Added",
      message: `${user.name} added a payment of ${amount} for sale #${saleId} (Customer: ${sale.customer_name})`,
      link: `/pharmacy/dashboard/sales/${saleId}`, // link to the sale page
      type: "both", // in-app + push
    });

    // 4️⃣ Browser notification
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Payment Added", {
          body: `${user.name} added a payment of ${amount} for sale #${saleId}`,
        });
      } else if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }

    toast.success("Payment added successfully");
    setNewPayment("");
    setSelectedSale(null);
    fetchSales();

  } catch (err) {
    console.error(err);
    toast.error(err.message || "Failed to add payment");
  } finally {
    setAddingPayment(false);
  }
};


  // Export Excel
  const exportToExcel = () => {
    if (!filteredSales.length) return toast.error("No data to export");

    const ws = XLSX.utils.json_to_sheet(filteredSales.map(s => ({
      "Sale ID": s.id,
      "Customer": s.customers?.name || "N/A",
      "Loan Amount": s.loan_amount,
      "Paid Amount": s.paid_amount,
      "Balance": s.balance,
      "Due Date": s.loan_payment_date.toLocaleDateString(),
      "Seller": s.seller_name,
      "Created": new Date(s.created_at).toLocaleDateString(),
      "Last Payment": s.loan_payments?.length
        ? new Date(s.loan_payments[s.loan_payments.length - 1].created_at).toLocaleDateString()
        : "-"
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loans");
    XLSX.writeFile(wb, `loan_sales_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // SMS handlers
  const handleSelectForSMS = (saleId) => {
    setSelectedForSMS(prev => prev.includes(saleId) ? prev.filter(id => id !== saleId) : [...prev, saleId]);
  };

  const handleSendSMS = async () => {
    if (!selectedForSMS.length) return toast.error("Chagua wateja wa SMS");
    if (smsBalance <= 0) return toast.error("Low SMS balance. Recharge first.");

    try {
      setSmsSending(true);
      const salesToSend = smsFilteredSales.filter(s => selectedForSMS.includes(s.id));

      for (const sale of salesToSend) {
        await fetch("/api/send-sms", {
          method: "POST",
          body: JSON.stringify({
            phone: sale.customers.phone,
            message: `Dear ${sale.customers.name}, your payment of ${sale.balance} TZS is due on ${sale.loan_payment_date.toLocaleDateString()}.`
          })
        });

        const newBalance = smsBalance - 28;
        await supabase.from("sms_balance").update({ balance: newBalance }).eq("office_id", user.office_id);
        setSmsBalance(newBalance);
      }

      toast.success("SMS sent successfully");
      setSelectedForSMS([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send SMS");
    } finally {
      setSmsSending(false);
    }
  };

const downloadSelectedCustomersPDF = () => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Selected Customers Report", 14, 20);

  const tableColumn = ["Customer Name", "Due Date", "Balance"];
  const tableRows = selectedAnalytics.customerDetails.map(c => [
    c.name,
    c.dueDate,
    c.balance + " TZS"
  ]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    theme: "grid",
    headStyles: { fillColor: [34, 197, 94] }, // green header
  });

  doc.save(`selected_customers_${new Date().toISOString().split("T")[0]}.pdf`);
};

// ---------------------- Summary Card Component ----------------------
const SummaryCard = ({ title, value, valueColor }) => (
  <div
    className={`
      bg-white border border-[#e5e7eb] rounded-[12px] px-5 py-4
      flex flex-col items-center justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
    `}
    style={{ willChange: 'transform' }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>{value}</p>
  </div>
);

  const handleRechargeSMS = async () => {
    if (!rechargeAmount || isNaN(rechargeAmount) || parseInt(rechargeAmount) <= 0) return toast.error("Enter valid recharge amount");
    try {
      setRecharging(true);
      const newBalance = smsBalance + parseInt(rechargeAmount);
      await supabase.from("sms_balance").update({ balance: newBalance }).eq("office_id", user.office_id);
      setSmsBalance(newBalance);
      toast.success("SMS balance recharged");
      setRechargeAmount("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to recharge SMS");
    } finally {
      setRecharging(false);
    }
  };

  if (loadingUser) return <p className="p-6 text-gray-600">Loading user info...</p>;

 return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />
    
    {/* Kiungo cha Kurudi */}
    <div className="mb-4">
      <Link to="../sales" className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline">
        <FaArrowLeft /> Rudi kwenye Orodha ya Mauzo
      </Link>
    </div>

    <div className="max-w-7xl mx-auto space-y-6">

      {/* Kichwa cha Ukurasa */}
      <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] mb-4 flex items-center gap-2">
        <FaChartLine /> Usimamizi wa Mikopo
      </h1>

      {/* Kadi za Muhtasari wa Takwimu */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Jumla ya Mikopo" value={`TZS ${analytics.totalLoan.toLocaleString()}`} />
        <SummaryCard title="Jumla Iliyolipwa" value={`TZS ${analytics.totalPaid.toLocaleString()}`} valueColor="text-green-600" />
        <SummaryCard title="Jumla ya Salio" value={`TZS ${analytics.totalBalance.toLocaleString()}`} />
      </div>

      {/* Udhibiti wa SMS / Vichujio */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-4 shadow flex flex-wrap gap-4 items-center">
        <span className="whitespace-nowrap font-medium">Salio la SMS: {smsBalance} TZS</span>
        <input
          type="number"
          placeholder="Kiasi cha kuongeza"
          value={rechargeAmount}
          onChange={(e) => setRechargeAmount(e.target.value)}
          className="border px-2 py-1 rounded w-32"
        />
        <button
          disabled={recharging}
          onClick={handleRechargeSMS}
          className="bg-[#2563EB] text-white px-4 py-1 rounded hover:bg-red-600 flex items-center gap-1"
        >
          <FaBolt /> {recharging ? "Inaongeza..." : "Ongeza Salio"}
        </button>

        <select
          value={smsFilter}
          onChange={(e) => setSmsFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="all">Zote</option>
          <option value="overdue">Zilizochelewa</option>
          <option value="today">Zinafika Leo</option>
          <option value="3days">Zinafika ndani ya Siku 3</option>
          <option value="7days">Zinafika ndani ya Siku 7</option>
          <option value="30days">Zinafika ndani ya Siku 30</option>
          <option value="custom">Kipindi Maalum</option>
        </select>

        {smsFilter === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFromDate} onChange={(e) => setCustomFromDate(e.target.value)} className="border px-2 py-1 rounded" />
            <span>hadi</span>
            <input type="date" value={customToDate} onChange={(e) => setCustomToDate(e.target.value)} className="border px-2 py-1 rounded" />
          </div>
        )}

        <button
          disabled={smsSending}
          onClick={handleSendSMS}
          className="bg-[#2563EB] text-white px-4 py-1 rounded hover:bg-red-600"
        >
          {smsSending ? "Inatuma..." : "Tuma SMS"}
        </button>
      </div>

      {/* Tafuta & Hamisha */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-4 shadow flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Tafuta mteja au ID ya mauzo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-2 py-1 rounded w-full sm:w-64"
          />
        </div>
        <button
          onClick={exportToExcel}
          className="bg-[#2563EB] text-white px-4 py-2 rounded flex items-center gap-2 ml-auto hover:bg-red-600"
        >
          <FaMoneyBillWave /> Hamisha Excel
        </button>
      </div>

      {/* Kadi za Takwimu za Wateja Waliochaguliwa */}
      {selectedForSMS.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <SummaryCard title="Jumla ya Mikopo Iliyochaguliwa" value={`TZS ${selectedAnalytics.totalLoan.toLocaleString()}`} />
          <SummaryCard title="Jumla Iliyolipwa Iliyochaguliwa" value={`TZS ${selectedAnalytics.totalPaid.toLocaleString()}`} valueColor="text-green-600" />
          <SummaryCard title="Salio la Chaguliwa" value={`TZS ${selectedAnalytics.totalBalance.toLocaleString()}`} />
          <SummaryCard title="Wateja Waliochaguliwa" value={selectedAnalytics.customerCount} />
        </div>
      )}

      {/* Popup ya Wateja Waliochaguliwa */}
      {showSelectedCustomers && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 px-2">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Wateja Waliochaguliwa</h3>
            <div className="overflow-y-auto max-h-64">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-2 py-1 text-left">Jina la Mteja</th>
                    <th className="px-2 py-1 text-left">Tarehe ya Malipo</th>
                    <th className="px-2 py-1 text-right">Salio</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAnalytics.customerDetails.map((c, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">{c.name}</td>
                      <td className="px-2 py-1">{c.dueDate}</td>
                      <td className="px-2 py-1 text-right">{c.balance} TZS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowSelectedCustomers(false)}
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
              >
                Funga
              </button>
              <button
                onClick={downloadSelectedCustomersPDF}
                className="bg-[#2563EB] text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Pakua PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jedwali la Mikopo */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#2563EB] text-white text-xs uppercase tracking-wide">
            <tr>
              <th className="px-2 py-2 text-center">SMS</th>
              <th className="px-2 py-2 text-left">ID ya Mauzo</th>
              <th className="px-2 py-2 text-left">Mteja</th>
              <th className="px-2 py-2 text-left">Mikopo</th>
              <th className="px-2 py-2 text-left">Iliyolipwa</th>
              <th className="px-2 py-2 text-left">Salio</th>
              <th className="px-2 py-2 text-left">Tarehe ya Malipo</th>
              <th className="px-2 py-2 text-left">Malipo</th>
              <th className="px-2 py-2 text-left">Ongeza Malipo</th>
              <th className="px-2 py-2 text-left">Muuzaji</th>
              <th className="px-2 py-2 text-left">Iliundwa</th>
              <th className="px-2 py-2 text-left">Malipo ya Mwisho</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="12" className="p-4 text-center text-gray-600">Inapakia...</td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan="12" className="p-4 text-center text-gray-600">Hakuna mikopo iliyopatikana</td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-gray-50 align-top">
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedForSMS.includes(sale.id)}
                      onChange={() => handleSelectForSMS(sale.id)}
                    />
                  </td>
                  <td className="px-2 py-2">{sale.id}</td>
                  <td className="px-2 py-2">{sale.customers?.name || "N/A"}</td>
                  <td className="px-2 py-2">{(sale.loan_amount + (sale.paid_amount || 0)).toLocaleString()}</td>
                  <td className="px-2 py-2">{(sale.paid_amount || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 font-semibold text-[#2563EB]">{sale.balance.toLocaleString()}</td>
                  <td className="px-2 py-2">{sale.loan_payment_date.toLocaleDateString()}</td>
                  <td className="px-2 py-2">
                    {sale.loan_payments?.length > 0 ? (
                      <div className="space-y-1">
                        {sale.loan_payments.map((p) => (
                          <div key={p.id} className="text-xs bg-gray-50 p-1 rounded border">
                            <p>💰 <span className="font-semibold">{p.amount.toLocaleString()} TZS</span></p>
                            <p className="text-gray-500">{new Date(p.created_at).toLocaleDateString()} — {p.entered_by_name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Hakuna malipo</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {selectedSale === sale.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={newPayment} onChange={(e) => setNewPayment(e.target.value)} className="border px-1 py-0.5 rounded w-20" />
                        <button
                          disabled={addingPayment}
                          onClick={() => handleAddPayment(sale.id)}
                          className="bg-[#2563EB] text-white px-2 py-0.5 rounded text-xs hover:bg-red-600"
                        >
                          {addingPayment ? "..." : "Hifadhi"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedSale(sale.id)}
                        className="bg-[#2563EB] text-white px-2 py-0.5 rounded text-xs hover:bg-red-600"
                      >
                        <FaPlus />
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2">{sale.seller_name}</td>
                  <td className="px-2 py-2">{new Date(sale.created_at).toLocaleDateString()}</td>
                  <td className="px-2 py-2">
                    {sale.loan_payments?.length
                      ? new Date(sale.loan_payments[sale.loan_payments.length - 1].created_at).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);


};

export default LoanManagement;
