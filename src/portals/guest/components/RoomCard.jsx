export default function RoomCard({ room }) {
  return (
    <div className="border rounded shadow p-4">
      <img src={room.image_url} alt={room.name} className="w-full h-40 object-cover rounded" />
      <h3 className="text-xl font-semibold mt-2">{room.name}</h3>
      <p className="text-gray-500">{room.description.slice(0, 100)}...</p>
      <p className="text-blue-600 font-bold mt-2">TZS {room.price_per_night}/night</p>
      <a
        href={`/portals/guest/rooms/${room.id}`}
        className="block mt-3 text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        View & Book
      </a>
    </div>
  );
}
