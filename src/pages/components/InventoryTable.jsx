export default function InventoryTable({ items = [] }) {
  if (!items.length) {
    return (
      <div className="text-center py-6 text-gray-500">
        No low stock items found 🎉
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold">#</th>
            <th className="px-4 py-2 text-left text-sm font-semibold">Product Name</th>
            <th className="px-4 py-2 text-left text-sm font-semibold">Stock</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {items.map((item, index) => (
            <tr key={item.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2">{index + 1}</td>
              <td className="px-4 py-2 font-medium">{item.name}</td>
              <td className={`px-4 py-2 font-semibold ${item.stock < 5 ? "text-red-500" : "text-yellow-500"}`}>
                {item.stock}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
