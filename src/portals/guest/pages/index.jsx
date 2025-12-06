// src/portals/guest/pages/index.jsx
import GuestPortalLayout from "../layouts/GuestPortalLayout";
import { Link } from "react-router-dom";
import { FaBed, FaLock, FaMoneyBillWave, FaCheckCircle } from "react-icons/fa";

export default function GuestPortalHome() {
  return (
    <GuestPortalLayout>
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-6">
            Book Your Stay with Ease
          </h1>
          <p className="text-gray-600 text-lg md:text-xl mb-8">
            Browse rooms, make bookings, and manage your stays all in one place.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/portals/guest/rooms"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-semibold transition"
            >
              View Rooms
            </Link>
            <Link
              to="/portals/guest/login"
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-md text-lg font-semibold transition"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Why Choose Our Guest House?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Feature
              icon={<FaBed className="text-3xl text-blue-600" />}
              title="Variety of Rooms"
              desc="Choose from a range of comfortable and modern rooms."
            />
            <Feature
              icon={<FaLock className="text-3xl text-blue-600" />}
              title="Secure Booking"
              desc="Your information is safe with our secure platform."
            />
            <Feature
              icon={<FaMoneyBillWave className="text-3xl text-blue-600" />}
              title="Affordable Prices"
              desc="Enjoy top-notch rooms at budget-friendly rates."
            />
            <Feature
              icon={<FaCheckCircle className="text-3xl text-blue-600" />}
              title="Instant Confirmation"
              desc="Book instantly and receive confirmation immediately."
            />
          </div>
        </div>
      </section>
    </GuestPortalLayout>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{desc}</p>
    </div>
  );
}
