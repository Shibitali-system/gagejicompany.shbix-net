// src/portals/guest/pages/rooms/[id].jsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import GuestPortalLayout from "../../layouts/GuestPortalLayout";

export default function RoomDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({
    name: "",
    email: "",
    phone: "",
    check_in: "",
    check_out: "",
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (id) fetchRoomDetails();
  }, [id]);

  const fetchRoomDetails = async () => {
    const { data, error } = await supabase
      .from("guest_rooms")
      .select("*")
      .eq("id", id)
      .single();

    if (error) console.error("Fetch room error:", error);
    else setRoom(data);

    setLoading(false);
  };

  const handleChange = (e) => {
    setBooking({ ...booking, [e.target.name]: e.target.value });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    // Live availability check
    const { data: existingBookings, error } = await supabase
      .from("room_bookings")
      .select("*")
      .eq("room_id", id)
      .lte("check_in", booking.check_out)
      .gte("check_out", booking.check_in);

    if (error) {
      setMessage({ type: "error", text: "Error checking availability." });
      return;
    }

    if (existingBookings.length > 0) {
      setMessage({
        type: "error",
        text: "Room is not available for selected dates.",
      });
      return;
    }

    // Save booking
    const { error: insertError } = await supabase.from("room_bookings").insert([
      {
        room_id: id,
        ...booking,
      },
    ]);

    if (insertError) {
      setMessage({ type: "error", text: "Failed to book the room." });
    } else {
      setMessage({
        type: "success",
        text: "Booking confirmed! Our team will contact you shortly.",
      });
      setBooking({
        name: "",
        email: "",
        phone: "",
        check_in: "",
        check_out: "",
      });
    }
  };

  if (loading) return <div className="p-8 text-gray-600">Loading room details...</div>;
  if (!room) return <div className="p-8 text-red-600">Room not found.</div>;

  return (
    <GuestPortalLayout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Room Image */}
          <div>
            <img
              src={room.image_url || "/placeholder.jpg"}
              alt={room.name}
              className="w-full h-[320px] object-cover rounded-lg shadow"
            />
            <h1 className="text-3xl font-bold text-gray-800 mt-4">{room.name}</h1>
            <p className="text-sm text-gray-500 mb-2">{room.type}</p>
            <p className="text-xl text-blue-700 font-semibold mb-2">
              ${room.price} / night
            </p>
            <p className="text-gray-600">{room.description}</p>
          </div>

          {/* Booking Form */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Book This Room</h2>

            {message && (
              <div
                className={`mb-4 p-3 rounded ${
                  message.type === "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Your Full Name"
                value={booking.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded"
              />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={booking.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded"
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={booking.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  name="check_in"
                  value={booking.check_in}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded"
                />
                <input
                  type="date"
                  name="check_out"
                  value={booking.check_out}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition w-full"
              >
                Confirm Booking
              </button>
            </form>

            {/* Payment Option Placeholder */}
            <div className="mt-6 text-gray-500 text-sm">
              💳 Payment will be completed upon arrival or via payment link sent to your email.
            </div>
          </div>
        </div>
      </div>
    </GuestPortalLayout>
  );
}
