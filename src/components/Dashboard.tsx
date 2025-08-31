import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import AssetsTable from "./AssetTable";
import CategoryAllocationChart from "./CategoryAllocationChart";
import CategoryHistoryChart from "./CategoryHistoryChart";


import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [liquidAssets, setLiquidAssets] = useState<any[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/dashboard/summary")
      .then((res) => res.json())
      .then((data) => setSummary(data));

    const fetchLiquidAssets = async () => {
      const res = await fetch("http://127.0.0.1:8000/assets/visible");
      const assets = await res.json();

      const liquid = assets.filter((a: any) => a.visible && a.type === "Liquidi");

      const detailed = await Promise.all(
        liquid.map(async (asset: any) => {
          const q = await fetch(`http://127.0.0.1:8000/assets/${asset.symbol}/total-quantity`);
          const quantity = await q.json();

          let conversion_rate = 1;
          if (asset.symbol !== "EUR") {
            const convRes = await fetch(`http://127.0.0.1:8000/convert?from=${asset.symbol}&to=EUR`);
            conversion_rate = await convRes.json();
          }

          return { ...asset, quantity, conversion_rate };
        })
      );

      setLiquidAssets(detailed);
    };

    fetchLiquidAssets();
  }, []);

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">Overview</h2>

      {summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">💰 Valore Totale</div>
              <div className="text-3xl font-bold mt-1">€ {summary.total_value.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">💧 Liquidità</div>
              <div className="text-3xl font-bold mt-1 mb-2">€ {summary.liquidity.toLocaleString()}</div>

              {liquidAssets.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <button
                    className="underline hover:text-foreground"
                    onClick={() => setShowBreakdown((prev) => !prev)}
                  >
                    {showBreakdown ? "Nascondi dettagli" : "Mostra dettagli"}
                  </button>
                  {showBreakdown && (
                    <ul className="mt-2 space-y-1">
                      {liquidAssets.map((asset) => (
                        <li key={asset.symbol} className="flex flex-col sm:flex-row sm:justify-between">
                          <div>
                            <span className="font-medium">{asset.name || asset.symbol}</span>
                            {asset.symbol !== "EUR" && asset.conversion_rate && (
                              <span className="text-muted-foreground text-[11px] block sm:inline sm:ml-2">
                                (1 {asset.symbol} = {asset.conversion_rate.toFixed(2)} EUR)
                              </span>
                            )}
                          </div>
                          <span className="font-mono">
                            {asset.quantity?.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })} {asset.symbol}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">📈 Guadagno Mensile</div>
              <div className="text-3xl font-bold mt-1">€ {summary.monthly_gain.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">📊 Delta %</div>
              <div className="text-3xl font-bold mt-1">{summary.gain_percentage.toFixed(2)}%</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div>Caricamento KPI...</div>
      )}

      {/* Tabella Asset */}
      <div className="mt-6">
        <AssetsTable />
      </div>
      
      {/* ✅ GRAFICO DISTRIBUZIONE PER CATEGORIA */}
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="current">
          <AccordionTrigger>📊 Distribuzione attuale per categoria</AccordionTrigger>
          <AccordionContent>
            <CategoryAllocationChart />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="history">
          <AccordionTrigger>📅 Storico allocazione per categoria</AccordionTrigger>
          <AccordionContent>
            <CategoryHistoryChart />
          </AccordionContent>
        </AccordionItem>
    </Accordion>  


   
    </>
  );
}
