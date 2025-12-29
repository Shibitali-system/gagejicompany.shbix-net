import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FaArrowLeft, FaCalendarPlus, FaTimes, FaUserPlus } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";

const CustomCard = React.memo(({ title, children }) => (
  <div className="bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4 flex flex-col items-start justify-center shadow-[0_1px_0px_0_rgba(0,0,0,0.2)] font-sans w-full">
    {title && <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-2">{title}</p>}
    {children}
  </div>
));

const InputField = React.memo(({ label, value, onChange, type = "text", placeholder }) => (
  <div className="w-full relative">
    <label className="block font-semibold mb-1">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
    />
  </div>
));

export default function NewInsuranceClaim() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [providers, setProviders] = useState([]);

  const initialClaimData = {
    patient_name: "",
    patient_phone: "",
    patient_gender: "",
    patient_age: "",
    patient_weight: "",
    provider_id: "",
    provider_name: "",
    amount: "",
    date: "",
    status: "Pending",
    description: "",
    customer_id: null,
  };

  const [newClaimData, setNewClaimData] = useState(initialClaimData);

  const [newPatientData, setNewPatientData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
    age: "",
    weight: "",
    type: "Insurance",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) throw new Error("Not authenticated");

        const { data: systemUser } = await supabase
          .from("systems_users")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (systemUser) {
          setUser({
            id: systemUser.id,
            auth_id: authUser.id,
            name: systemUser.customer_name,
            role: "system",
            office_id: systemUser.office_id,
            office_name: systemUser.office_name,
          });
          return;
        }

        const { data: employeeUser } = await supabase
          .from("employees")
          .select("*")
          .eq("auth_user_id", authUser.id)
          .maybeSingle();

        if (employeeUser) {
          const { data: officeData } = await supabase
            .from("systems_users")
            .select("office_id, office_name")
            .eq("office_id", employeeUser.office_id)
            .maybeSingle();

          setUser({
            id: employeeUser.id,
            auth_id: authUser.id,
            name: employeeUser.name,
            role: "employee",
            office_id: officeData?.office_id || employeeUser.office_id,
            office_name: officeData?.office_name || "Unknown Office",
          });
          return;
        }

        toast.error("User information not found");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user info");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user?.office_id) return;

    const fetchProviders = async () => {
      const { data, error } = await supabase
        .from("insurance_providers")
        .select("id, name")
        .eq("office_id", user.office_id)
        .order("name", { ascending: true });

      if (!error) setProviders(data);
    };

    fetchProviders();
  }, [user]);

  useEffect(() => {
    if (!patientSearch || !user) return setPatientResults([]);
    const timeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .ilike("name", `%${patientSearch}%`)
          .eq("office_id", user.office_id)
          .order("name", { ascending: true })
          .limit(5);
        if (error) throw error;
        setPatientResults(data || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [patientSearch, user]);

  const handleSelectPatient = (patient) => {
    setNewClaimData(prev => ({
      ...prev,
      patient_name: patient.name,
      patient_phone: patient.phone || "",
      patient_gender: patient.gender || "",
      patient_age: patient.age || "",
      patient_weight: patient.weight || "",
      customer_id: patient.id,
    }));
    setPatientSearch(patient.name);
    setPatientResults([]);
  };

  const handleCreatePatient = async () => {
    if (!newPatientData.name) return toast.error("Patient name is required");
    if (!user?.auth_id) return toast.error("User info not loaded");

    setCreatingPatient(true);
    try {
      const insertData = {
        ...newPatientData,
        created_by: user.auth_id,
        office_id: user.office_id,
        office_name: user.office_name,
      };

      const { data: createdPatient, error } = await supabase
        .from("customers")
        .insert([insertData])
        .select()
        .maybeSingle();

      if (error) throw error;

      toast.success("Patient created successfully");

      setNewClaimData(prev => ({
        ...prev,
        patient_name: createdPatient.name,
        patient_phone: createdPatient.phone || "",
        patient_gender: createdPatient.gender || "",
        patient_age: createdPatient.age || "",
        patient_weight: createdPatient.weight || "",
        customer_id: createdPatient.id,
      }));

      setPatientSearch(createdPatient.name);
      setShowCreatePatient(false);
      setNewPatientData({
        name: "", email: "", phone: "", address: "",
        gender: "", age: "", weight: "", type: "Insurance"
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create patient: " + err.message);
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleCreateClaim = async () => {
    if (!newClaimData.patient_name) return toast.error("Patient name is required");
    if (!newClaimData.customer_id) return toast.error("Patient must be selected");
    if (!newClaimData.provider_id) return toast.error("Provider is required");
    if (!newClaimData.amount) return toast.error("Amount is required");
    if (!newClaimData.date) return toast.error("Claim date is required");
    if (!user?.auth_id) return toast.error("User info not loaded");

    setLoading(true);

    try {
      const insertData = {
  patient_id: newClaimData.customer_id, // DB required
  provider_id: newClaimData.provider_id,
  patient_name: newClaimData.patient_name,
  patient_phone: newClaimData.patient_phone,
  patient_gender: newClaimData.patient_gender,
  patient_age: newClaimData.patient_age,
  patient_weight: newClaimData.patient_weight,
  amount: newClaimData.amount,
  date: newClaimData.date,
  status: newClaimData.status,
  description: newClaimData.description,
  created_by: user.auth_id,
  office_id: user.office_id,
  office_name: user.office_name,
};


      const { error } = await supabase
        .from("insurance_claims")
        .insert([insertData]);

      if (error) throw error;

      toast.success("Claim created successfully");
      setNewClaimData(initialClaimData);
      setPatientSearch("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create claim: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto space-y-6">

        <CustomCard>
          <div className="flex items-center mb-3">
            <Link to="/dashboard/insurance/claims" className="flex items-center gap-2 font-bold text-[#2563EB] hover:underline">
              <FaArrowLeft /> Back to Claims
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-[#2563EB]">
            Add New Insurance Claim
          </h1>
          <p className="text-gray-500 text-sm text-center mt-1">
            Fill in the information below to create a new claim.
          </p>
        </CustomCard>

        <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleCreateClaim(); }}>
          <CustomCard title="Claim Information">
            <div className="space-y-3 w-full relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <InputField
                    label="Patient Name *"
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); setNewClaimData(prev => ({ ...prev, customer_id: null })); }}
                    placeholder="Search or enter patient name"
                  />
                  {patientResults.length > 0 && (
                    <div className="absolute z-50 bg-white border mt-1 w-full max-h-48 overflow-y-auto rounded shadow">
                      {patientResults.map(p => (
                        <div key={p.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectPatient(p)}>
                          {p.name} {p.phone ? `(${p.phone})` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setShowCreatePatient(true)} className="bg-[#2563EB] text-white px-4 py-2 rounded-[4px] flex items-center gap-2">
                  <FaUserPlus /> New
                </button>
              </div>

              <InputField label="Phone Number" type="tel" value={newClaimData.patient_phone} onChange={e => setNewClaimData(prev => ({ ...prev, patient_phone: e.target.value }))} placeholder="Enter patient phone number" />
              <InputField label="Gender" value={newClaimData.patient_gender} onChange={e => setNewClaimData(prev => ({ ...prev, patient_gender: e.target.value }))} placeholder="Enter gender" />
              <InputField label="Age" type="number" value={newClaimData.patient_age} onChange={e => setNewClaimData(prev => ({ ...prev, patient_age: e.target.value }))} placeholder="Enter age" />
              <InputField label="Weight (kg)" type="number" value={newClaimData.patient_weight} onChange={e => setNewClaimData(prev => ({ ...prev, patient_weight: e.target.value }))} placeholder="Enter weight" />

              <div className="w-full">
                <label className="block font-semibold mb-1">Provider *</label>
                <select
                  value={newClaimData.provider_id || ""}
                  onChange={(e) => setNewClaimData(prev => ({ ...prev, provider_id: e.target.value }))}
                  className="border px-4 py-2 rounded w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="">Select provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <InputField label="Amount *" type="number" value={newClaimData.amount} onChange={e => setNewClaimData(prev => ({ ...prev, amount: e.target.value }))} placeholder="Enter claim amount" />
              <InputField label="Claim Date *" type="datetime-local" value={newClaimData.date} onChange={e => setNewClaimData(prev => ({ ...prev, date: e.target.value }))} />
              <div className="w-full">
                <label className="block font-semibold mb-1">Status</label>
                <select value={newClaimData.status} onChange={e => setNewClaimData(prev => ({ ...prev, status: e.target.value }))} className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="w-full">
                <label className="block font-semibold mb-1">Description</label>
                <textarea placeholder="Add any notes or description" value={newClaimData.description} onChange={e => setNewClaimData(prev => ({ ...prev, description: e.target.value }))} className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
              </div>
            </div>
          </CustomCard>

          {user && (
            <CustomCard title="Office Details">
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>Office:</strong> {user.office_name}</p>
                <p><strong>Entered By:</strong> {user.name}</p>
              </div>
            </CustomCard>
          )}

          <CustomCard>
            <div className="flex flex-col sm:flex-row gap-3 justify-between w-full">
              <button type="submit" disabled={loading} className="bg-[#2563EB] text-white px-6 py-2 rounded-[4px] flex items-center justify-center gap-2 font-semibold">
                {loading ? "Creating..." : <><FaCalendarPlus /> Create Claim</>}
              </button>
              <Link to="/dashboard/insurance/claims" className="bg-gray-300 px-6 py-2 rounded-[4px] hover:bg-gray-400 flex items-center justify-center gap-2 font-semibold">
                <FaTimes /> Cancel
              </Link>
            </div>
          </CustomCard>
        </form>
      </div>

      {showCreatePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md p-6 rounded shadow-lg relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
              <h2 className="text-xl font-bold">Create New Patient</h2>
              <button onClick={() => setShowCreatePatient(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 pb-4">
              <InputField label="Patient Name *" value={newPatientData.name} onChange={e => setNewPatientData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter patient name" />
              <InputField label="Email" type="email" value={newPatientData.email} onChange={e => setNewPatientData(prev => ({ ...prev, email: e.target.value }))} placeholder="Enter email" />
              <InputField label="Phone" value={newPatientData.phone} onChange={e => setNewPatientData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Enter phone" />

              <div className="w-full">
                <label className="block font-semibold mb-1">Gender</label>
                <select value={newPatientData.gender} onChange={e => setNewPatientData(prev => ({ ...prev, gender: e.target.value }))} className="border px-4 py-2 rounded w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <InputField label="Age" type="number" value={newPatientData.age} onChange={e => setNewPatientData(prev => ({ ...prev, age: e.target.value }))} placeholder="Enter age" />
              <InputField label="Weight (kg)" type="number" value={newPatientData.weight} onChange={e => setNewPatientData(prev => ({ ...prev, weight: e.target.value }))} placeholder="Enter weight" />

              <div className="w-full">
                <label className="block font-semibold mb-1">Address</label>
                <textarea value={newPatientData.address} onChange={e => setNewPatientData(prev => ({ ...prev, address: e.target.value }))} placeholder="Enter address" className="border px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
              </div>

              <div className="flex justify-end gap-2 mt-2 sticky bottom-0 bg-white pt-3">
                <button type="button" onClick={handleCreatePatient} disabled={creatingPatient} className="bg-[#2563EB] text-white px-4 py-2 rounded flex items-center gap-2">
                  {creatingPatient ? "Creating..." : <><FaUserPlus /> Create</>}
                </button>
                <button type="button" onClick={() => setShowCreatePatient(false)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
