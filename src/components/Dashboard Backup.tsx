import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#a29bfe",
  "#fd79a8",
];

type DashboardSummary = {
  total_value: number;
  liquidity: number;
  monthly_gain: number;
  gain_percentage: number;
};

type AllocationItem = {
  symbol?: string;
  type?: string;
  value: number;
  allocation_pct: number;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [assetAllocation, setAssetAllocation] = useState<AllocationItem[]>([]);
  const [categoryAllocation, setCategoryAllocation] = useState<AllocationItem[]>([]);

  useEffect(() => {
    axios.get("http://localhost:8000/dashboard/summary").then((res) => setSummary(res.data));
    axios.get("http://localhost:8000/dashboard/allocation/assets").then((res) => setAssetAllocation(res.data));
    axios.get("http://localhost:8000/dashboard/allocation/categories").then((res) => setCategoryAllocation(res.data));
  }, []);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">📊 Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground">Total Value</p>
            <p className="text-2xl font-semibold">
              € {summary?.total_value?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground">Liquidity</p>
            <p className="text-2xl font-semibold">
              € {summary?.liquidity?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground">Monthly Gain</p>
            <p className="text-2xl font-semibold">
              € {summary?.monthly_gain?.toLocaleString()} ({summary?.gain_percentage}%)
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">By Asset</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>
        <TabsContent value="assets">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetAllocation}
                dataKey="allocation_pct"
                nameKey="symbol"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label={({ symbol }) => symbol}
              >
                {assetAllocation.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? `${value.toFixed(2)}%` : `${value}%`
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </TabsContent>
        <TabsContent value="categories">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryAllocation}
                dataKey="allocation_pct"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label={({ type }) => type}
              >
                {categoryAllocation.map((entry, index) => (
                  <Cell key={`cell-${entry.type || index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  typeof value === "number" ? `${value.toFixed(2)}%` : `${value}%`
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}
