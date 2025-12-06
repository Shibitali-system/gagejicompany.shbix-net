import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { toast, Toaster } from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>}
    <div className="w-full">{children}</div>
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Image carousel
  const images = ["/polyclinic1.png", "/polyclinic2.png"];
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
            polyclinic_id: systemUser.customer_registration_no,
            email: systemUser.email,
          })
        );
        navigate("/pos/dashboard");
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
            polyclinic_id: employee.polyclinic_id,
            permissions: employee.permissions || [],
            email: employee.email,
          })
        );
        toast.success(`Welcome ${employee.name || "Employee"}!`);
        navigate("/pos/dashboard");
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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gray-100 font-sans">
      <Toaster position="top-right" />

      {/* LEFT IMAGE CAROUSEL */}
      <div className="flex flex-col justify-center items-center h-screen p-10 bg-gray-100">
        <div className="
          w-full max-w-lg h-[90%] rounded-2xl overflow-hidden
          shadow-lg border-4 border-blue-600
          relative flex flex-col items-center justify-center
          transition-all duration-500 ease-in-out
          hover:shadow-2xl hover:scale-105
        ">
          <div
            className="w-full h-full bg-cover bg-center transition-opacity duration-1000 ease-in-out"
            style={{ backgroundImage: `url('${images[currentImage]}')` }}
          ></div>

          <div className="
            absolute inset-0 bg-black bg-opacity-20
            ring-4 ring-blue-600 ring-opacity-20 rounded-2xl
            backdrop-blur-sm transition-all duration-500 ease-in-out
            hover:ring-opacity-40
          "></div>

          <div className="absolute flex flex-col items-center justify-center text-center px-4 space-y-2">
            <h1 className="text-white text-3xl md:text-4xl font-extrabold drop-shadow-lg">
              Polyclinic Care
            </h1>
            <p className="text-white text-sm md:text-base drop-shadow-md max-w-xs">
              Manage your patients, appointments, and staff efficiently with Polyclinic system.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT LOGIN FORM */}
      <div className="flex flex-col justify-center items-center h-screen px-6 bg-gray-100">
        <div className="w-full max-w-md flex flex-col gap-4">

          {/* Header Card */}
          <FormCard>
            <h1 className="text-3xl font-extrabold text-center text-blue-600">
              Polyclinic System Login
            </h1>
            <h2 className="text-xl font-bold text-center text-blue-600 mt-2">Welcome Back</h2>
            <p className="text-center text-gray-600 text-sm mt-2">
              Sign in to continue managing your polyclinic operations.
            </p>
          </FormCard>

          {/* Login Form Card */}
          <FormCard title="Login Details">
            <form className="space-y-5">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-gray-600 text-sm">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="
                    border border-gray-200 rounded-md px-4 py-2
                    focus:outline-none focus:ring-2 focus:ring-blue-600
                    transition shadow-sm
                  "
                />
              </div>

              <div className="flex flex-col gap-1 relative">
                <label className="font-medium text-gray-600 text-sm">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="********"
                  className="
                    border border-gray-200 rounded-md px-4 py-2 pr-12
                    focus:outline-none focus:ring-2 focus:ring-blue-600
                    transition shadow-sm
                  "
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-9 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </form>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="
                w-full bg-blue-600 text-white font-semibold py-2 rounded-md
                shadow hover:bg-blue-700 transition
                disabled:opacity-60 disabled:cursor-not-allowed mt-6
              "
            >
              {loading ? "Loading..." : "Login"}
            </button>

            <div className="mt-4 flex justify-between text-sm text-blue-600">
              <Link to="/polyclinic/forgot-password" className="hover:underline">Forgot password?</Link>
              <Link to="/polyclinic/signup" className="hover:underline">Signup</Link>
            </div>

            <button
              onClick={() => navigate("/polyclinic/home")}
              className="mt-5 w-full text-center text-blue-600 font-medium text-sm hover:underline"
            >
              ← Back to Homepage
            </button>
          </FormCard>
        </div>
      </div>
    </div>
  );
};

export default Login;
