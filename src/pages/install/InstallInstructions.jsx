import React from "react";
import { FaMobileAlt, FaLaptop, FaCheckCircle } from "react-icons/fa";
import { Link } from "react-router-dom";

/* ================= STEP CARD ================= */
const StepCard = ({ step, title, description, items }) => (
  <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-[#e5e7eb]">
    {/* Header */}
    <div className="flex items-center gap-4 mb-4">
      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#2563EB] text-white font-bold shadow">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
    </div>

    {description && (
      <p className="text-gray-600 text-sm mb-5">{description}</p>
    )}

    {/* Items */}
    <div className="grid sm:grid-cols-2 gap-5">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-gray-50 rounded-xl p-4 border hover:scale-[1.02] transition"
        >
          <img
            src={item.img}
            alt="step"
            className="rounded-lg border mb-3 w-full"
          />
          <p className="text-sm text-gray-700">{item.text}</p>
        </div>
      ))}
    </div>
  </div>
);

/* ================= MAIN PAGE ================= */
export default function InstallInstructions() {
  return (
  <div className="min-h-screen bg-gradient-to-b from-[#EFF6FF] via-white to-white">

    {/* ================= HERO ================= */}
    <section className="text-center py-14 px-4">
      <img
        src="https://tbyynfxbcabjjbluxyol.supabase.co/storage/v1/object/public/avatars/pwa-512%20(6).png"
        alt="Sakinisha App"
        className="mx-auto w-44 mb-6"
      />
      <h1 className="text-4xl font-extrabold text-[#2563EB] mb-3">
        Sakinisha App Hii
      </h1>
      <p className="text-gray-600 max-w-2xl mx-auto text-lg">
        Sakinisha app hii mara moja na ufikie mfumo haraka, kwa urahisi, na kwa usalama kila wakati.
      </p>
    </section>

    <main className="max-w-6xl mx-auto px-4 pb-24">

      {/* ================= NOTICE CARD ================= */}
      <div className="bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-2xl p-6 mb-14 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <FaLaptop className="text-[#2563EB]" size={22} />
          <h3 className="text-xl font-bold text-[#2563EB]">
            Pendekezo la Uzoefu Bora
          </h3>
        </div>

        <p className="text-gray-700 text-sm leading-relaxed">
          Kwa utendaji bora na vipengele vyote, tunapendekeza kutumia <b>kompyuta</b>. 
          Hata hivyo, unaweza kusakinisha na kutumia app hii kwenye <b>simu za mkononi au tablet</b> bila shida yoyote.
        </p>

        <Link to="/dashboard/install/installcomputer">
          <button className="mt-5 bg-[#2563EB] text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-blue-700 transition">
            💻 Sakinisha kwenye Kompyuta
          </button>
        </Link>
      </div>

      {/* ================= MOBILE STEPS ================= */}
      <h2 className="text-3xl font-bold text-center mb-12 text-[#2563EB] flex items-center justify-center gap-2">
        <FaMobileAlt /> Sakinisha kwenye Simu (Android & iPhone)
      </h2>

      <div className="space-y-10">
        <StepCard
          step={1}
          title="Fungua Menu ya Browser / Share"
          items={[
            {
              img: "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/android-menu.jpeg",
              text: "Android: Gusa nukta tatu (⋮) juu kulia kwenye browser",
            },
            {
              img: "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/iphone-share.jpg",
              text: "iPhone: Gusa ikoni ya Share chini kwenye Safari",
            },
          ]}
        />

        <StepCard
          step={2}
          title='Chagua "Ongeza kwenye Skrini ya Nyumbani"'
          items={[
            {
              img: "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/android-add-home.jpeg",
              text: "Android: Chagua Ongeza kwenye Skrini ya Nyumbani",
            },
            {
              img: "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/iphone-add-home.jpg",
              text: "iPhone: Piga chini na gusa Ongeza kwenye Skrini ya Nyumbani",
            },
          ]}
        />

        <StepCard
          step={3}
          title="Thibitisha & Maliza"
          description="Thibitisha usakinishaji na subiri sekunde chache ili ikoni ya app ionekane kwenye skrini ya nyumbani."
          items={[
            {
              img: "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/android-add-confirm.jpeg",
              text: "Android: Gusa Ongeza ili kuthibitisha",
            },
            {
              img: "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/iphone-add-confirm.jpg",
              text: "iPhone: Gusa Ongeza juu kulia",
            },
          ]}
        />
      </div>

      {/* ================= FINAL PREVIEW ================= */}
      <div className="mt-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-[#2563EB] mb-4 flex items-center justify-center gap-2">
            <FaCheckCircle /> Ikoni ya App
          </h3>
          <img
            src="https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/app-icon.png"
            className="mx-auto w-20 h-20 rounded-full shadow border"
            alt="Ikoni ya App"
          />
          <p className="text-gray-600 text-sm mt-2">
            Ikoni hii itaonekana kwenye skrini yako ya nyumbani
          </p>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold text-[#2563EB] mb-4">
            Muonekano wa App
          </h3>
          <img
            src="https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/app-appearence.jpg"
            className="mx-auto rounded-xl shadow-lg border max-w-sm"
            alt="Muonekano wa App"
          />
        </div>
      </div>

    </main>
  </div>
);

  
}
