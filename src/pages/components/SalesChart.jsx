import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export default function SalesChart({ data = [] }) {
  // Tukihakikisha tuna data iliyo na tarehe na kiasi cha mauzo
  const chartData = data.map((item) => ({
    date: item.date ? new Date(item.date).toLocaleDateString() : "N/A",
    amount: item.amount || 0,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="amount" stroke="#4F46E5" strokeWidth={2} name="Sales Amount" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
