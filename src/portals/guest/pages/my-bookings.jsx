// src/portals/guest/pages/my-bookings.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import GuestPortalLayout from "../layouts/GuestPortalLayout";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      const user = supabase.auth.user();
      if (!user) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("email", user.email)
        .order("created_at", { ascending: false });

      if (!error) setBookings(data || []);
      setLoading(false);
    };

    fetchBookings();
  }, []);

  return (
    <GuestPortalLayout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">My Bookings</h1>

        {loading ? (
          <p>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-600">You haven't made any bookings yet.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="border rounded-lg p-4 shadow-sm bg-white flex justify-between items-center"
              >
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {booking.room_name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {booking.check_in} → {booking.check_out}
                  </p>
                  <p
                    className={`text-sm font-semibold mt-1 ${
                      booking.status === \"Confirmed\"
                        ? \"text-green-600\"
                        : booking.status === \"Pending\"
                        ? \"text-yellow-600\"
                        : \"text-red-600\"
                    }`}
                  >
                    Status: {booking.status}
                  </p>
                </div>
                {/* Optional: Edit or Cancel (future implementation) */}
              </div>
            ))}
          </div>
        )}
      </div>
    </GuestPortalLayout>
  );
}
