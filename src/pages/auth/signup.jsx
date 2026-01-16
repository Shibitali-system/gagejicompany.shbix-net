import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { FaUser, FaEnvelope, FaLock, FaMapMarkerAlt, FaPhone, FaBuilding } from "react-icons/fa";

const Signup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("Tanzania");
  const [region, setRegion] = useState("");
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [trialDays, setTrialDays] = useState(3);


  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await axios.get("https://restcountries.com/v3.1/all?fields=name,cca2");
        const sorted = res.data
          .map(c => ({ name: c.name.common, code: c.cca2 }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(sorted);
      } catch (error) {
        console.error("Failed to load countries", error);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await axios.post("https://countriesnow.space/api/v0.1/countries/states", { country });
        const states = res.data.data?.states?.map(s => s.name) || [];
        setRegions(states);
      } catch (err) {
        console.error("Failed to load regions", err);
      }
    };
    if (country) fetchRegions();
  }, [country]);

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 100);
  }, []);

  const generateUniqueRegistration = async () => {
  const year = new Date().getFullYear();
  let unique = false;
  let regNo = "";

  while (!unique) {
    const { data: lastUser } = await supabase
      .from("systems_users")
      .select("customer_registration_no")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let lastSequential = 0;

    if (lastUser?.customer_registration_no) {
      // mfano: SHIB-2025-00000001-MAIN
      const parts = lastUser.customer_registration_no.split("-");
      // parts = ["SHIB","2025","00000001","MAIN"]
      lastSequential = parseInt(parts[2], 10);
    }

    const nextSequential = (lastSequential + 1).toString().padStart(8, "0");

    // 👉 hapa tunaongeza -MAIN
    regNo = `SHIB-${year}-${nextSequential}-MAIN`;

    const { data } = await supabase
      .from("systems_users")
      .select("customer_registration_no")
      .eq("customer_registration_no", regNo)
      .single();

    if (!data) unique = true;
  }

  return regNo;
};

  const handleSignup = async (e) => {
  e.preventDefault();
  if (password !== confirmPassword) {
    toast.error("Passwords do not match!");
    return;
  }
  setLoading(true);

  try {
    const registrationNo = await generateUniqueRegistration();

    const fullPermissions = [
      "dashboard","products","sales","purchases","suppliers","customers",
      "employees","billing","reports","notifications","settings","subscription",
      "help","profile"
    ];

    // 1️⃣ Signup user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "admin",
          permissions: fullPermissions,
          office_id: registrationNo,
          phone,
          office_name: officeName,
        },
      },
    });
    if (authError) throw authError;

    // 2️⃣ Insert into systems_users
    const userData = {
      auth_user_id: authData.user.id,
      customer_name: fullName,
      office_name: officeName,
      office_id: registrationNo,
      customer_registration_no: registrationNo,
      customer_phone: phone,
      country,
      region,
      referral_code: referral || null,
      created_at: new Date().toISOString(),
      system_type: "Mfumo wa Biashara",
      email,
      role: "admin",
      permissions: fullPermissions,
    };
    const { error: userError } = await supabase.from("systems_users").insert([userData]);
    if (userError) throw userError;

// 2️⃣.1 Insert default SMS balance (10 SMS)
const { error: smsBalanceError } = await supabase
  .from("sms_balances")
  .insert([{
    office_id: registrationNo,
    balance: 10,              
    updated_at: new Date().toISOString(),
  }]);
if (smsBalanceError) throw smsBalanceError;

// 2️⃣.5 Insert default receipt header settings
const receiptSettingsData = {
  office_id: registrationNo,
  office_name: officeName,
  phone: phone,
  email: email,
  address: `${region}, ${country}`,
  updated_by: fullName,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const { error: receiptError } = await supabase
  .from("receipt_settings")
  .insert([receiptSettingsData]);

if (receiptError) throw receiptError;

    // 3️⃣ Insert into subscriptions (trial)
    const { error: subError } = await supabase.from("subscriptions").insert([{
      office_id: registrationNo,
      office_name: officeName,
      created_by: fullName,
      package_label: "Trial Days",
      amount: 0,
      package_days: trialDays,
      usagedays: trialDays,
      status: "completed",
      startdate: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }]);
    if (subError) throw subError;

    // 4️⃣ Conditional insert into systems_sales if referral code exists
    if (referral && referral.trim() !== "") {
      const { error: salesError } = await supabase.from("systems_sales").insert([{
        customer_name: fullName,
        customer_registration_no: registrationNo,
        customer_phone: phone,
        country,
        region,
        referral_code: referral,
        system_type: "Mfumo wa Biashara",
        office_name: officeName
      }]);
      if (salesError) throw salesError;

      // 5️⃣ Fetch wakala phone from wakala_profiles by referral code
      const { data: wakalaData, error: wakalaError } = await supabase
        .from("wakala_profiles")
        .select("full_name, phone")
        .eq("referral_code", referral)
        .single();

      if (wakalaError) console.error("Failed to fetch wakala:", wakalaError);

      if (wakalaData?.phone) {
        const wakalaPhone = wakalaData.phone.replace(/\D/g, ""); // clean number

        // Send SMS to wakala
        await fetch("https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/next-sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: wakalaPhone,
            text: `Habari ${wakalaData.full_name}, kuna mteja wako ${fullName} amejisajili kwenye "${userData.system_type}". Tafadhari ingia kwenye Account yako, na usasishe mteja wako.`,
          }),
        });
      }
    }

    // 6️⃣ Send welcome SMS to new user
