import { Link } from "react-router-dom";
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { FaSearch, FaMoneyBillWave, FaChartLine, FaPlus } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
    style={{ willChange: "transform" }}
  >
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <p className={`text-xl font-semibold mt-1 ${valueColor || "text-[#2563EB]"}`}>
      {value}
    </p>
  </div>
);

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
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [showSelectedCustomers, setShowSelectedCustomers] = useState(false);
  const [selectedSMSTemplate, setSelectedSMSTemplate] = useState("default");
  const [officesMap, setOfficesMap] = useState({});

useEffect(() => {
  const fetchOffices = async () => {
    try {
      // Pata list ya unique office_ids kutoka sales
      const officeIds = [...new Set(sales.map(s => s.office_id).filter(Boolean))];

      if (!officeIds.length) return;

      const { data: offices, error } = await supabase
        .from("systems_users")
        .select("office_id, office_name, customer_phone")
        .in("office_id", officeIds);

      if (error) throw error;

      // Convert to map: office_id => { office_name, customer_phone }
      const map = {};
      offices.forEach(o => {
        map[o.office_id] = {
          office_name: o.office_name,
          customer_phone: o.customer_phone,
        };
      });

      setOfficesMap(map);
    } catch (err) {
      console.error("Failed to fetch offices:", err);
    }
  };

  if (sales.length) fetchOffices();
}, [sales]);


