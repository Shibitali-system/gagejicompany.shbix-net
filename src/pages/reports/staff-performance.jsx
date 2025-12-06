import { useEffect, useState } from "react";
import PosLayout from "../layouts/PosLayout";
import { supabase } from "../../../supabaseClient";

export default function StaffPerformanceReport() {
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    fetchStaffPerformance();
  }, []);

  const fetchStaffPerformance = async () => {
    const { data, error } = await supabase
      .from("staff")
      .select("id, name, role, total_sales")
      .order("total_sales", { ascending: false });

    if (error) console.error(error);
    else setStaff(data);
  };

  return (
    <PosLayout>
      <h2 className="text-2xl font-bold mb-4">Staff Performance</h2>
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Total Sales</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-4 py-2">{s.name}</td>
              <td className="px-4 py-2">{s.role}</td>
              <td className="px-4 py-2">${s.total_sales}</td>
            </tr>
          ))}
          {staff.length === 0 && (
            <tr>
              <td
                colSpan="3"
                className="text-center py-4 text-gray-500"
              >
                No staff performance data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </PosLayout>
  );
}
