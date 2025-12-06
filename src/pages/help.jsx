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

  // FAQs grouped by modules
  const faqGroups = [
    {
      title: "Products",
      faqs: [
        { question: "How do I add a new product?", answer: "Go to Products → New, fill in the product details (name, category, price, stock, expiry), and click Save." },
        { question: "How do I add stock to an existing product?", answer: "Go to Products → Add Stock, select the product, enter quantity, and save." },
        { question: "How can I track expired products?", answer: "Navigate to Expired → List to view all expired products." },
      ],
    },
    {
      title: "Sales",
      faqs: [
        { question: "How can I view sales reports?", answer: "Go to Reports from the sidebar. Filter by date, product, or customer." },
        { question: "How do I create a proforma invoice?", answer: "Go to Sales → Proformer → New, fill in details, and save." },
        { question: "How do I generate a customer receipt?", answer: "Go to Sales → Receipts, select the sale, and print or view receipt." },
        { question: "How do I record a sales return?", answer: "Go to Sales → Returns → Record, select items, and save return." },
      ],
    },
    {
      title: "Purchases",
      faqs: [
        { question: "How to record a purchase?", answer: "Go to Purchases → New, fill details, and save." },
        { question: "How to record a purchase return?", answer: "Go to Purchases → Returns → Record, select the purchase and items, then save." },
        { question: "How can I view purchase history?", answer: "Go to Purchases → History, select the supplier or date range." },
      ],
    },
    {
      title: "Customers",
      faqs: [
        { question: "How do I add a new customer?", answer: "Go to Customers → New, fill details, and save." },
        { question: "How do I edit customer details?", answer: "Go to Customers → Edit, select customer, update info, and save." },
      ],
    },
    {
      title: "Suppliers",
      faqs: [
        { question: "How do I add a new supplier?", answer: "Go to Suppliers → New, fill details, and save." },
        { question: "How do I manage supplier payments?", answer: "Go to Suppliers → Payments or Payment Index to view or record payments." },
      ],
    },
    {
      title: "Employees",
      faqs: [
        { question: "How do I add a new employee?", answer: "Go to Employees → New, fill details, and save." },
        { question: "How do I manage staff roles?", answer: "Go to Settings → Privacy & Roles. Edit default or individual employee roles." },
      ],
    },
    {
      title: "Billing",
      faqs: [
        { question: "How do I create a new bill?", answer: "Go to Billing → New, select customer and products, and save." },
        { question: "How do I view billing details?", answer: "Go to Billing → Select Bill to view details." },
      ],
    },
    {
      title: "Expenses",
      faqs: [
        { question: "How do I record a new expense?", answer: "Go to Expenses → New or Expenses tab, fill details, and save." },
        { question: "How can I view all expense requests?", answer: "Go to Expenses → Expenses Index to see requests." },
      ],
    },
    {
      title: "Attendances",
      faqs: [
        { question: "How do I mark attendance?", answer: "Go to Attendances → New and fill details." },
        { question: "How do I view attendance records?", answer: "Go to Attendances → List or select individual to view details." },
      ],
    },
    {
      title: "Profile & Settings",
      faqs: [
        { question: "How do I update my profile?", answer: "Go to Profile, edit details, and save." },
        { question: "How do I configure settings?", answer: "Go to Settings → Adjust preferences and save." },
      ],
    },
    {
      title: "Other Modules",
      faqs: [
        { question: "How do I view reports?", answer: "Go to Reports from sidebar and filter as needed." },
        { question: "How do I manage notifications?", answer: "Go to Notifications from sidebar and configure alerts." },
        { question: "How do I manage subscription?", answer: "Go to Subscription from sidebar to view plan and billing." },
        { question: "How to contact support?", answer: "Email support@pharmacyapp.com or start live chat on WhatsApp." },
      ],
    },
  ];

  const tutorials = [
    { title: "Adding a New Sale", video: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
    { title: "Managing Inventory", video: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
    { title: "Staff & Roles", video: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
  ];

  const toggleGroup = (groupTitle) => {
    setExpandedGroups(prev => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  return (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-10">
    <div className="max-w-5xl mx-auto space-y-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#ef4444] mb-10 text-center sm:text-left">
        Help & Support
      </h1>

      {/* FAQs Accordion */}
      <FormCard title="FAQs">
        {faqGroups.map((group, gIdx) => {
          const showAll = expandedGroups[group.title] || false;
          const displayedFAQs = showAll ? group.faqs : group.faqs.slice(0, 2);
          return (
            <div key={gIdx} className="space-y-6">
              <h3 className="text-xl font-semibold mb-4 text-[#ef4444]">{group.title}</h3>
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
                      <span className="text-[#ef4444] font-bold text-xl">
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
                    className="text-[#ef4444] font-semibold hover:underline"
                  >
                    {showAll ? "View Less" : "View More"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </FormCard>

      {/* Tutorials */}
      <FormCard title="Tutorials">
        <div className="flex flex-wrap gap-2 mb-4">
          {tutorials.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTutorialTab(idx)}
              className={`px-4 py-2 rounded-xl font-semibold transition ${
                activeTutorialTab === idx
                  ? "bg-[#ef4444] text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        <CustomCard>
          <h3 className="font-semibold text-lg sm:text-xl mb-4 text-[#ef4444]">
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
            Tip: Follow the tutorial step by step to avoid mistakes.
          </p>
        </CustomCard>
      </FormCard>

      {/* Contact Support */}
      <FormCard title="Contact Support">
        <p className="text-gray-700 mb-2">
          Need assistance? Contact our support team via email or live chat.
        </p>
        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:support@pharmacyapp.com" className="text-[#ef4444] hover:underline font-medium">
            support@pharmacyapp.com
          </a>
        </p>
        <p>
          <strong>Live Chat:</strong>{" "}
          <a href="https://wa.me/255774737736" target="_blank" rel="noopener noreferrer" className="text-[#ef4444] hover:underline font-medium">
            Start Chat
          </a>
        </p>
        <p className="mt-2 text-gray-500 text-sm">
          Tip: Our support team responds within 24 hours.
        </p>
      </FormCard>
    </div>
  </div>
);

};

export default Help;
