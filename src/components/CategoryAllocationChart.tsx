import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

const colors: Record<string, string> = {
  Bitcoin: "#FF9000",
  "Company Stock": "#AD5FDE",
  "Golden Butterfly": "#DEC03A",
  Liquidità: "#24AE36",
};

export default function CategoryAllocationChart() {
  const [data, setData] = useState<{ category: string, value: number, allocation_pct: number }[]>([])

  const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

  useEffect(() => {
    fetch(`${API_BASE}/dashboard/allocation/categories-group`)
      .then(res => res.json())
      .then((json) => setData(json))
  }, [])

  return (
    <Card className="p-4 mt-6">
      <h2 className="text-lg font-semibold mb-2">Distribuzione per Categoria</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={colors[entry.category] || "#8884d8"} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`€ ${value.toLocaleString()}`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
