// src/components/WalletSnapshot.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { fetchWalletSummary } from "@/utils/api";
import type { WalletSummaryItem } from "@/types/portfolio";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function WalletSnapshot() {
  const [items, setItems] = useState<WalletSummaryItem[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchWalletSummary()
      .then((res) => {
        setItems(res.items);
        setTotal(res.total_portfolio_value);
      })
      .catch(console.error);
  }, []);

  const stackedData = useMemo(() => {
    // 100% stacked: ogni bar = % del portafoglio
    return items.map((w) => ({
      name: w.wallet_name,
      value: Number(w.percent_of_portfolio.toFixed(2)),
    }));
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((w) => (
          <Card key={w.wallet_id} className="p-4 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{w.wallet_name}</div>
              <div className="text-xs rounded-full bg-muted px-2 py-0.5">
                {w.assets_count} assets
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold">
              € {w.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-muted-foreground">
              {w.percent_of_portfolio.toFixed(2)}% del portafoglio
            </div>
            {w.top_assets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {w.top_assets.map((a) => (
                  <span key={a.symbol} className="text-xs px-2 py-1 rounded-full bg-secondary">
                    {a.symbol} · € {a.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-2">
          Allocazione per wallet (totale: € {total.toLocaleString(undefined, { maximumFractionDigits: 0 })})
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={stackedData}>
              <XAxis dataKey="name" />
              <YAxis unit="%" />
              <Tooltip />
              <Legend />
              {/* una sola serie (100% stack) */}
              <Bar dataKey="value" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
