// src/components/AssetRowWalletExpand.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { fetchAssetByWallet } from "@/utils/api";
import type { AssetByWalletResponse } from "@/types/portfolio";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
} from "recharts";

export default function AssetRowWalletExpand({ symbol }: { symbol: string }) {
  const [data, setData] = useState<AssetByWalletResponse | null>(null);

  useEffect(() => {
    fetchAssetByWallet(symbol).then(setData).catch(console.error);
  }, [symbol]);

  if (!data) return (
    <div className="p-4 text-sm text-muted-foreground">Loading wallet breakdown…</div>
  );

  const chartData = data.breakdown.map((b) => ({
    name: b.wallet_name,
    value: Number(b.qty.toFixed(8)) // quantità per torta
  }));

  return (
    <Card className="p-4 mt-2">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted-foreground mb-2">
            Distribuzione {data.symbol} per wallet · Prezzo: € {data.price_used.toLocaleString()}
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie dataKey="value" data={chartData} label />
                <Tooltip />
                {/* Niente colori specifici: lasciamo quelli di default come da linee guida */}
                {chartData.map((_, i) => <Cell key={i} />)}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground mb-2">Dettaglio per wallet</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-1">Wallet</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Valore</th>
                  <th className="text-right py-1">% asset</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((b) => (
                  <tr key={b.wallet_id} className="border-b last:border-0">
                    <td className="py-1">{b.wallet_name}</td>
                    <td className="py-1 text-right">{b.qty.toFixed(8)}</td>
                    <td className="py-1 text-right">€ {b.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-1 text-right">{b.percent_of_asset.toFixed(2)}%</td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-1">Totale</td>
                  <td className="py-1 text-right">{data.total_qty.toFixed(8)}</td>
                  <td className="py-1 text-right">€ {data.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="py-1 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}
