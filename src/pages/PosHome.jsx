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
  FaTools,
  FaHammer,
} from "react-icons/fa";
import { MdLanguage } from "react-icons/md";
import { motion } from "framer-motion";
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const HardwareHome = () => {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "sw"
  );
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const texts = {
    sw: {
      brand: "HARDWARE SYSTEM",
      title: "Mfumo wa Usimamizi wa Duka la Hardware",
      welcome: "Karibu kwenye mfumo wa kisasa wa hardware!",
      slogan:
        "Simamia mauzo ya saruji, nondo, misumari, mabomba, rangi na vifaa vyote vya ujenzi kwa urahisi na haraka.",
      register: "Jisajili",
      login: "Ingia",
      aboutTitle: "Kuhusu Mfumo",
      aboutDesc:
        "Hardware System ni mfumo wa kusimamia duka la hardware kwa ufanisi — bidhaa, stock, mauzo, wateja na ripoti zote sehemu moja.",
      benefitsTitle: "Faida za Mfumo",
      benefits: [
        {
          icon: <FaShieldAlt />,
          title: "Usalama wa Taarifa",
          desc: "Taarifa za mauzo, stock na wateja zinahifadhiwa kwa usalama mkubwa.",
        },
        {
          icon: <FaClock />,
          title: "Ufanisi wa Kazi",
          desc: "Fanya mauzo haraka bila makosa ya hesabu au stock.",
        },
        {
          icon: <FaCloud />,
          title: "Upatikanaji Mtandaoni",
          desc: "Fikia taarifa zako popote kupitia intaneti.",
        },
      ],
      testimonialsTitle: "Maoni ya Wateja",
      contactTitle: "Wasiliana Nasi",
    },
    en: {
      brand: "HARDWARE SYSTEM",
      title: "Hardware Store Management System",
      welcome: "Welcome to the modern hardware management platform!",
      slogan:
        "Manage cement, steel, nails, pipes, paints and all building materials easily and fast.",
      register: "Register",
      login: "Login",
      aboutTitle: "About the System",
      aboutDesc:
        "Hardware System helps you manage your hardware store efficiently — products, stock, sales, customers and reports in one place.",
      benefitsTitle: "System Benefits",
      benefits: [
        {
          icon: <FaShieldAlt />,
          title: "Data Security",
          desc: "Your sales, stock and customer data are fully protected.",
        },
        {
          icon: <FaClock />,
          title: "High Efficiency",
          desc: "Sell faster and manage stock accurately.",
        },
        {
          icon: <FaCloud />,
          title: "Online Access",
          desc: "Access your hardware data anywhere, anytime.",
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
      name: "Mlimani Hardware",
      feedback:
        "Mfumo huu umetusaidia kufuatilia stock ya saruji na nondo bila makosa. Kazi imekuwa rahisi sana!",
    },
    {
      name: "City Builders",
      feedback:
        "Sasa tunaona mauzo ya kila siku na faida kwa urahisi. Mfumo ni mzuri sana kwa hardware.",
    },
  ];

  const features = [
    {
      title: "Usimamizi wa Mauzo",
      icon: <FaCashRegister />,
      description: "Rekodi na simamia mauzo yote ya vifaa vya hardware kwa urahisi.",
    },
    {
      title: "Stock & Bidhaa",
      icon: <FaBoxes />,
      description: "Fuatilia stock ya nondo, saruji, misumari, mabomba na vifaa vingine.",
    },
    {
      title: "Wateja & Wauzaji",
      icon: <FaUsers />,
      description: "Hifadhi taarifa za wateja na suppliers wako.",
    },
    {
      title: "Ripoti & Takwimu",
      icon: <FaChartLine />,
      description: "Pata ripoti za mauzo, faida na matumizi kwa muda halisi.",
    },
    {
      title: "Vipimo & Mizani",
      icon: <FaBalanceScale />,
      description: "Dhibiti bidhaa za kilo, mita, na vipimo vingine vya ujenzi.",
    },
    {
      title: "Zana & Vifaa",
      icon: <FaTools />,
      description: "Simamia zana kama nyundo, mashine, na vifaa vingine vya kazi.",
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
          <span className="font-semibold text-blue-700">Hardware System</span>. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default HardwareHome;
