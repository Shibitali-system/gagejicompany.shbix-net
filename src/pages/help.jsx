import React, { useState } from "react";

const FormCard = ({ title, children }) => (
  <div className="
    bg-white border border-[#e5e7eb] rounded-[4px] px-5 py-4
    flex flex-col gap-3 transition-all duration-200
    hover:bg-[#fdfdfd] shadow-[0_1px_0px_0_rgba(0,0,0,0.2)]
    font-sans w-full
  ">
    <p className="text-gray-500 text-[11px] md:text-sm tracking-wide">
      {title}
    </p>
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
    {title && (
      <p className="text-gray-500 text-[11px] md:text-sm tracking-wide mb-1">
        {title}
      </p>
    )}
    <div className="w-full">{children}</div>
  </div>
);

const Help = ({ user }) => {
  const [activeFAQ, setActiveFAQ] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [activeTutorialTab, setActiveTutorialTab] = useState(0);

  // FAQs grouped by modules (Kiswahili)
const faqGroups = [
  {
    title: "Bidhaa",
    faqs: [
      { question: "Ninaongezaje bidhaa mpya?", answer: "Nenda Bidhaa → Mpya, jaza maelezo ya bidhaa (jina, kategoria, bei, hisa, muda wa kumalizika), kisha bonyeza Hifadhi." },
      { question: "Ninaongezaje hisa kwa bidhaa iliyopo?", answer: "Nenda Bidhaa → Ongeza Hisa, chagua bidhaa, weka kiasi, kisha hifadhi." },
      { question: "Ninawezaje kufuatilia bidhaa zilizomalizika muda wake?", answer: "Nenda Zilizomalizika → Orodha ili kuona bidhaa zote zilizomalizika." },
    ],
  },
  {
    title: "Mauzo",
    faqs: [
      { question: "Ninawezaje kuona ripoti za mauzo?", answer: "Nenda Ripoti kutoka kwenye sidebar. Tumia filter kwa tarehe, bidhaa, au mteja." },
      { question: "Ninawezaje kutengeneza ankara ya proforma?", answer: "Nenda Mauzo → Proforma → Mpya, jaza maelezo, kisha hifadhi." },
      { question: "Ninawezaje kutoa risiti kwa mteja?", answer: "Nenda Mauzo → Risiti, chagua mauzo, kisha chagua kuchapisha au kuona risiti." },
      { question: "Ninawezaje kurekodi marejeo ya mauzo?", answer: "Nenda Mauzo → Marejeo → Rekodi, chagua bidhaa, kisha hifadhi marejeo." },
    ],
  },
  {
    title: "Manunuzi",
    faqs: [
      { question: "Ninawezaje kurekodi ununuzi?", answer: "Nenda Manunuzi → Mpya, jaza maelezo, kisha hifadhi." },
      { question: "Ninawezaje kurekodi marejeo ya ununuzi?", answer: "Nenda Manunuzi → Marejeo → Rekodi, chagua ununuzi na bidhaa, kisha hifadhi." },
      { question: "Ninawezaje kuona historia ya manunuzi?", answer: "Nenda Manunuzi → Historia, chagua muuzaji au kipengele cha tarehe." },
    ],
  },
  {
    title: "Wateja",
    faqs: [
      { question: "Ninawezaje kuongeza mteja mpya?", answer: "Nenda Wateja → Mpya, jaza maelezo, kisha hifadhi." },
      { question: "Ninawezaje kuhariri maelezo ya mteja?", answer: "Nenda Wateja → Hariri, chagua mteja, sasisha maelezo, kisha hifadhi." },
    ],
  },
  {
    title: "Wauzaji",
    faqs: [
      { question: "Ninawezaje kuongeza muuzaji mpya?", answer: "Nenda Wauzaji → Mpya, jaza maelezo, kisha hifadhi." },
      { question: "Ninawezaje kusimamia malipo ya muuzaji?", answer: "Nenda Wauzaji → Malipo au Payment Index ili kuona au kurekodi malipo." },
    ],
  },
  {
    title: "Wafanyakazi",
    faqs: [
      { question: "Ninawezaje kuongeza mfanyakazi mpya?", answer: "Nenda Wafanyakazi → Mpya, jaza maelezo, kisha hifadhi." },
      { question: "Ninawezaje kusimamia majukumu ya wafanyakazi?", answer: "Nenda Mipangilio → Faragha & Majukumu. Hariri majukumu ya chaguo-msingi au mfanyakazi mmoja mmoja." },
    ],
  },
  {
    title: "Malipo & Ankara",
    faqs: [
      { question: "Ninawezaje kutengeneza bili mpya?", answer: "Nenda Malipo → Mpya, chagua mteja na bidhaa, kisha hifadhi." },
      { question: "Ninawezaje kuona maelezo ya bili?", answer: "Nenda Malipo → Chagua bili ili kuona maelezo." },
    ],
  },
  {
    title: "Matumizi",
    faqs: [
      { question: "Ninawezaje kurekodi matumizi mapya?", answer: "Nenda Matumizi → Mpya au tab ya Matumizi, jaza maelezo, kisha hifadhi." },
      { question: "Ninawezaje kuona maombi yote ya matumizi?", answer: "Nenda Matumizi → Orodha ya Matumizi kuona maombi." },
    ],
  },
  {
    title: "Mahudhurio",
    faqs: [
      { question: "Ninawezaje kuashiria mahudhurio?", answer: "Nenda Mahudhurio → Mpya, jaza maelezo." },
      { question: "Ninawezaje kuona rekodi za mahudhurio?", answer: "Nenda Mahudhurio → Orodha au chagua mfanyakazi kuona maelezo." },
    ],
  },
  {
    title: "Profaili & Mipangilio",
    faqs: [
      { question: "Ninawezaje kusasisha profaili yangu?", answer: "Nenda Profaili, hariri maelezo, kisha hifadhi." },
      { question: "Ninawezaje kusanidi mipangilio?", answer: "Nenda Mipangilio → Rekebisha mapendeleo kisha hifadhi." },
    ],
  },
  {
    title: "Modules Nyingine",
    faqs: [
      { question: "Ninawezaje kuona ripoti?", answer: "Nenda Ripoti kutoka sidebar na tumia filter kama inavyohitajika." },
      { question: "Ninawezaje kusimamia arifa?", answer: "Nenda Arifa kutoka sidebar na usanidi alerts." },
      { question: "Ninawezaje kusimamia usajili?", answer: "Nenda Usajili kutoka sidebar kuona mpango na bili." },
      { question: "Ninawezaje kuwasiliana na msaada?", answer: "Tuma barua pepe kwa support@pharmacyapp.com au anza chat ya moja kwa moja kwenye WhatsApp." },
    ],
  },
];

// Tutorials (Kiswahili)
const tutorials = [
  { title: "Kuweka Mauzo Mpya", video: "https://www.youtube.com/embed/YFAIlOZaZ3M" },
  { title: "Kusimamia Hisa", video: "https://www.youtube.com/embed/YFAIlOZaZ3M" },
  { title: "Wafanyakazi & Majukumu", video: "https://www.youtube.com/embed/YFAIlOZaZ3M" },
];



  const toggleGroup = (groupTitle) => {
    setExpandedGroups(prev => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-10">
    <div className="max-w-5xl mx-auto space-y-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2563EB] mb-10 text-center sm:text-left">
        Msaada & Usaidizi
      </h1>

      {/* FAQs Accordion */}
      <FormCard title="Maswali Yanayoulizwa Mara kwa Mara (FAQs)">
        {faqGroups.map((group, gIdx) => {
          const showAll = expandedGroups[group.title] || false;
          const displayedFAQs = showAll ? group.faqs : group.faqs.slice(0, 2);
          return (
            <div key={gIdx} className="space-y-6">
              <h3 className="text-xl font-semibold mb-4 text-[#2563EB]">{group.title}</h3>
              <div className="space-y-4">
                {displayedFAQs.map((faq, idx) => (
                  <CustomCard key={idx}>
                    <button
                      onClick={() =>
                        setActiveFAQ(activeFAQ === `${group.title}-${idx}` ? null : `${group.title}-${idx}`)
                      }
                      className="w-full flex justify-between items-center font-semibold text-gray-800"
                    >
                      <span>{faq.question}</span>
                      <span className="text-[#2563EB] font-bold text-xl">
                        {activeFAQ === `${group.title}-${idx}` ? "-" : "+"}
                      </span>
                    </button>
                    {activeFAQ === `${group.title}-${idx}` && (
                      <p className="mt-2 text-gray-600">{faq.answer}</p>
                    )}
                  </CustomCard>
                ))}
              </div>

              {group.faqs.length > 2 && (
                <div className="text-center mt-2">
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="text-[#2563EB] font-semibold hover:underline"
                  >
                    {showAll ? "Angalia Chini" : "Angalia Zaidi"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </FormCard>

      {/* Tutorials */}
      <FormCard title="Mafunzo">
        <div className="flex flex-wrap gap-2 mb-4">
          {tutorials.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTutorialTab(idx)}
              className={`px-4 py-2 rounded-xl font-semibold transition ${
                activeTutorialTab === idx
                  ? "bg-[#2563EB] text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        <CustomCard>
          <h3 className="font-semibold text-lg sm:text-xl mb-4 text-[#2563EB]">
            {tutorials[activeTutorialTab].title}
          </h3>
          <div className="aspect-w-16 aspect-h-9">
            <iframe
              title={tutorials[activeTutorialTab].title}
              src={tutorials[activeTutorialTab].video}
              className="w-full h-full rounded-xl"
              allowFullScreen
            />
          </div>
          <p className="mt-3 text-gray-500 text-sm">
            Kumbuka: Fuata mafunzo hatua kwa hatua ili kuepuka makosa.
          </p>
        </CustomCard>
      </FormCard>

      {/* Contact Support */}
      <FormCard title="Wasiliana na Msaada">
        <p className="text-gray-700 mb-2">
          Unahitaji msaada? Wasiliana na timu yetu ya msaada kupitia barua pepe au chat ya moja kwa moja.
        </p>
        <p>
          <strong>Barua Pepe:</strong>{" "}
          <a href="mailto:support@pharmacyapp.com" className="text-[#2563EB] hover:underline font-medium">
            support@pharmacyapp.com
          </a>
        </p>
        <p>
          <strong>Chat ya Moja kwa Moja:</strong>{" "}
          <a href="https://wa.me/255774737736" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline font-medium">
            Anza Chat
          </a>
        </p>
        <p className="mt-2 text-gray-500 text-sm">
          Kumbuka: Timu yetu ya msaada inajibu ndani ya masaa 24.
        </p>
      </FormCard>
    </div>
  </div>
);

};

export default Help;
