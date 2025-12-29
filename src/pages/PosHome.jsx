import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCashRegister,
  FaBoxes,
  FaUsers,
  FaChartLine,
  FaSignInAlt,
  FaUserPlus,
  FaShieldAlt,
  FaClock,
  FaCloud,
  FaStore,
  FaBarcode,
  FaBalanceScale,
  FaRegFileAlt,
} from "react-icons/fa";
import { MdLanguage } from "react-icons/md";
import { motion } from "framer-motion";
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const PosHome = () => {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "sw"
  );
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const texts = {
    sw: {
      brand: "POS SYSTEM",
      title: "Mfumo wa Mauzo (POS)",
      welcome: "Karibu kwenye mfumo wa mauzo ya kisasa!",
      slogan:
        "Simamia mauzo, bidhaa, wateja, na ripoti kwa urahisi na haraka.",
      register: "Jisajili",
      login: "Ingia",
      aboutTitle: "Kuhusu Mfumo",
      aboutDesc:
        "POS System ni mfumo wa mauzo unaokusaidia kudhibiti biashara yako — bidhaa, mauzo, wateja, na ripoti zote kwa ufanisi.",
      benefitsTitle: "Faida za Mfumo",
      benefits: [
        {
          icon: <FaShieldAlt />,
          title: "Usalama",
          desc: "Taarifa za mauzo na wateja zinahifadhiwa kwa usalama.",
        },
        {
          icon: <FaClock />,
          title: "Ufanisi",
          desc: "Fanya mauzo haraka na rahisi kwa kutumia POS interface ya kisasa.",
        },
        {
          icon: <FaCloud />,
          title: "Upatikanaji Mtandaoni",
          desc: "Fikia taarifa zako popote kupitia intaneti.",
        },
      ],
      testimonialsTitle: "Ushuhuda wa Watumiaji",
      contactTitle: "Wasiliana Nasi",
    },
    en: {
      brand: "POS SYSTEM",
      title: "Point of Sale System",
      welcome: "Welcome to our modern POS platform!",
      slogan:
        "Easily manage sales, products, customers, and business reports.",
      register: "Register",
      login: "Login",
      aboutTitle: "About the System",
      aboutDesc:
        "POS System helps you manage your business efficiently — products, sales, customers, and reports all in one place.",
      benefitsTitle: "System Benefits",
      benefits: [
        {
          icon: <FaShieldAlt />,
          title: "Security",
          desc: "Your sales and customer data are safely protected.",
        },
        {
          icon: <FaClock />,
          title: "Efficiency",
          desc: "Sell faster and manage your store seamlessly.",
        },
        {
          icon: <FaCloud />,
          title: "Online Access",
          desc: "Access your POS data anywhere, anytime.",
        },
      ],
      testimonialsTitle: "User Testimonials",
      contactTitle: "Contact Us",
    },
  };

  const t = texts[language];
  const heroImages = ["/pos1.jpg", "/pos2.jpg"];

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
  };

  const testimonials = [
    {
      name: "Neema Traders",
      feedback:
        "POS System imerahisisha usimamizi wa mauzo na stock katika duka letu. Ni rahisi na ya haraka!",
    },
    {
      name: "Kibo Supermarket",
      feedback:
        "Tunaweza kufuatilia mauzo ya kila siku na ripoti za wafanyakazi kwa urahisi. Mfumo bora kabisa!",
    },
  ];

  const features = [
    {
      title: "Sales Management",
      icon: <FaCashRegister />,
      description: "Record and manage all your daily transactions easily.",
    },
    {
      title: "Product Inventory",
      icon: <FaBoxes />,
      description: "Keep track of all stock and restocking activities.",
    },
    {
      title: "Customer Profiles",
      icon: <FaUsers />,
      description: "Manage loyal customers and their purchase history.",
    },
    {
      title: "Reports & Insights",
      icon: <FaChartLine />,
      description: "Analyze your sales and performance through reports.",
    },
    {
      title: "Barcode & Receipt Printing",
      icon: <FaBarcode />,
      description: "Generate receipts and scan items quickly.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 font-sans relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden">
        <Slider {...sliderSettings}>
          {heroImages.map((imgUrl, idx) => (
            <div key={idx} className="w-full h-screen relative">
              <div
                className="absolute inset-0 bg-cover bg-center scale-105 brightness-90"
                style={{ backgroundImage: `url('${imgUrl}')` }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-40" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="max-w-3xl"
                >
                  <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
                    {t.title}
                  </h1>
                  <p className="text-xl sm:text-2xl text-gray-200 mb-4">
                    {t.welcome}
                  </p>
                  <p className="text-lg sm:text-xl text-gray-300 mb-8">
                    {t.slogan}
                  </p>
                  <div className="flex justify-center gap-4 flex-wrap">
                    <button
                      onClick={() => navigate("/signup")}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition duration-300"
                    >
                      <FaUserPlus className="text-xl" /> {t.register}
                    </button>
                    <button
                      onClick={() => navigate("/login")}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition duration-300"
                    >
                      <FaSignInAlt className="text-xl" /> {t.login}
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </Slider>

        {/* Top Bar */}
        <div className="absolute top-4 left-6 right-6 z-20 flex justify-between items-center backdrop-blur-md bg-white/10 px-4 py-2 rounded-full shadow-md">
          <div className="text-white text-2xl font-bold tracking-wide drop-shadow">
            {t.brand}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setLanguage("sw")}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-full transition ${
                language === "sw"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white/70 text-gray-800 hover:bg-white"
              }`}
            >
              <MdLanguage /> Swahili
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`flex items-center gap-1 px-3 py-1 text-sm rounded-full transition ${
                language === "en"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-white/70 text-gray-800 hover:bg-white"
              }`}
            >
              <MdLanguage /> English
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <motion.section
        className="relative z-10 py-20 px-6 sm:px-20 bg-white/80 backdrop-blur-md mx-4 sm:mx-20 rounded-3xl shadow-xl -mt-24"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-blue-900 mb-4">{t.aboutTitle}</h2>
          <p className="text-gray-700 text-lg">{t.aboutDesc}</p>
        </div>
      </motion.section>

      {/* Benefits Section */}
      <motion.section
        className="relative z-10 py-20 px-6 sm:px-20 bg-gradient-to-b from-blue-50 to-white"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-blue-800 mb-10">{t.benefitsTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="bg-white/90 rounded-2xl shadow-xl p-6 flex flex-col items-center text-center transition hover:shadow-blue-100"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <div className="text-blue-600 text-4xl mb-4">{benefit.icon}</div>
                <h4 className="text-xl font-semibold mb-2">{benefit.title}</h4>
                <p className="text-gray-600">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section
        className="relative z-10 py-20 px-6 sm:px-20 bg-gradient-to-b from-blue-50 via-white to-blue-50"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-blue-900 mb-12">{t.testimonialsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {testimonials.map((tst, idx) => (
              <motion.div
                key={idx}
                className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-6 text-left transition hover:shadow-xl border border-white/40"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
              >
                <p className="text-gray-800 mb-4">"{tst.feedback}"</p>
                <p className="font-semibold text-blue-800">{tst.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Contact Section */}
      <motion.section
        className="relative z-10 py-20 px-6 sm:px-20 bg-white/90 backdrop-blur-md mx-4 sm:mx-20 rounded-3xl shadow-xl"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-blue-900 mb-8">{t.contactTitle}</h2>
          <form className="grid gap-6">
            <input
              type="text"
              placeholder="Jina / Name"
              className="p-3 rounded-xl border border-gray-300 shadow-sm"
            />
            <input
              type="email"
              placeholder="Barua pepe / Email"
              className="p-3 rounded-xl border border-gray-300 shadow-sm"
            />
            <textarea
              placeholder="Ujumbe / Message"
              className="p-3 rounded-xl border border-gray-300 shadow-sm"
              rows={5}
            ></textarea>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-blue-700 transition">
              Tuma / Send
            </button>
          </form>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 text-center text-sm text-gray-500 py-8 bg-transparent mt-10">
        <div className="text-gray-600">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-blue-700">POS System</span>. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PosHome;