const cleanUserPhone = phone.replace(/\D/g, "");
await fetch("https://tbyynfxbcabjjbluxyol.supabase.co/functions/v1/next-sms", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    to: cleanUserPhone,
    text: `Karibu ${fullName} kwenye "${userData.system_type}"!
Furahia kusimamia biashara yako kidigitali sasa. Kwa maelekezo zaidi, WhatsApp: https://wa.me/255774737736`,
  }),
});

    toast.success("Signup successful! Please verify your email.");
    navigate("/login");
  } catch (err) {
    toast.error(err.message || "Signup failed!");
  } finally {
    setLoading(false);
  }
};


 return (
  <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
    {/* Kichwa */}
    <header className="bg-gradient-to-r from-[#153D82] to-[#1E4AA2] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center gap-4">

        {/* Logo */}
        <img
          src="https://tbyynfxbcabjjbluxyol.supabase.co/storage/v1/object/public/avatars/pwa-512%20(6).png"
          alt="Logo ya Hardware System"
          className="
            w-20 h-20
            sm:w-24 sm:h-24
            rounded-2xl
            bg-white p-2
            shadow-lg
            object-contain
          "
        />

        {/* Maandishi */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Usajili wa Hardware System
          </h1>
          <p className="mt-1 text-sm sm:text-base text-white/90">
            Tengeneza akaunti yako ya Hardware System kusimamia mauzo ya vifaa vya ujenzi, stock, na shughuli za duka lako
          </p>
        </div>

      </div>
    </header>

    {/* Maudhui Kuu */}
    <main className="flex-grow flex items-center justify-center px-6 py-12 relative">
      {/* Picha ya Mandhari (hiari) */}
      <img
        src="/pos1.jpg"
        alt="Mandhari ya Hardware"
        className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
      />

      <div className="relative z-10 w-full max-w-md bg-white/90 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#153D82]">
          Sajili Akaunti ya Hardware
        </h2>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Jina Kamili */}
          <div>
            <label className="block mb-1 font-medium">Jina Kamili</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
              required
            />
          </div>

          {/* Jina la Duka */}
          <div>
            <label className="block mb-1 font-medium">Jina la Hardware</label>
            <input
              type="text"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              placeholder="Hardware Yangu"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
              required
            />
          </div>

          {/* Barua Pepe */}
          <div>
            <label className="block mb-1 font-medium">Barua Pepe</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="wewe@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
              required
            />
          </div>

          {/* Namba ya Simu */}
          <div>
            <label className="block mb-1 font-medium">Namba ya Simu</label>
            <PhoneInput
              country={"tz"}
              value={phone}
              onChange={phone => setPhone("+" + phone)}
              inputStyle={{ width: "100%", paddingLeft: "2.5rem", borderRadius: "0.75rem", height: "48px" }}
              enableSearch
              placeholder="Weka namba ya simu"
              required
            />
          </div>

          {/* Nchi */}
          <div>
            <label className="block mb-1 font-medium">Nchi</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
            >
              {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Mkoa */}
          <div>
            <label className="block mb-1 font-medium">Mkoa</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
            >
              <option value="">Chagua mkoa</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Nambari ya Rufaa */}
          <div>
            <label className="block mb-1 font-medium">Nambari ya Rufaa (hiari)</label>
            <input
              type="text"
              value={referral}
              onChange={e => setReferral(e.target.value)}
              placeholder="Nambari ya Rufaa"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
            />
          </div>

          {/* Siku za Majaribio */}
          <div>
            <label className="block mb-1 font-medium">Siku za Majaribio</label>
            <select
              value={trialDays}
              onChange={(e) => setTrialDays(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
            >
              <option value={3}>Majaribio - siku 3</option>
              <option value={4}>Majaribio - siku 4</option>
              <option value={5}>Majaribio - siku 5</option>
            </select>
          </div>

          {/* Nenosiri */}
          <div>
            <label className="block mb-1 font-medium">Nenosiri</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Weka nenosiri"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
              required
            />
          </div>

          {/* Thibitisha Nenosiri */}
          <div>
            <label className="block mb-1 font-medium">Thibitisha Nenosiri</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Thibitisha nenosiri"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#153D82]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FFD700] text-[#153D82] font-semibold py-2 rounded-xl hover:bg-yellow-500 transition disabled:opacity-50"
          >
            {loading ? "Inasajiliwa..." : "Sajili Hardware"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          Tayari una akaunti?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-[#153D82] font-medium hover:underline"
          >
            Ingia
          </button>
        </div>
      </div>
    </main>

    {/* Miguu */}
    <footer className="bg-gradient-to-r from-[#153D82] to-[#1E4AA2] text-white py-6 px-6">
      <div className="max-w-7xl mx-auto text-center text-sm">
        &copy; {new Date().getFullYear()} Hardware System. Haki zote zimehifadhiwa.
      </div>
    </footer>
  </div>
);









};

export default Signup;
