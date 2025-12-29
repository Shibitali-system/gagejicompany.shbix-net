import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/pharmacy/login`
      });

      if (error) throw error;

      toast.success("Reset link sent! Check your email.");
      setEmail("");
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gray-50">
      <Toaster position="top-right" />

      {/* Background */}
      <img src="/pos1.jpg" alt="Pharmacy Background" className="absolute inset-0 w-full h-full object-cover z-0"/>
      <div className="absolute inset-0 bg-black/25 z-10"></div>

      {/* Neon/Glassy Back to Homepage Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 px-6 py-2 rounded-3xl font-semibold text-white text-lg bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 
                   shadow-lg shadow-blue-500/50 backdrop-blur-md border border-white/30 transform transition duration-300 hover:scale-105 hover:shadow-xl hover:from-blue-500 hover:via-purple-600 hover:to-pink-600 flex items-center gap-2 z-20"
      >
        ← Back to Homepage
      </button>

      {/* Form */}
      <div className="relative z-20 bg-white/30 backdrop-blur-xl rounded-3xl shadow-2xl p-10 w-full max-w-md border border-white/20">
        <h1 className="text-3xl font-extrabold mb-6 text-center text-blue-800 drop-shadow-lg">
          Reset Password
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Enter your email address to receive a password reset link.
        </p>

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="relative group">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-3 pl-4 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:scale-105 transition-all disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-blue-700">
          Remembered your password?{" "}
          <span
            className="cursor-pointer font-semibold hover:underline"
            onClick={() => navigate("/login")}
          >
            Login here
          </span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
