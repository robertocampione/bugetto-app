import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils"; // ✅ percorso comune in progetti con shadcn/ui

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

export default function AssetsTable() {
  const [assets, setAssets] = useState<AssetMeta[]>([]);
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      const res = await fetch("http://127.0.0.1:8000/assets/visible/");
      const data = await res.json();
      const filtered = data.filter((a: AssetMeta) => a.visible === true && a.type !== "Liquidi");
      setAssets(filtered);
    };
    fetchAssets(); 
  }, []);

  useEffect(() => {
    const fetchAssetData = async () => {
      const allRows: AssetRow[] = [];
      for (const asset of assets) {
        const res = await fetch(`http://127.0.0.1:8000/assets/${asset.symbol}/delta`);
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

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento asset...</div>;

  return (
    <Card className="p-4 overflow-x-auto">
      <h2 className="text-1g font-semibold mb-2">Asset in portafoglio</h2>
      <Table className="text-sm border rounded-xl overflow-hidden">
        <TableHeader className="bg-muted text-muted-foreground">
          <TableRow className="h-8">
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
        <TableBody >
          {rows.map((row) => (
            <TableRow key={row.symbol} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium text-center">
                  {row.name}
              </TableCell>
              <TableCell className="text-center font-mono">
                {row.symbol}
              </TableCell>
              <TableCell className="text-center font-mono">
                {row.type}
              </TableCell>
              <TableCell className="text-center font-mono">
                {row.quantity.toLocaleString(undefined, { minimumFractionDigits: 4 })}
              </TableCell>
              <TableCell className="text-center font-mono">
                € {row.average_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-center font-mono">
                € {row.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-center font-mono">
                € {(row.current_price * row.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className={cn("text-center font-mono", row.delta_value >= 0 ? "text-green-600" : "text-red-600")}>
                € {row.delta_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className={cn("text-center font-mono", row.delta_percentage >= 0 ? "text-green-600" : "text-red-600")}>
                {row.delta_percentage.toLocaleString(undefined, { minimumFractionDigits: 2 })}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
