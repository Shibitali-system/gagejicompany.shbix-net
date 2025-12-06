import React, { useState, useEffect } from "react";
import { supabase } from '../../../supabaseClient';

import { Link } from "react-router-dom";


const ResetPassword = () => {
  const router = useRouter();
  const { access_token } = router.query; // Supabase reset token
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password !== confirmPassword) {
      setError("Password haikutangamana na confirmation.");
      return;
    }

    if (!access_token) {
      setError("Invalid or expired reset link.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        access_token,
        password,
      });

      if (error) throw error;

      setMessage("Password imebadilishwa kwa mafanikio. Tafadhali ingia tena.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>

        {message && <p className="text-green-600 mb-4">{message}</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block mb-1 font-semibold">Password Mpya</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Ingiza password mpya"
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Thibitisha Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Thibitisha password"
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Inapakia..." : "Weka Password Mpya"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-blue-600">
          <a href="/systems/pharmacy/auth/login">Rudi Login</a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
