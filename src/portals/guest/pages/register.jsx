import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useRouter } from "next/router";

const Register = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setError("Nenosiri na uthibitisho wa nenosiri havilingani.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setSuccessMsg(
        "Umefanikiwa kujiandikisha! Tafadhali thibitisha barua pepe yako kupitia kiungo tulikotuma."
      );
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-20 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">Jisajili</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      {successMsg && <p className="mb-4 text-green-600">{successMsg}</p>}
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">Barua Pepe</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="example@email.com"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Nenosiri</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Tengeneza nenosiri"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Thibitisha Nenosiri</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Rudia nenosiri"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          {loading ? "Tafadhali subiri..." : "Jisajili"}
        </button>
      </form>
    </div>
  );
};

export default Register;
