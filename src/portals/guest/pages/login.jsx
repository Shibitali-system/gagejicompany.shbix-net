import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useRouter } from "next/router";

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Save access token locally for session management
      localStorage.setItem("guest_token", data.session.access_token);
      router.push("/portals/guest"); // redirect to guest portal or dashboard
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-20 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-center">Ingia</h1>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="Nenosiri lako"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Ingia..." : "Ingia"}
        </button>
      </form>
    </div>
  );
};

export default Login;
