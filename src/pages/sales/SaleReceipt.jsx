// src/systems/pos/components/SaleReceipt.jsx
export default function SaleReceipt({ sale, customer }) {
  const {
    id,
    created_at,
    items,       // array [{ name, qty, price }]
    subtotal,
    tax,
    discount,
    total,
  } = sale;

  return (
    <div className="max-w-md mx-auto bg-white shadow p-4 font-sans text-gray-800">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">My POS Shop</h2>
        <p className="text-sm">Invoice #: {id}</p>
        <p className="text-sm">Date: {new Date(created_at).toLocaleString()}</p>
        {customer && (
          <p className="text-sm">Customer: {customer.name || customer.email}</p>
        )}
      </div>

      {/* Items */}
      <table className="w-full border-t border-b my-2 text-sm">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b">
              <td>{item.name}</td>
              <td className="text-center">{item.qty}</td>
              <td className="text-right">{item.price.toFixed(2)}</td>
              <td className="text-right">{(item.qty * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="mt-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax:</span>
          <span>{tax.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg mt-1 border-t pt-1">
          <span>Total:</span>
          <span>{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-gray-500">
        Thank you for your purchase!
        <br />
        Contact: info@mypossystem.com
      </div>
    </div>
  );
}
