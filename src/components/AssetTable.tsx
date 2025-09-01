import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip as RTooltip,
  Cell,
} from "recharts";
import type {
  AssetByWalletResponse,
  AssetWalletBreakdownItem,
} from "@/types/portfolio";
import { fetchAssetByWallet } from "@/utils/api";

// -----------------------------------------------------------
// Tipi esistenti per le righe della tabella Asset
// -----------------------------------------------------------
interface AssetRow {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  average_price: number;
  current_price: number;
  delta_value: number;
  delta_percentage: number;
}

type AssetMeta = {
  symbol: string;
  name: string;
  type: string;
  visible: boolean;
};

// -----------------------------------------------------------
// Subcomponent: Breakdown per wallet per singolo asset (riga espansa)
// -----------------------------------------------------------
function AssetWalletBreakdown({ symbol }: { symbol: string }) {
  const [data, setData] = useState<AssetByWalletResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAssetByWallet(symbol)
      .then((res) => setData(res))
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Caricamento dettaglio wallet…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Errore nel caricamento del breakdown: {error}
      </div>
    );
  }

  if (!data || data.breakdown.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Nessuna posizione detenuta nei wallet per questo asset.
      </div>
    );
  }

  const pieData = data.breakdown.map((b: AssetWalletBreakdownItem) => ({
    name: b.wallet_name,
    value: Number(b.qty.toFixed(8)),
  }));

  return (
    <div className="p-4">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart */}
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-2">
            Distribuzione {data.symbol} per wallet · Prezzo: €{" "}
            {data.price_used.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie dataKey="value" data={pieData} label />
                <RTooltip />
                {pieData.map((_, i) => (
                  <Cell key={i} />
                ))}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tabellina */}
        <Card className="p-4 overflow-x-auto">
          <div className="text-sm text-muted-foreground mb-2">Dettaglio per wallet</div>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left py-1">Wallet</th>
                <th className="text-right py-1">Quantità</th>
                <th className="text-right py-1">Valore</th>
                <th className="text-right py-1">% asset</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((b) => (
                <tr key={b.wallet_id} className="border-b last:border-0">
                  <td className="py-1">{b.wallet_name}</td>
                  <td className="py-1 text-right">{b.qty.toFixed(8)}</td>
                  <td className="py-1 text-right">
                    € {b.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-1 text-right">{b.percent_of_asset.toFixed(2)}%</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-1">Totale</td>
                <td className="py-1 text-right">{data.total_qty.toFixed(8)}</td>
                <td className="py-1 text-right">
                  € {data.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-1 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// Componente principale: tabella Asset con righe espandibili
// -----------------------------------------------------------
export default function AssetsTable() {
  const [assets, setAssets] = useState<AssetMeta[]>([]);
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // --- fetch asset list (visibili e non Liquidi)
  useEffect(() => {
    const fetchAssets = async () => {
      const res = await fetch("http://127.0.0.1:8000/assets/visible/");
      const data = await res.json();
      const filtered = data.filter(
        (a: AssetMeta) => a.visible === true && a.type !== "Liquidi"
      );
      setAssets(filtered);
    };
    fetchAssets();
  }, []);

  // --- fetch metriche per ogni asset
  useEffect(() => {
    const fetchAssetData = async () => {
      const allRows: AssetRow[] = [];
      for (const asset of assets) {
        const res = await fetch(
          `http://127.0.0.1:8000/assets/${asset.symbol}/delta`
        );
        const data = await res.json();
        if (data.quantity > 0) {
          allRows.push({
            symbol: data.symbol,
            name: asset.name,
            type: asset.type,
            quantity: data.quantity,
            average_price: data.average_price,
            current_price: data.current_price,
            delta_value: data.delta_value,
            delta_percentage: data.delta_percentage,
          });
        }
      }
      setRows(allRows);
      setLoading(false);
    };
    if (assets.length > 0) fetchAssetData();
  }, [assets]);

  const toggle = (symbol: string) =>
    setExpanded((s) => ({ ...s, [symbol]: !s[symbol] }));

  const columnsCount = 10; // includendo la colonna caret

  const totalByAsset = useMemo(
    () =>
      Object.fromEntries(
        rows.map((r) => [r.symbol, r.current_price * r.quantity])
      ),
    [rows]
  );

  if (loading)
    return <div className="text-sm text-muted-foreground">Caricamento asset...</div>;

  return (
    <Card className="p-4 overflow-x-auto">
      <h2 className="text-lg font-semibold mb-2">Asset in portafoglio</h2>
      <Table className="text-sm border rounded-xl overflow-hidden">
        <TableHeader className="bg-muted text-muted-foreground">
          <TableRow className="h-8">
            <TableHead className="w-10" />
            <TableHead className="text-center">Nome</TableHead>
            <TableHead className="text-center">Simbolo</TableHead>
            <TableHead className="text-center">Tipo</TableHead>
            <TableHead className="text-center">Quantità</TableHead>
            <TableHead className="text-center">Prezzo Medio</TableHead>
            <TableHead className="text-center">Prezzo Attuale</TableHead>
            <TableHead className="text-center">Valore Totale</TableHead>
            <TableHead className="text-center">Delta €</TableHead>
            <TableHead className="text-center">Delta %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <>
              <TableRow
                key={row.symbol}
                className="hover:bg-muted/30 transition-colors"
              >
                <TableCell className="w-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggle(row.symbol)}
                    aria-label={expanded[row.symbol] ? "Comprimi" : "Espandi"}
                  >
                    {expanded[row.symbol] ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium text-center">{row.name}</TableCell>
                <TableCell className="text-center font-mono">{row.symbol}</TableCell>
                <TableCell className="text-center font-mono">{row.type}</TableCell>
                <TableCell className="text-center font-mono">
                  {row.quantity.toLocaleString(undefined, {
                    minimumFractionDigits: 4,
                  })}
                </TableCell>
                <TableCell className="text-center font-mono">
                  € {row.average_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center font-mono">
                  € {row.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center font-mono">
                  € {totalByAsset[row.symbol].toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center font-mono",
                    row.delta_value >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  € {row.delta_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center font-mono",
                    row.delta_percentage >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {row.delta_percentage.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}%
                </TableCell>
              </TableRow>

              {expanded[row.symbol] && (
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={columnsCount} className="p-0">
                    <AssetWalletBreakdown symbol={row.symbol} />
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
