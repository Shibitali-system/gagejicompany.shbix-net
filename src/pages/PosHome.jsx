import { useState, useEffect } from "react";
import {
  FiSun,
  FiMoon,
  FiShoppingCart,
  FiUser,
  FiLogIn
} from "react-icons/fi";

export default function GagejiCompanyLimited() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".animate-on-scroll").forEach(el => observer.observe(el));
  }, []);

  const products = [
    {
      title: "Gageji Cola",
      desc: "Kinywaji cha cola chenye ladha kali na ubora wa juu.",
      img: "/pos2.png"
    },
    {
      title: "Gageji Orange Soda",
      desc: "Soda ya machungwa yenye ladha ya asili na yenye kuburudisha.",
      img: "/pos1.png"
    },
    {
      title: "Gageji Lemon Lime",
      desc: "Kinywaji cha limao na limau, kinachotoa msisimko wa baridi.",
      img: "/pos1.png"
    },
    {
      title: "Gageji Energy Drink",
      desc: "Energy drink inayokupa nguvu na umakini kwa siku nzima.",
      img: "/pos2.png"
    },
    {
      title: "Gageji Sparkling Water",
      desc: "Maji ya madini yenye gesi kwa afya na hydration.",
      img: "/pos2.png"
    },
    {
      title: "Gageji Bottling Services",
      desc: "Huduma za kujaza na kufunga vinywaji kwa viwango vya viwanda.",
      img: "/pos1.png"
    }
  ];

  return (
    <div className="min-h-screen transition-colors duration-500 bg-slate-50 text-slate-800 dark:bg-gradient-to-br dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 dark:text-slate-100">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">

          <h1 className="text-2xl font-extrabold tracking-wide">
            GAGEJI <span className="text-cyan-500">COMPANY</span> LIMITED
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/login"
              className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-black font-semibold flex items-center gap-2"
            >
              <FiLogIn /> Login
            </a>

            <a
              href="/signup"
              className="px-5 py-2 rounded-full border flex items-center gap-2"
            >
              <FiUser /> Sign Up
            </a>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full border"
            >
              {theme === "dark" ? <FiSun /> : <FiMoon />}
            </button>
          </div>

        </div>
      </nav>

      {/* HERO */}
<section className="relative h-[75vh] md:h-[80vh] flex items-center justify-center px-6">

  {/* Background */}
  <div
    className="absolute inset-0 bg-cover bg-center brightness-110"
    style={{ backgroundImage: "url('/pos1.png')" }}
  />
  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-black/40" />

  {/* TOP RIGHT BUTTON */}
  <div className="absolute top-6 right-6 z-20">
    <a
      href="#products"
      className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-black font-semibold shadow-lg hover:scale-105 transition duration-300"
    >
      <FiShoppingCart />
      Products
    </a>
  </div>

</section>

      {/* ABOUT */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center opacity-0 translate-y-12 animate-on-scroll transition-all duration-700 ease-out">
        <h3 className="text-3xl font-bold mb-6">About Us</h3>
        <p className="max-w-3xl mx-auto opacity-80">
          Gageji Company Limited ni kiwanda cha kisasa cha vinywaji kinachozalisha soda,
          energy drinks na maji ya madini. Tunazingatia ubora wa juu, usafi wa uzalishaji
          na kuwahudumia wateja kwa viwango vya kimataifa.
        </p>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-center mb-16 opacity-0 translate-y-12 animate-on-scroll transition-all duration-700 ease-out">
          Our Beverages
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {products.map((p, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden border bg-white/70 dark:bg-white/5 border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all duration-700 ease-out opacity-0 translate-y-12 animate-on-scroll"
            >
              <div className="h-64 w-full overflow-hidden">
                <img
                  src={p.img}
                  alt={p.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6">
                <h4 className="text-xl font-semibold mb-3">{p.title}</h4>
                <p className="opacity-80">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pt-16 pb-8 px-6 opacity-0 translate-y-12 animate-on-scroll transition-all duration-700 ease-out">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">

          <div>
            <h4 className="text-xl font-bold mb-4">About Gageji</h4>
            <p className="opacity-80">
              Gageji Company Limited inazalisha soda na vinywaji baridi vya ubora wa juu,
              kwa ajili ya soko la Tanzania na nje ya nchi.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#products">Products</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="/login">Login</a></li>
              <li><a href="/signup">Sign Up</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-bold mb-4">Contact</h4>
            <p>📞 +255 7XX XXX XXX</p>
            <p>📧 info@gagejicompany.co.tz</p>
            <p>🏭 Tanzania</p>
          </div>

          <div>
            <h4 className="text-xl font-bold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#">Facebook</a>
              <a href="#">Instagram</a>
              <a href="#">Twitter</a>
              <a href="#">LinkedIn</a>
            </div>
          </div>

        </div>

        <div className="mt-10 text-center border-t border-black/10 dark:border-white/10 pt-6 opacity-80">
          <p>© 2026 GAGEJI COMPANY LIMITED. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}