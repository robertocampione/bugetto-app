import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

type CategoryHistoryEntry = {
  date: string;
  categories: Record<string, number>;
};

export default function CategoryHistoryChart() {
  const [historyData, setHistoryData] = useState<CategoryHistoryEntry[]>([]);
  const API_BASE =
     (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

  useEffect(() => {
    fetch(`${API_BASE}/dashboard/allocation/categories-history`)
      .then((res) => res.json())
      .then((data) => setHistoryData(data))
      .catch((err) => console.error("Errore nel recupero dei dati storici:", err));
  }, []);

  const cleanedData = historyData
    .map((entry) => {
      const categories = Object.entries(entry.categories)
        .filter(
          ([_, pct]) =>
            typeof pct === "number" && isFinite(pct) && pct >= 0 && pct <= 100
        )
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

      return {
        date: entry.date,
        ...categories,
      };
    })
    .filter((entry) =>
      Object.values(entry).some(
        (v, i) => i > 0 && typeof v === "number" && v > 0
      )
    );

  const allCategories = Array.from(
    new Set(
      cleanedData.flatMap((entry) =>
        Object.keys(entry).filter((key) => key !== "date")
      )
    )
  );

  const colors: Record<string, string> = {
    Bitcoin: "#FF9000",
    "Company Stock": "#AD5FDE",
    "Golden Butterfly": "#DEC03A",
    Liquidità: "#24AE36",
  };

  return (
    <Card className="mt-4">
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <CalendarDays className="text-primary" />
          <h2 className="text-lg font-semibold">Storico Allocazione</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cleanedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
            <Tooltip formatter={(value) => (typeof value === "number" ? `${value.toFixed(2)}%` : `${value}%`)} />
            <Legend />
            {allCategories.map((category) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={colors[category] || "#8884d8"}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
