import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.user) throw new Error("Login failed, no user returned.");

      const user = data.user;
      toast.success("Login successful!");

      const { data: systemUser } = await supabase
        .from("systems_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (systemUser) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            type: "system",
            id: systemUser.id,
            name: systemUser.customer_name,
            pharmacy_id: systemUser.customer_registration_no,
            email: systemUser.email,
          })
        );
        navigate("/pharmacy/dashboard");
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (employee) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            type: "employee",
            id: employee.id,
            name: employee.name,
            pharmacy_id: employee.pharmacy_id,
            permissions: employee.permissions || [],
            email: employee.email,
          })
        );
        toast.success(`Welcome ${employee.name || "Employee"}!`);
        navigate("/pharmacy/dashboard");
        return;
      }

      toast.error("Account not found in system records.");
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-cover bg-center relative"
      style={{ backgroundImage: "url('/pharmacy1.png')" }}
    >
      <Toaster position="top-right" reverseOrder={false} />

      {/* Neon/Glassy Back to Homepage Button */}
      <button
        onClick={() => navigate("/pharmacy/home")}
        className="absolute top-6 left-6 z-10 px-6 py-2 rounded-3xl font-semibold text-white text-lg bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 
                   shadow-lg shadow-blue-500/50 backdrop-blur-md border border-white/30 transform transition duration-300 hover:scale-105 hover:shadow-xl hover:from-blue-500 hover:via-purple-600 hover:to-pink-600 flex items-center gap-2"
      >
        ← Back to Homepage
      </button>

      {/* Form Container */}
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-10 w-full max-w-md relative z-20 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-blue-300 rounded-full opacity-30 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-indigo-300 rounded-full opacity-30 blur-3xl pointer-events-none"></div>

        <h1 className="text-3xl font-extrabold mb-6 text-center text-blue-800 drop-shadow-lg">
          Pharmacy System
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Sign in to manage inventory, sales, staff, and reports
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Input */}
          <div className="flex flex-col">
            <label className="mb-2 font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-sm hover:shadow-md"
            />
          </div>

          {/* Password Input */}
          <div className="relative flex flex-col">
            <label className="mb-2 font-medium text-gray-700">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
              className="border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-sm hover:shadow-md pr-12"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-blue-600 font-bold py-3 rounded-full shadow-lg border border-blue-600
                       hover:bg-blue-50 hover:scale-105 transition transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 flex justify-between text-sm text-blue-600">
          <Link to="/pharmacy/forgot-password" className="hover:underline z-30 relative">
            Forgot password?
          </Link>
          <Link to="/pharmacy/signup" className="hover:underline z-30 relative">
            Signup
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
