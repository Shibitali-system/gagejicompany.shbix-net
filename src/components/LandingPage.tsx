import React, { useState, useEffect } from "react";
import {
  FaSchool, FaUniversity, FaClinicMedical, FaHospitalAlt,
  FaBriefcase, FaChurch, FaMicroscope, FaDigitalTachograph,
  FaHotel, FaTasks, FaUserTie, FaBook, FaUsers,
  FaMoneyCheck, FaMoneyBill, FaHome, FaPeopleArrows,
  FaUserCheck
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// All systems
const systems = [
  { id: "mfumo-ajira", label: { sw: "Mfumo wa Ajira", en: "Employment System" }, icon: <FaUserTie /> },
  { id: "pos", label: { sw: "Mfumo wa Biashara", en: "Business System" }, icon: <FaBriefcase /> },
  { id: "mfumo-chuo", label: { sw: "Mfumo wa Chuo", en: "College System" }, icon: <FaUniversity /> },
  { id: "church", label: { sw: "Mfumo wa Kanisa", en: "Church System" }, icon: <FaChurch /> },
  { id: "clinic", label: { sw: "Mfumo wa Clinic", en: "Clinic System" }, icon: <FaHospitalAlt /> },
  { id: "mfumo-crm", label: { sw: "Mfumo wa CRM", en: "CRM System" }, icon: <FaUsers /> },
  { id: "dispensary", label: { sw: "Mfumo wa Dispensary", en: "Dispensary System" }, icon: <FaHospitalAlt /> },
  { id: "dldm", label: { sw: "Mfumo wa DLDM", en: "DLDM System" }, icon: <FaDigitalTachograph /> },
  { id: "frame", label: { sw: "Mfumo wa Frame", en: "Frame System" }, icon: <FaHome /> },
  { id: "guesthouse", label: { sw: "Mfumo wa Guest House", en: "Guest House System" }, icon: <FaHotel /> },
  { id: "hospital", label: { sw: "Mfumo wa Hospitali", en: "Hospital System" }, icon: <FaHospitalAlt /> },
  { id: "hotel", label: { sw: "Mfumo wa Hoteli", en: "Hotel System" }, icon: <FaHotel /> },
  { id: "inventory", label: { sw: "Mfumo wa Inventory", en: "Inventory System" }, icon: <FaTasks /> },
  { id: "church", label: { sw: "Mfumo wa Kanisa", en: "Church System" }, icon: <FaChurch /> },
  { id: "library", label: { sw: "Mfumo wa Library", en: "Library System" }, icon: <FaBook /> },
  { id: "laboratory", label: { sw: "Mfumo wa Maabara", en: "Lab System" }, icon: <FaMicroscope /> },
  { id: "expenses", label: { sw: "Mfumo wa Matumizi", en: "Expenditure System" }, icon: <FaMoneyCheck /> },
  { id: "mfumo-mitihani", label: { sw: "Mfumo wa Mitihani", en: "Exam System" }, icon: <FaTasks /> },
  { id: "loans", label: { sw: "Mfumo wa Mkopo", en: "Loan System" }, icon: <FaMoneyBill /> },
  { id: "houses", label: { sw: "Mfumo wa Nyumba", en: "Housing System" }, icon: <FaHome /> },
  { id: "payrolls", label: { sw: "Mfumo wa Payrolls", en: "Payroll System" }, icon: <FaMoneyCheck /> },
  { id: "pharmacy", label: { sw: "Mfumo wa Pharmacy", en: "Pharmacy System" }, icon: <FaClinicMedical /> },
  { id: "polyclinic", label: { sw: "Mfumo wa Polyclinic", en: "Polyclinic System" }, icon: <FaHospitalAlt /> },
  { id: "saccos", label: { sw: "Mfumo wa SACCOS", en: "SACCOS System" }, icon: <FaUniversity /> },
  { id: "mfumo-shule", label: { sw: "Mfumo wa Shule", en: "School System" }, icon: <FaSchool /> },
  { id: "accountant", label: { sw: "Mfumo wa Uhasibu", en: "Accounting System" }, icon: <FaMoneyBill /> },
  { id: "vikoba", label: { sw: "Mfumo wa Vikoba", en: "VICOBA System" }, icon: <FaPeopleArrows /> },
  { id: "visitors", label: { sw: "Mfumo wa Visitors", en: "Visitors System" }, icon: <FaUserCheck /> },
  { id: "staff", label: { sw: "Mfumo wa Wafanyakazi", en: "Staff Management System" }, icon: <FaUserCheck /> },
  { id: "agent", label: { sw: "Mfumo wa Wakala", en: "Agent System" }, icon: <FaBriefcase /> },
];

const LandingPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Hifadhi lugha kwenye localStorage
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "sw";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  // Sort kwa alphabet
  const sortedSystems = [...systems].sort((a, b) => {
    const aLabel = a.label[language].toLowerCase();
    const bLabel = b.label[language].toLowerCase();
    return aLabel.localeCompare(bLabel);
  });

  // Filter na search
  const filteredSystems = sortedSystems.filter(system =>
    system.label[language].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white px-4 sm:px-8 py-8 font-sans">

      {/* Language Switcher */}
      <div className="flex justify-end max-w-7xl mx-auto mb-4 space-x-3">
        <button
          onClick={() => setLanguage("sw")}
          className={`py-2 px-4 rounded-lg font-semibold border transition ${
            language === "sw"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-blue-600 border-blue-600 hover:bg-blue-100"
          }`}
          aria-label="Switch to Swahili"
        >
          Kiswahili
        </button>
        <button
          onClick={() => setLanguage("en")}
          className={`py-2 px-4 rounded-lg font-semibold border transition ${
            language === "en"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-blue-600 border-blue-600 hover:bg-blue-100"
          }`}
          aria-label="Switch to English"
        >
          English
        </button>
      </div>

      {/* Brand Name + Slogan */}
      <header className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-blue-700 tracking-wide">
          SHIBITALI SUITE
        </h1>
        <p className="mt-3 text-xl text-gray-700 italic font-light tracking-wide">
          {language === "sw"
            ? "Kuendeleza Biashara Yako — "
            : "Empower Your Business — "}
          <span className="font-semibold">
            {language === "sw"
              ? "Kua Juu na SHIBITALI SUITE"
              : "Grow High with SHIBITALI SUITE"}
          </span>
        </p>
      </header>

      {/* Search Input */}
      <div className="max-w-md mx-auto mb-10">
        <input
          type="search"
          placeholder={
            language === "sw" ? "Tafuta Mfumo hapa..." : "Search system here..."
          }
          className="w-full border border-gray-300 rounded-lg py-3 px-5 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search systems"
        />
      </div>

      {/* Systems Grid */}
      <section className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredSystems.length > 0 ? (
          filteredSystems.map((system) => (
            <div
              key={system.id}
              className="group bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-xl transition p-6 cursor-pointer hover:scale-[1.02]"
              onClick={() => navigate(`/${system.id}`)}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="bg-blue-100 group-hover:bg-blue-600 group-hover:text-white text-blue-600 text-4xl p-4 rounded-full mb-4 transition-all">
                  {system.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-800 group-hover:text-blue-600 text-center">
                  {system.label[language]}
                </h3>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center col-span-full text-gray-500 mt-12">
            {language === "sw"
              ? "Hakuna mfumo unaolingana na utafutaji wako."
              : "No system matches your search."}
          </p>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Shibitali Enterprises. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
