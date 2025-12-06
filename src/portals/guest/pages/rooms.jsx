// src/portals/guest/pages/rooms.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import GuestPortalLayout from "../layouts/GuestPortalLayout";
import { FaSearch } from "react-icons/fa";

export default function BrowseRooms() {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [priceRange, setPriceRange] = useState([0, 1000]);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    filterRooms();
  }, [search, typeFilter, priceRange, rooms]);

  const fetchRooms = async () => {
    const { data, error } = await supabase.from("guest_rooms").select("*").eq("status", "available");

    if (error) console.error("Error fetching rooms:", error);
    else setRooms(data);
  };

  const filterRooms = () => {
    let filtered = rooms.filter((room) => {
      const matchesSearch = room.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter ? room.type === typeFilter : true;
      const matchesPrice =
        room.price >= priceRange[0] && room.price <= priceRange[1];
      return matchesSearch && matchesType && matchesPrice;
    });
    setFilteredRooms(filtered);
  };

  return (
    <GuestPortalLayout>
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-700">Available Rooms</h1>
          <p className="text-gray-600">Choose the best room that fits your needs</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex items-center border rounded-md px-3 py-2 w-full md:w-1/2">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search room name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full outline-none bg-transparent"
            />
          </div>

          {/* Room Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border px-3 py-2 rounded-md"
          >
            <option value="">All Types</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="Suite">Suite</option>
          </select>

          {/* Price Range */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Price:</span>
            <input
              type="number"
              min="0"
              max="10000"
              value={priceRange[0]}
              onChange={(e) =>
                setPriceRange([parseInt(e.target.value), priceRange[1]])
              }
              className="w-20 border px-2 py-1 rounded-md"
            />
            <span>to</span>
            <input
              type="number"
              min="0"
              max="10000"
              value={priceRange[1]}
              onChange={(e) =>
                setPriceRange([priceRange[0], parseInt(e.target.value)])
              }
              className="w-20 border px-2 py-1 rounded-md"
            />
          </div>
        </div>

        {/* Room Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="border rounded-lg p-4 shadow hover:shadow-lg transition"
            >
              <img
                src={room.image_url || "/placeholder.jpg"}
                alt={room.name}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-800 mb-1">
                {room.name}
              </h3>
              <p className="text-sm text-gray-500 mb-2">{room.type}</p>
              <p className="text-lg text-blue-600 font-bold mb-4">
                ${room.price} / night
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md w-full hover:bg-blue-700 transition">
                Book Now
              </button>
            </div>
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <p className="text-gray-600 text-center mt-12">No rooms found matching your criteria.</p>
        )}
      </section>
    </GuestPortalLayout>
  );
}
