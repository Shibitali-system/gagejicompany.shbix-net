import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";

const SMS_PRICE = 21; // 1 SMS = TZS 21

const CustomCard = ({ title, children }) => (
  <div className={`
      bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
      flex flex-col items-start justify-center
      transition-all duration-200
      hover:bg-[#fdfdfd]
      transform hover:-translate-y-[2px] active:translate-y-[1px]
      shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
      font-sans
      w-full
  `}>
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
);

export default function SMSPanel() {
  const [officeId, setOfficeId] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [enteredBy, setEnteredBy] = useState("");

  const [balance, setBalance] = useState(0);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [smsCount, setSmsCount] = useState(0);

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [userEmail, setUserEmail] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 🔹 Pata taarifa za mtumiaji na ofisi
  useEffect(() => {
    const fetchUserOffice = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("Mtumiaji hajaingia kwenye mfumo");

        setUserEmail(authUser.email || null);

        // systems_users
        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser?.office_id) {
          setOfficeId(systemUser.office_id);
          setOfficeName(systemUser.office_name);
          setEnteredBy(systemUser.customer_name);
          setUserPhone(systemUser.customer_phone || null);
          await fetchBalance(systemUser.office_id);
          await fetchLogs(systemUser.office_id, 1);
          return;
        }

        // employees
        const { data: employee } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employee?.office_id) {
          setOfficeId(employee.office_id);
          setEnteredBy(employee.name);
          setUserPhone(employee.phone || null);

          const { data: office } = await supabase
            .from("systems_users")
            .select("office_name")
            .eq("office_id", employee.office_id)
            .maybeSingle();

          setOfficeName(office?.office_name || "Ofisi Haijulikani");
          await fetchBalance(employee.office_id);
          await fetchLogs(employee.office_id, 1);
        } else {
          toast.error("Ofisi haijatambuliwa kwa mtumiaji huyu.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Imeshindikana kupakia taarifa za mtumiaji/ofisi.");
      }
    };
    fetchUserOffice();
  }, []);

  // 🔹 Pata salio la SMS
  const fetchBalance = async (office_id) => {
    try {
      const { data, error } = await supabase
        .from("sms_balances")
        .select("balance")
        .eq("office_id", office_id)
        .maybeSingle();
      if (error) throw error;
      setBalance(data?.balance || 0);
    } catch (err) {
      console.error(err);
      toast.error("Imeshindikana kupakia salio la SMS.");
    }
  };

  // 🔹 Pata kumbukumbu za SMS
  const fetchLogs = async (office_id, pageNum = 1) => {
    setLoadingLogs(true);
    const limit = 20;
    const from = (pageNum - 1) * limit;
    const to = from + limit - 1;
    try {
      const { data, error } = await supabase
        .from("text_logs")
        .select("*")
        .eq("office_id", office_id)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      setLogs(data || []);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      toast.error("Imeshindikana kupakia kumbukumbu za SMS.");
    } finally {
      setLoadingLogs(false);
    }
  };

  // 🔹 Hesabu SMS kulingana na kiasi
  useEffect(() => {
    const amt = Number(rechargeAmount);
    setSmsCount(amt > 0 ? Math.floor(amt / SMS_PRICE) : 0);
  }, [rechargeAmount]);

  // 🔹 Rekebisha namba ya simu kwa malipo
  const normalizePhone = (phone) => {
    if (!phone) return "";
    let p = phone.toString().trim();
    if (p.startsWith("+")) p = p.slice(1);
    if (p.startsWith("255")) p = p.slice(3);
    if (p.startsWith("0")) p = p.slice(1);
    return p;
  };

  // 🔹 Lipa na kuchaji SMS kupitia AirPay
  const handleRechargePayment = async () => {
    if (!userEmail || !userPhone || !enteredBy || !officeId) {
      toast.error("Taarifa za mtumiaji hazijakamilika.");
      return;
    }

    const amount = Number(rechargeAmount);
    if (!amount || amount <= 0) {
      toast.error("Weka kiasi halali cha kuongeza SMS.");
      return;
    }

    setIsProcessing(true);

    try {
      const firstName = enteredBy.split(" ")[0] || "First";
      const lastName = enteredBy.split(" ")[1] || "Last";
      const phoneForAirPay = normalizePhone(userPhone);

      const now = new Date().toISOString();
      const { data: rechargeRecord, error: insertError } = await supabase
        .from("sms_recharges")
        .insert([{
          office_id: officeId,
          office_name: officeName,
          created_by: enteredBy,
          amount,
          sms_count: smsCount,
          status: "pending",
          created_at: now,
        }])
        .select()
        .single();
      if (insertError) throw insertError;

      const params = new URLSearchParams({
        buyerEmail: userEmail,
        buyerPhone: phoneForAirPay,
        buyerFirstName: firstName,
        buyerLastName: lastName,
        buyerAddress: "N/A",
        buyerCity: "Dar es Salaam",
        buyerState: "Dar es Salaam",
        buyerCountry: "Tanzania",
        buyerPinCode: "123456",
        orderid: `SMS-${rechargeRecord.id}`,
        amount: amount.toFixed(2),
        customvar: `SMS-${rechargeRecord.id}`,
        txnsubtype: 1000,
        wallet: 1,
        currency: 834,
        isocurrency: "TZS",
      });

      const checkoutWindow = window.open(
        `https://airpay-gateway.onrender.com/txn?${params.toString()}`,
        "_blank"
      );
      if (!checkoutWindow) throw new Error("Ruhusu popup kwenye kivinjari chako.");

      toast.success("Dirisha la malipo limefunguliwa! Kamilisha malipo.");
    } catch (err) {
      console.error(err);
      toast.error("Imeshindikana kuanzisha malipo: " + (err.message || err.toString()));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster
        position="top-center"
        toastOptions={{
          success: { style: { background: "#16a34a", color: "white" } },
          error: { style: { background: "#dc2626", color: "white" } },
        }}
      />

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Kichwa */}
        <CustomCard>
          <h1 className="text-2xl font-bold text-[#2563EB] mb-1">Paneli ya SMS</h1>
          <p className="text-gray-500 text-sm">Dhibiti salio la SMS, kuongeza SMS, na angalia SMS zilizotumwa.</p>
          <p className="text-sm mt-2">
            <strong>Ofisi:</strong> {officeName || "Haijulikani"} |{" "}
            <strong>Umeingia kama:</strong> {enteredBy || "Haijulikani"}
          </p>
        </CustomCard>

        {/* Salio & Kuchaji */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Salio */}
          <CustomCard>
            <p className="text-gray-500 text-sm mb-2">Salio la SMS</p>
            <p className="text-3xl font-bold text-[#2563EB]">{balance} SMS</p>
            <p className="text-gray-600 text-sm mt-1">≈ TZS {balance * SMS_PRICE}</p>
          </CustomCard>

          {/* Kuchaji */}
          <CustomCard title="Ongeza SMS">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="Weka kiasi (TZS)"
                className="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
              <button
                onClick={handleRechargePayment}
                disabled={isProcessing}
                className="bg-[#2563EB] text-white px-6 py-2 rounded-[4px] hover:bg-[#1e40af] transition disabled:opacity-50"
              >
                {isProcessing ? "Inachakata..." : "Chaji"}
              </button>
            </div>
            {smsCount > 0 && (
              <p className="mt-2 text-gray-600 text-sm">
                Kiasi hiki kitakupa <strong>{smsCount}</strong> SMS (SMS 1 = TZS {SMS_PRICE})
              </p>
            )}
          </CustomCard>
        </div>

        {/* Kumbukumbu za SMS */}
        <CustomCard title="Kumbukumbu za SMS">
          {loadingLogs ? (
            <p className="text-gray-500 text-center py-4">Inapakia...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Hakuna SMS zilizotumwa bado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border border-gray-200 rounded-xl">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 border-b">Kwenda</th>
                    <th className="px-3 py-2 border-b">Ujumbe</th>
                    <th className="px-3 py-2 border-b">Hali</th>
                    <th className="px-3 py-2 border-b">Ilitumwa</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b">{log.to_number}</td>
                      <td className="px-3 py-2 border-b">{log.message}</td>
                      <td className="px-3 py-2 border-b">{log.status}</td>
                      <td className="px-3 py-2 border-b">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between mt-2">
                <button
                  onClick={() => fetchLogs(officeId, page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Nyuma
                </button>
                <span className="text-gray-500">Ukurasa {page}</span>
                <button
                  onClick={() => fetchLogs(officeId, page + 1)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Mbele
                </button>
              </div>
            </div>
          )}
        </CustomCard>

      </div>
    </div>
  );
}
