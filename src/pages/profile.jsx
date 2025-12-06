import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Toaster, toast } from "react-hot-toast";
import { FaSave, FaUser, FaPhone, FaEnvelope, FaBuilding, FaUserShield, FaEdit } from "react-icons/fa";

// Card Components
const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">{title}</p>
    <div className="w-full">{children}</div>
  </div>
);

const CustomCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-2 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">{title}</p>}
    <div className="w-full">{children}</div>
  </div>
);

// InfoField Component
const InfoField = ({ label, value, editable, onChange, name, icon }) => (
  <div className="flex flex-col">
    <label className="text-gray-700 mb-1 flex items-center gap-2 font-medium">{icon} {label}</label>
    {editable ? (
      <input
        type="text"
        value={value}
        name={name}
        onChange={onChange}
        className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#ef4444] focus:outline-none"
      />
    ) : (
      <div className="px-4 py-2 bg-gray-100 rounded-lg">{value || "-"}</div>
    )}
  </div>
);

// PasswordChangeForm Component
const PasswordChangeForm = ({ onPasswordChange }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    setLoading(true);
    try {
      await onPasswordChange(newPassword);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-700 mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#ef4444] focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="block text-gray-700 mb-1">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#ef4444] focus:outline-none"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-[#ef4444] text-white px-6 py-2 rounded-xl hover:bg-red-600 transition"
      >
        {loading ? "Updating..." : "Change Password"}
      </button>
    </form>
  );
};

// Main Profile Component
const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) throw new Error("User not authenticated");

        let { data: sysUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (sysUser) {
          setProfile(sysUser);
          setIsEmployee(false);
        } else {
          let { data: emp } = await supabase
            .from("employees")
            .select("*")
            .eq("auth_user_id", userId)
            .maybeSingle();
          if (!emp) throw new Error("Profile not found");
          setProfile(emp);
          setIsEmployee(true);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleUpdate = async () => {
    if (!profile) return;
    setUpdating(true);
    try {
      if (isEmployee) {
        toast.error("Employees cannot edit profile info!");
        return;
      }
      const { data, error } = await supabase
        .from("systems_users")
        .update({
          customer_name: profile.customer_name,
          customer_phone: profile.customer_phone,
          office_name: profile.office_name,
        })
        .eq("auth_user_id", profile.auth_user_id)
        .single();

      if (error) throw error;
      setProfile({ ...profile, ...data });
      toast.success("Profile updated successfully!");
      setEditMode(false);
    } catch (err) {
      toast.error("Update failed: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password changed successfully!");
    } catch (err) {
      toast.error("Failed to change password: " + err.message);
    }
  };

  if (loading) return <p className="p-6 text-gray-600">Loading profile...</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <h1 className="text-4xl font-bold text-[#ef4444] mb-6">
          Welcome, {profile?.customer_name || profile?.name || "User"}
        </h1>

        {/* Profile Card */}
        <FormCard title="Profile Information">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2 text-[#ef4444]">
              <FaUser /> Profile Info
            </h2>
            {!isEmployee && (
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-1 px-4 py-2 bg-[#ef4444] text-white rounded-xl hover:bg-red-600 transition"
              >
                <FaEdit /> {editMode ? "Cancel" : "Edit"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoField
              label="Full Name"
              value={profile?.customer_name || profile?.name || ""}
              name={isEmployee ? "name" : "customer_name"}
              editable={!isEmployee && editMode}
              onChange={handleChange}
              icon={<FaUser />}
            />
            <InfoField
              label="Email"
              value={profile?.email || ""}
              editable={false}
              icon={<FaEnvelope />}
            />
            <InfoField
              label="Phone"
              value={profile?.customer_phone || profile?.phone || ""}
              name={isEmployee ? "phone" : "customer_phone"}
              editable={!isEmployee && editMode}
              onChange={handleChange}
              icon={<FaPhone />}
            />
            <InfoField
              label="Office"
              value={profile?.office_name || profile?.office_id || ""}
              name={isEmployee ? "office_id" : "office_name"}
              editable={!isEmployee && editMode}
              onChange={handleChange}
              icon={<FaBuilding />}
            />
            <InfoField
              label="Role"
              value={profile?.role || ""}
              editable={false}
              icon={<FaUserShield />}
            />
          </div>

          {!isEmployee && editMode && (
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex items-center gap-2 bg-[#ef4444] text-white px-6 py-2 rounded-xl hover:bg-red-600 transition mt-6"
            >
              <FaSave /> {updating ? "Updating..." : "Save Changes"}
            </button>
          )}

          <p className="mt-3 text-gray-500 text-sm">
            Tip: Keep your profile info updated for accurate records.
          </p>
        </FormCard>

        {/* Password Change */}
        <FormCard title="Change Password">
          <PasswordChangeForm onPasswordChange={handlePasswordChange} />
          <p className="mt-3 text-gray-500 text-sm">
            Tip: Use a strong password with letters, numbers & symbols.
          </p>
        </FormCard>
      </div>
    </div>
  );
};

export default Profile;