const SMS_TEMPLATES = {
  default: (sale) => {
    const office = officesMap[sale.office_id] || {};
    return `Ndugu ${sale.customers.name},
Kumbusho: una salio la deni lako la ${sale.balance.toLocaleString()} TZS.
Ofisi: ${office.office_name || "N/A"}, Simu: ${office.customer_phone || "N/A"}.
Tafadhali fanya malipo kabla ya ${sale.loan_payment_date.toLocaleDateString()}.
Asante.`;
  },

  template1: (sale) => {
    const office = officesMap[sale.office_id] || {};
    return `Hello ${sale.customers.name},
Salio la deni lako ni ${sale.balance.toLocaleString()} TZS.
Ofisi: ${office.office_name || "N/A"}, Simu: ${office.customer_phone || "N/A"}.
Tunakuomba lipa kabla ya ${sale.loan_payment_date.toLocaleDateString()}.`;
  },

  template2: (sale) => {
    const office = officesMap[sale.office_id] || {};
    return `Habari ${sale.customers.name},
Umechelewa kulipa deni la ${sale.balance.toLocaleString()} TZS.
Ofisi: ${office.office_name || "N/A"}, Simu: ${office.customer_phone || "N/A"}.
Tafadhali lipa haraka ili kuepuka usumbufu.`;
  },

  template3: (sale) => {
    const office = officesMap[sale.office_id] || {};
    return `Karibu ${sale.customers.name},
Tunakumbusha kuhusu salio la deni lako la ${sale.balance.toLocaleString()} TZS.
Ofisi: ${office.office_name || "N/A"}, Simu: ${office.customer_phone || "N/A"}.
Tarehe ya mwisho ya malipo: ${sale.loan_payment_date.toLocaleDateString()}.`;
  },
};




  // Load current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadingUser(true);
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
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

  const fetchSmsBalance = async (officeId) => {
    if (!officeId) return;
    try {
      const { data, error } = await supabase
        .from("sms_balances")
        .select("balance")
        .eq("office_id", officeId)
        .maybeSingle();

      if (error) throw error;
      setSmsBalance(data?.balance || 0);
    } catch (err) {
      console.error(err);
      toast.error("Imeshindikana kupakia salio la SMS");
    }
  };

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

      const [customersRes, employeesRes, sysUsersRes, loanPaymentsRes] =
        await Promise.all([
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
        const customer = customers.find((c) => c.id === sale.customer_id);
        const empSeller = employees.find((e) => e.id === sale.seller_id);
        const sysSeller = systemUsers.find((u) => u.id === sale.seller_id);
        const seller = empSeller || sysSeller;

        const paymentsForSale = loanPayments
          .filter((p) => p.sale_id === sale.id)
          .map((p) => {
            const enteredBy =
              employees.find((e) => e.id === p.entered_by) ||
              systemUsers.find((u) => u.id === p.entered_by);
            return {
              ...p,
              entered_by_name:
                enteredBy?.name || enteredBy?.customer_name || "N/A",
            };
          });

        const loan_payment_date = sale.loan_payment_date
          ? new Date(sale.loan_payment_date)
          : new Date(sale.created_at);

        const totalLoan = (sale.loan_amount || 0) + (sale.paid_amount || 0);
        const balance = totalLoan - (sale.paid_amount || 0);

        return {
          ...sale,
          customers: customer
            ? { name: customer.name, phone: customer.phone }
            : { name: "N/A", phone: "" },
          seller_name: seller?.name || seller?.customer_name || "N/A",
          loan_payments: paymentsForSale,
          loan_payment_date,
          balance,
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

  useEffect(() => {
    if (user?.office_id) {
      fetchSales();
      fetchSmsBalance(user.office_id);
    }
  }, [user]);

  // Filtered sales for search
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const term = searchTerm.toLowerCase();
    return sales.filter(
      (s) =>
        s.customers?.name?.toLowerCase().includes(term) ||
        s.id.toString().includes(term) ||
        s.comment?.toLowerCase().includes(term)
    );
  }, [sales, searchTerm]);

  // Refined SMS filtering
  const smsFilteredSales = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return sales.filter((s) => {
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
        case "overdue":
          return diffDays < 0;
        case "today":
          return diffDays === 0;
        case "3days":
          return diffDays >= 0 && diffDays <= 3;
        case "7days":
          return diffDays >= 0 && diffDays <= 7;
        case "30days":
          return diffDays >= 0 && diffDays <= 30;
        default:
          return true;
      }
    });
  }, [sales, smsFilter, customFromDate, customToDate]);

  const selectedAnalytics = useMemo(() => {
    const selectedSales = smsFilteredSales.filter((s) =>
      selectedForSMS.includes(s.id)
    );
    const totalLoan = selectedSales.reduce(
      (sum, s) => sum + ((s.loan_amount || 0) + (s.paid_amount || 0)),
      0
    );
    const totalPaid = selectedSales.reduce(
      (sum, s) => sum + (s.paid_amount || 0),
      0
    );
    const customerCount = selectedSales.length;
    const customerDetails = selectedSales.map((s) => ({
      name: s.customers?.name || "N/A",
      dueDate: s.loan_payment_date.toLocaleDateString(),
      balance: s.balance.toLocaleString(),
    }));
    return {
      totalLoan,
      totalPaid,
      totalBalance: totalLoan - totalPaid,
      customerCount,
      customerDetails,
    };
  }, [smsFilteredSales, selectedForSMS]);

  useEffect(() => {
    const filteredIds = smsFilteredSales.map((sale) => sale.id);
    setSelectedForSMS(filteredIds);
  }, [smsFilter, customFromDate, customToDate, smsFilteredSales]);

  const analytics = useMemo(() => {
    const totalLoan = sales.reduce(
      (sum, s) => sum + ((s.loan_amount || 0) + (s.paid_amount || 0)),
      0
    );
    const totalPaid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    return { totalLoan, totalPaid, totalBalance: totalLoan - totalPaid };
  }, [sales]);

  const handleAddPayment = async (saleId) => {
    if (!newPayment || isNaN(newPayment))
      return toast.error("Enter a valid amount");
    const amount = parseFloat(newPayment);
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    try {
      setAddingPayment(true);

      const { error: insertError } = await supabase
        .from("loan_payments")
        .insert([{ sale_id: saleId, amount, entered_by: user.id }]);
      if (insertError) throw insertError;

      const newPaid = (sale.paid_amount || 0) + amount;
      const newLoan = Math.max((sale.loan_amount || 0) - amount, 0);

      const { error: updateError } = await supabase
        .from("sales")
        .update({ paid_amount: newPaid, loan_amount: newLoan })
        .eq("id", saleId);
      if (updateError) throw updateError;

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

  const exportToExcel = () => {
    if (!filteredSales.length) return toast.error("No data to export");

    const ws = XLSX.utils.json_to_sheet(
      filteredSales.map((s) => ({
        "Sale ID": s.id,
        Customer: s.customers?.name || "N/A",
        "Loan Amount": (s.loan_amount || 0) + (s.paid_amount || 0),
        "Paid Amount": s.paid_amount || 0,
        Balance: s.balance,
        "Due Date": s.loan_payment_date.toLocaleDateString(),
        Seller: s.seller_name,
        Created: new Date(s.created_at).toLocaleDateString(),
        "Last Payment": s.loan_payments?.length
          ? new Date(
              s.loan_payments[s.loan_payments.length - 1].created_at
            ).toLocaleDateString()
          : "-",
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loans");
    XLSX.writeFile(
      wb,
      `loan_sales_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const handleSelectForSMS = (saleId) => {
    setSelectedForSMS((prev) =>
      prev.includes(saleId)
        ? prev.filter((id) => id !== saleId)
        : [...prev, saleId]
    );
  };

const normalizePhone = (phone) => {
  if (!phone) return null;

  let clean = phone.replace(/\D/g, "");

  if (clean.startsWith("0")) {
    clean = "255" + clean.substring(1);
  }

  if (clean.startsWith("7") || clean.startsWith("6")) {
    clean = "255" + clean;
  }

  if (!clean.startsWith("255")) return null;

  return clean;
};

  const handleSendSMS = async () => {
  if (!selectedForSMS.length) return toast.error("Chagua wateja wa kutumiwa SMS");
  if (smsBalance <= 0) return toast.error("Salio la SMS limeisha");

  if (!user?.office_id) {
    toast.error("Taarifa za ofisi hazijapatikana");
    return;
  }

  try {
    setSmsSending(true);

    const salesToSend = smsFilteredSales.filter(s =>
      selectedForSMS.includes(s.id)
    );

    let sentCount = 0;

    for (const sale of salesToSend) {
      const rawPhone = sale.customers?.phone;
      const cleanPhone = normalizePhone(rawPhone);

      if (!cleanPhone) {
        console.warn("Namba batili:", rawPhone);
        continue;
      }

      // Chagua template
      let smsText = SMS_TEMPLATES[selectedSMSTemplate]?.(sale);
      
      // Automatic default for overdue if template 2 is not selected
      const now = new Date();
      const dueDate = new Date(sale.loan_payment_date);
      const diffDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));

      if (diffDays < 0 && selectedSMSTemplate === "default") {
        smsText = SMS_TEMPLATES.template2(sale); // overdue auto
      }

      try {
        const smsRes = await fetch(
          "https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/sms-system",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              office_id: user.office_id,
              to: cleanPhone,
              text: smsText,
            }),
          }
        );

        const smsData = await smsRes.json();

        if (!smsRes.ok) {
          console.warn("SMS haijatuma:", smsData);
          continue;
        }

        sentCount++;
        setSmsBalance(prev => prev - 1);

      } catch (smsErr) {
        console.error("SMS error:", smsErr);
      }
    }

    if (sentCount > 0) {
      toast.success(`SMS ${sentCount} zimetumwa kikamilifu`);
    } else {
      toast.error("Hakuna SMS iliyotumwa (angalia namba au salio)");
    }

    setSelectedForSMS([]);

  } catch (err) {
    console.error(err);
    toast.error("Imeshindikana kutuma SMS");
  } finally {
    setSmsSending(false);
  }
};



  const downloadSelectedCustomersPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Selected Customers Report", 14, 20);

    const tableColumn = ["Customer Name", "Due Date", "Balance"];
    const tableRows = selectedAnalytics.customerDetails.map((c) => [
      c.name,
      c.dueDate,
      c.balance + " TZS",
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94] },
    });

    doc.save(`selected_customers_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (loadingUser)
    return <p className="p-6 text-gray-600">Loading user info...</p>;

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
    <Toaster position="top-right" />

    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#2563EB] mb-4 flex items-center gap-2">
        <FaChartLine /> Usimamizi wa Madeni
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Jumla ya Mikopo"
          value={`TZS ${analytics.totalLoan.toLocaleString()}`}
        />
        <SummaryCard
          title="Jumla Iliyolipwa"
          value={`TZS ${analytics.totalPaid.toLocaleString()}`}
          valueColor="text-green-600"
        />
        <SummaryCard
          title="Jumla ya Salio"
          value={`TZS ${analytics.totalBalance.toLocaleString()}`}
        />
      </div>

      {/* SMS Balance */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-4 shadow">
        <p className="text-sm text-gray-500">Salio la SMS</p>
        <p className="text-xl font-bold text-[#2563EB]">{smsBalance} SMS</p>
      </div>

      {/* SMS Controls */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-4 shadow flex flex-col gap-4">
        {/* Filter */}
        <div className="flex flex-wrap gap-2 items-center">
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
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="border px-2 py-1 rounded"
              />
              <span>hadi</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="border px-2 py-1 rounded"
              />
            </div>
          )}
        </div>

        {/* SMS Templates */}
        <div className="flex flex-col gap-4">
          <p className="font-semibold">Chagua SMS Template:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(SMS_TEMPLATES).map(([key, templateFn]) => (
              <div
                key={key}
                className={`border rounded p-3 cursor-pointer hover:shadow-md transition 
                  ${selectedSMSTemplate === key ? "border-blue-500 shadow-md" : "border-gray-300"}`}
              >
                <p className="text-sm mb-2 font-semibold">
                  {key === "default"
                    ? "Kumbusho ya Kawaida"
                    : key === "template1"
                    ? "Template 1"
                    : key === "template2"
                    ? "Template 2 (Waliochelewa)"
                    : key === "template3"
                    ? "Template 3"
                    : key}
                </p>

                <textarea
                  readOnly
                  className="w-full text-xs border p-1 rounded bg-gray-50 resize-none"
                  rows={4}
                  value={templateFn({
                    customers: { name: "Mteja" },
                    balance: 12345,
                    loan_payment_date: new Date(),
                  })}
                />

                <button
                  onClick={() => setSelectedSMSTemplate(key)}
                  className={`mt-2 w-full text-white px-2 py-1 rounded hover:bg-red-600
                    ${selectedSMSTemplate === key ? "bg-blue-600" : "bg-blue-500"}`}
                >
                  Chagua Hii
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Send SMS Button */}
        <button
          disabled={smsSending}
          onClick={handleSendSMS}
          className="bg-[#2563EB] text-white px-4 py-1 rounded hover:bg-red-600 w-32"
        >
          {smsSending ? "Inatuma..." : "Tuma SMS"}
        </button>
      </div>

      {/* Search & Export */}
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

      {/* Selected Customer Analytics Cards */}
      {selectedForSMS.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <SummaryCard
            title="Jumla ya Mikopo Iliyochaguliwa"
            value={`TZS ${selectedAnalytics.totalLoan.toLocaleString()}`}
          />
          <SummaryCard
            title="Jumla Iliyolipwa Iliyochaguliwa"
            value={`TZS ${selectedAnalytics.totalPaid.toLocaleString()}`}
            valueColor="text-green-600"
          />
          <SummaryCard
            title="Salio la Chaguliwa"
            value={`TZS ${selectedAnalytics.totalBalance.toLocaleString()}`}
          />
          <SummaryCard
            title="Wateja Waliochaguliwa"
            value={selectedAnalytics.customerCount}
          />
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

      {/* Loan Table */}
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
                        <input
                          type="number"
                          value={newPayment}
                          onChange={(e) => setNewPayment(e.target.value)}
                          className="border px-1 py-0.5 rounded w-20"
                        />
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
