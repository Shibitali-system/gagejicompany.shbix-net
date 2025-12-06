import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../supabaseClient";

const BookingSuccess = () => {
  const router = useRouter();
  const { bookingId } = router.query;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          room_id,
          guest_name,
          guest_email,
          guest_phone,
          start_date,
          end_date,
          total_price,
          status,
          rooms (name, images)
        `
        )
        .eq("id", bookingId)
        .single();

      if (error) {
        setError("Tatizo kupata maelezo ya booking. Tafadhali jaribu tena.");
        setLoading(false);
        return;
      }
      setBooking(data);
      setLoading(false);
    };

    fetchBooking();
  }, [bookingId]);

  if (loading) return <p>Inapakia maelezo ya booking...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!booking) return <p>Booking haipatikani.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-10">
      <h1 className="text-3xl font-bold mb-4 text-green-600">
        Asante kwa Booking Yako!
      </h1>
      <p className="mb-6">
        Tumepokea booking yako kwa {booking.rooms.name}. Taarifa za booking yako
        ziko hapa chini.
      </p>

      <div className="mb-6">
        {booking.rooms.images && booking.rooms.images.length > 0 && (
          <img
            src={booking.rooms.images[0]}
            alt={`Picha ya chumba: ${booking.rooms.name}`}
            className="w-full h-64 object-cover rounded"
          />
        )}
      </div>

      <div className="space-y-2">
        <p>
          <strong>Jina la Mgeni:</strong> {booking.guest_name}
        </p>
        <p>
          <strong>Simu:</strong> {booking.guest_phone}
        </p>
        <p>
          <strong>Barua Pepe:</strong> {booking.guest_email}
        </p>
        <p>
          <strong>Chumba:</strong> {booking.rooms.name}
        </p>
        <p>
          <strong>Kuanzia Tarehe:</strong>{" "}
          {new Date(booking.start_date).toLocaleDateString()}
        </p>
        <p>
          <strong>Mpaka Tarehe:</strong>{" "}
          {new Date(booking.end_date).toLocaleDateString()}
        </p>
        <p>
          <strong>Jumla ya Kulipia:</strong> TZS {booking.total_price.toLocaleString()}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={`font-semibold ${
              booking.status === "Confirmed"
                ? "text-green-600"
                : booking.status === "Pending"
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {booking.status}
          </span>
        </p>
      </div>

      <div className="mt-8 flex space-x-4">
        <button
          onClick={() => router.push("/")}
          className="px-5 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Rudi Homepage
        </button>

        <button
          onClick={() => router.push("/portals/guest/my-bookings")}
          className="px-5 py-3 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Tazama Bookings Zangu
        </button>
      </div>
    </div>
  );
};

export default BookingSuccess;
