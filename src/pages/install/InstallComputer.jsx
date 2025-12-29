import React from "react";
import { FaDesktop, FaCheckCircle } from "react-icons/fa";

export default function InstallComputer() {
  const steps = [
    {
      title: "Fungua Chaguo la Usakinishaji",
      description:
        "Gusa ikoni ya usakinishaji (monitor) juu kulia kwenye browser yako kama inavyoonekana hapa chini.",
      image:
        "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/step1.png",
    },
    {
      title: "Thibitisha Usakinishaji",
      description:
        "Gusa kitufe cha Sakinisha wakati utaombwa. App itaanza kusakinishwa mara moja.",
      image:
        "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/step2.png",
    },
    {
      title: "App Imeongezwa Kwenye Desktop",
      description:
        "Baada ya usakinishaji, ikoni ya app itaonekana kwenye desktop yako.",
      image:
        "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/step3.png",
      iconOnly: true,
    },
    {
      title: "Anza Kutumia App",
      description:
        "Bonyeza mara mbili ikoni ya app wakati wowote kufungua na kuanza kutumia mfumo.",
      image:
        "https://taefrxhfuifjeavvrhfc.supabase.co/storage/v1/object/public/school-images/step4.png",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FF] via-white to-gray-100 text-gray-800">
      {/* ================= HERO ================= */}
      <section className="text-center py-14 px-4">
        <img
          src="https://tbyynfxbcabjjbluxyol.supabase.co/storage/v1/object/public/avatars/pwa-512%20(6).png"
          alt="Sakinisha App"
          className="mx-auto w-44 md:w-56 mb-6"
        />
        <h1 className="text-4xl font-extrabold text-[#2563EB] mb-3">
          Sakinisha App Hii Kwenye Kompyuta Yako
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Sakinisha app hii kama programu ya desktop kwenye kompyuta yako ya Windows au Mac 
          kwa upatikanaji wa haraka na utendaji bora zaidi.
        </p>
      </section>

      {/* ================= MAIN ================= */}
      <main className="max-w-5xl mx-auto px-4 pb-24">
        {/* ================= STEPS ================= */}
        <div className="grid md:grid-cols-2 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-[#e5e7eb] shadow-md hover:shadow-xl transition-all duration-300 p-6"
            >
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center shadow">
                  {index + 1}
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {step.title}
                </h2>
              </div>

              <p className="text-gray-600 text-sm mb-5">{step.description}</p>

              <div className="flex justify-center">
                {step.iconOnly ? (
                  <div className="w-56 h-56 flex items-center justify-center bg-gray-50 rounded-xl shadow p-4">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <img
                    src={step.image}
                    alt={step.title}
                    className="rounded-xl border shadow w-full max-w-md h-auto object-contain"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ================= FINAL MESSAGE ================= */}
        <div className="mt-20 bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-2xl p-8 text-center shadow-sm">
          <div className="flex justify-center mb-3">
            <FaCheckCircle className="text-[#2563EB]" size={32} />
          </div>
          <h3 className="text-2xl font-bold text-[#2563EB] mb-2">
            Usakinishaji Umekamilika
          </h3>
          <p className="text-gray-700 max-w-xl mx-auto">
            Sasa unaweza kufungua app hii moja kwa moja kutoka kwenye desktop yako wakati wowote.
            Mfumo ni haraka, salama, na kila wakati unasasishwa.
          </p>
        </div>
      </main>
    </div>
  );
}
