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
        const parts = lastUser.customer_registration_no.split("-");
        lastSequential = parseInt(parts[2], 10);
      }

      const nextSequential = (lastSequential + 1).toString().padStart(8, "0");
      regNo = `SHIB-${year}-${nextSequential}`;

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
        system_type: "Mfumo wa Pharmacy",
        email,
        role: "admin",
        permissions: fullPermissions,
      };
      const { error: userError } = await supabase.from("systems_users").insert([userData]);
      if (userError) throw userError;

// Create initial trial subscription
const { error: subError } = await supabase
  .from("subscriptions")
  .insert([
    {
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
    },
  ]);

if (subError) throw subError;


      toast.success("Signup successful! Please verify your email.");
      navigate("/pharmacy/login");
    } catch (err) {
      toast.error(err.message || "Signup failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gray-50">
      <Toaster position="top-right" />
      {/* Background */}
      <img src="/pharmacy2.jpg" alt="Pharmacy Background" className="absolute inset-0 w-full h-full object-cover z-0"/>
      <div className="absolute inset-0 bg-black/25 z-10"></div>

      {/* Neon/Glassy Back to Homepage Button */}
      <button
        onClick={() => navigate("/pharmacy/home")}
        className="absolute top-6 left-6 px-6 py-2 rounded-3xl font-semibold text-white text-lg bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 
                   shadow-lg shadow-blue-500/50 backdrop-blur-md border border-white/30 transform transition duration-300 hover:scale-105 hover:shadow-xl hover:from-blue-500 hover:via-purple-600 hover:to-pink-600 flex items-center gap-2 z-20"
      >
        ← Back to Homepage
      </button>

      {/* Form */}
      <div className={`relative z-20 bg-white/30 backdrop-blur-xl rounded-3xl shadow-2xl p-10 w-full max-w-lg border border-white/20 transition-all duration-700 ${fadeIn ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"}`}>
        <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-800 drop-shadow-md animate-pulse">
          Pharmacy System Signup
        </h1>

        <form onSubmit={handleSignup} className="space-y-5">
          {/* Full Name */}
          <div className="relative group">
            <FaUser className="absolute top-3 left-3 text-gray-400" />
            <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="pl-10 w-full py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition placeholder-gray-400"/>
          </div>

          {/* Pharmacy Name */}
          <div className="relative group">
            <FaBuilding className="absolute top-3 left-3 text-gray-400" />
            <input type="text" placeholder="Pharmacy Name" value={officeName} onChange={e => setOfficeName(e.target.value)} required
              className="pl-10 w-full py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition placeholder-gray-400"/>
          </div>

          {/* Email */}
          <div className="relative group">
            <FaEnvelope className="absolute top-3 left-3 text-gray-400" />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              className="pl-10 w-full py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition placeholder-gray-400"/>
          </div>

          {/* Phone */}
          <div className="relative group">
            <FaPhone className="absolute top-3 left-3 text-gray-400 z-10"/>
            <PhoneInput country={"tz"} value={phone} onChange={phone => setPhone("+" + phone)}
              inputStyle={{ width: "100%", paddingLeft: "2.5rem", borderRadius: "0.75rem", height: "48px" }} required/>
          </div>

          {/* Country */}
          <div className="relative group">
            <FaMapMarkerAlt className="absolute top-3 left-3 text-gray-400" />
            <select value={country} onChange={e => setCountry(e.target.value)} className="pl-10 w-full py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
              {countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Region */}
          <div className="relative group">
            <FaMapMarkerAlt className="absolute top-3 left-3 text-gray-400" />
            <select value={region} onChange={e => setRegion(e.target.value)} className="pl-10 w-full py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
              <option value="">Select region</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Referral */}
          <input type="text" placeholder="Referral Code (optional)" value={referral} onChange={e => setReferral(e.target.value)}
            className="w-full py-3 pl-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"/>

{/* Trial Days */}
<div className="relative group">
  <FaBuilding className="absolute top-3 left-3 text-gray-400" />
  <select
    value={trialDays}
    onChange={(e) => setTrialDays(parseInt(e.target.value))}
    className="pl-10 w-full py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
  >
    <option value={3}>Trial - 3 days</option>
    <option value={4}>Trial - 4 days</option>
    <option value={5}>Trial - 5 days</option>
  </select>
</div>

          {/* Password */}
          <div className="relative group">
            <FaLock className="absolute top-3 left-3 text-gray-400" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
              className="pl-10 w-full py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"/>
          </div>

          {/* Confirm Password */}
          <div className="relative group">
            <FaLock className="absolute top-3 left-3 text-gray-400" />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
              className="pl-10 w-full py-3 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"/>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 font-bold rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:scale-105 transition-all disabled:opacity-50">
            {loading ? "Loading..." : "Signup"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-700">
          Already have an account? <Link to="/pharmacy/login" className="hover:underline font-semibold">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
