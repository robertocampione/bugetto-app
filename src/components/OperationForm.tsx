import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  previewOperation,
  createOperation,
  getWallets,
  createWallet,
  getLastPurchaseMeta,
  getVisibleAssets,
  createAsset,
  guessAsset,
} from "@/lib/api";
import type { OperationIn } from "@/lib/api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";

/* ===== Helpers numeriche ===== */
function toNumber(text: string): number {
  return Number(text.replace(",", "."));
}
function toNumberOrNull(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}
function clamp6Decimals(n: number | null): number | null {
  if (n === null) return null;
  return Number(n.toFixed(6));
}
// valore corrente delle fees anche se l'utente non ha fatto blur
function currentFeesNumber(text: string, fallback?: number | null): number {
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : (fallback ?? 0);
}

// Preview type + formatter numeri
type Preview = {
  price: number;
  price_avg_day: number;
  price_high_day: number;
  price_low_day: number;
  exchange_rate: number;
  total_value: number;
  quantity: number;
  purchase_currency: string;
};
// formatters dedicati
const nfMoney2 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfQty6 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 6 });
const nfFx4 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtMoney = (n: number | null | undefined) => (typeof n === "number" && isFinite(n) ? nfMoney2.format(n) : "-");
const fmtQty = (n: number | null | undefined) => (typeof n === "number" && isFinite(n) ? nfQty6.format(n) : "-");
const fmtFx = (n: number | null | undefined) => (typeof n === "number" && isFinite(n) ? nfFx4.format(n) : "-");

const defaultOp: OperationIn & { user?: string | null } = {
  date: new Date().toISOString().slice(0, 10),
  operation_type: "Acquisto",
  asset_symbol: "",
  quantity: 0,
  wallet_id: 0,
  user: "",
  broker: "",
  accounting: true,
  price_manual: null,
  purchase_currency: "EUR",
  fees: 0,
  comment: "",
};

export default function OperationForm() {
  const [form, setForm] = useState<OperationIn & { user?: string | null }>(defaultOp);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [prev, setPrev] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ asset?: boolean; quantity?: boolean }>({});

  // campi testuali per decimali
  const [qtyText, setQtyText] = useState<string>(String(defaultOp.quantity));
  const [priceManualText, setPriceManualText] = useState<string>("");
  const [feesText, setFeesText] = useState<string>(String(defaultOp.fees ?? 0));

  // wallets
  const [wallets, setWallets] = useState<{ id: number; name: string }[]>([]);
  const [newWalletName, setNewWalletName] = useState("");

  // assets
  const [assets, setAssets] = useState<
    { id: number; symbol: string; name?: string; currency?: string }[]
  >([]);
  const [assetOpen, setAssetOpen] = useState(false);
  const [newAssetOpen, setNewAssetOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    symbol: "",
    name: "",
    currency: "",
    type: "",
    category: "",
    isin: "",
    visible: true,
  });

  // traccia se l'utente ha modificato manualmente la currency
  const [currencyTouched, setCurrencyTouched] = useState(false);



// Primo useEffect - carica wallets e assets
  useEffect(() => {
    getWallets().then(setWallets).catch(() => setWallets([]));
    getVisibleAssets().then(setAssets).catch(() => setAssets([]));
  }, []);

    // Secondo useEffect - imposta la valuta di acquisto di default quando cambia asset
  useEffect(() => {
    const sym = form.asset_symbol?.trim();
    if (!sym) return;
    const asset = assets.find(a => a.symbol === sym);
    // Se l'utente NON ha toccato manualmente la currency, aggiorno dal dato dell'asset
    if (asset && !currencyTouched) {
      update("purchase_currency", (asset.currency || "EUR").toUpperCase());
    }
  }, [form.asset_symbol, assets, currencyTouched]);
 // <-- dipende da asset selezionato e lista assets

  
  function update<K extends keyof (OperationIn & { user?: string | null })>(
    key: K,
    val: (OperationIn & { user?: string | null })[K]
  ) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function doPreview() {
    setError(null);
    setOkMsg(null);

    const errs: { asset?: boolean; quantity?: boolean } = {};
    if (!form.asset_symbol?.trim()) errs.asset = true;
    const q = clamp6Decimals(toNumber(qtyText)) ?? 0;
    if (!q || q === 0) errs.quantity = true;
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    if (q !== form.quantity) setForm((f) => ({ ...f, quantity: q }));

    setLoadingPrev(true);
    try {
      const p = await previewOperation(form as unknown as OperationIn);
      setPrev({
        price: p.price ?? 0,
        price_avg_day: p.price_avg_day ?? 0,
        price_high_day: p.price_high_day ?? 0,
        price_low_day: p.price_low_day ?? 0,
        exchange_rate: p.exchange_rate ?? 1,
        total_value: p.total_value ?? 0,
        quantity: p.quantity ?? q,
        purchase_currency: p.purchase_currency ?? "EUR",
      });
    } catch (e: any) {
      setError(e?.message ?? "Errore preview");
    } finally {
      setLoadingPrev(false);
    }
  }

  async function doSave() {
    setError(null);
    setOkMsg(null);

    const errs: { asset?: boolean; quantity?: boolean } = {};
    if (!form.asset_symbol?.trim()) errs.asset = true;
    const q = clamp6Decimals(toNumber(qtyText)) ?? 0;
    if (!q || q === 0) errs.quantity = true;
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    if (q !== form.quantity) setForm((f) => ({ ...f, quantity: q }));

    setLoadingSave(true);
    try {
      await createOperation(form as unknown as OperationIn);
      setOkMsg("Operazione salvata ✅");
      setPrev(null);
      // reset selettivo (mantieni asset/wallet/utente/currency/broker)
      const keep = {
        asset_symbol: form.asset_symbol,
        wallet_id: form.wallet_id,
        user: form.user,
        broker: form.broker,
        purchase_currency: form.purchase_currency,
      } as Partial<OperationIn & { user?: string | null }>;
      setForm({ ...defaultOp, ...keep });
      setQtyText(String(defaultOp.quantity));
      setPriceManualText("");
      setFeesText(String(defaultOp.fees ?? 0));
    } catch (e: any) {
      setError(e?.message ?? "Errore salvataggio");
    } finally {
      setLoadingSave(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6 space-y-4">
        <div className="text-xl font-semibold">Nuova Operazione</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Data */}
          <div>
            <Label className="block text-sm mb-1">Data</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </div>

          {/* Tipo */}
          <div>
            <Label className="block text-sm mb-1">Tipo</Label>
            <Select
              value={form.operation_type}
              onValueChange={(value) =>
                update("operation_type", value as OperationIn["operation_type"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Acquisto">Acquisto</SelectItem>
                <SelectItem value="Vendita">Vendita</SelectItem>
                <SelectItem value="Dividendo">Dividendo</SelectItem>
                <SelectItem value="Staking">Staking</SelectItem>
                <SelectItem value="Spesa">Spesa</SelectItem>
                <SelectItem value="Movimento Interno">Movimento Interno</SelectItem>
                <SelectItem value="Interessi">Interessi</SelectItem>
                <SelectItem value="Commissione">Commissione</SelectItem>
                <SelectItem value="Donazione">Donazione</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Asset (combobox) */}
          <div>
            <Label className="block text-sm mb-1">Asset</Label>
            <div className="flex gap-2 items-stretch flex-wrap">
              <Popover open={assetOpen} onOpenChange={setAssetOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`flex-1 justify-between h-10 rounded-md border px-3 text-sm ${fieldErrors.asset ? 'border-red-500' : 'border-input bg-background text-foreground'}`}
                  >
                    {form.asset_symbol
                      ? assets.find((a) => a.symbol === form.asset_symbol)?.name ||
                        form.asset_symbol
                      : "Seleziona asset"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="start" className="p-0 w-[360px]">
                  <Command className="max-h-72">
                    <CommandInput placeholder="Cerca asset..." />
                    <CommandList>
                      <CommandEmpty>Nessun risultato.</CommandEmpty>
                      <CommandGroup>
                        {assets.map((a) => (
                          <CommandItem
                            key={a.id}
                            value={`${a.symbol} ${a.name ?? ""}`.trim()}
                            onSelect={() => {
                              update("asset_symbol", a.symbol);
                              // resetto il flag così l'auto-set può agire per il nuovo asset
                              setCurrencyTouched(false);
                              // imposto subito la valuta proposta dall'asset
                              update("purchase_currency", (a.currency || "EUR").toUpperCase());
                              setAssetOpen(false);
                              const clean = a.symbol.trim();
                              if (clean) {
                                getLastPurchaseMeta(clean)
                                  .then((meta) => {
                                    if (meta?.wallet_id)
                                      update("wallet_id", meta.wallet_id as number);
                                    if (meta?.user) update("user", meta.user as string);
                                  })
                                  .catch(() => {});
                              }
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{a.name ?? a.symbol}</span>
                              <span className="text-xs text-muted-foreground">
                                {a.symbol}
                                {a.currency ? ` · ${a.currency}` : ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Dialog Nuovo Asset */}
              <Dialog open={newAssetOpen} onOpenChange={setNewAssetOpen}>
                <DialogTrigger asChild>
                  <Button type="button" className="whitespace-nowrap">
                    + Nuovo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-background text-foreground">
                  <DialogHeader>
                    <DialogTitle>Nuovo asset</DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Symbol *</Label>
                      <Input
                        value={newAsset.symbol}
                        onChange={(e) =>
                          setNewAsset((s) => ({
                            ...s,
                            symbol: e.target.value.toUpperCase(),
                          }))
                        }
                        onBlur={async (e) => {
                          const sym = e.target.value.trim();
                          if (sym) {
                            try {
                              const g = await guessAsset(sym);
                              setNewAsset((s) => ({
                                ...s,
                                name: s.name || g.name || "",
                                currency: s.currency || g.currency || "",
                              }));
                            } catch {}
                          }
                        }}
                        placeholder="ACN, BTC-USD, EUR..."
                      />
                    </div>
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={newAsset.name}
                        onChange={(e) => setNewAsset((s) => ({ ...s, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Input
                        value={newAsset.currency}
                        onChange={(e) =>
                          setNewAsset((s) => ({ ...s, currency: e.target.value.toUpperCase() }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Input
                        value={newAsset.type}
                        onChange={(e) => setNewAsset((s) => ({ ...s, type: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Category *</Label>
                      <Input
                        value={newAsset.category}
                        onChange={(e) => setNewAsset((s) => ({ ...s, category: e.target.value }))}
                        placeholder="Golden Butterfly, Company Stock, ..."
                      />
                    </div>
                    <div>
                      <Label>ISIN</Label>
                      <Input
                        value={newAsset.isin}
                        onChange={(e) => setNewAsset((s) => ({ ...s, isin: e.target.value }))}
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setNewAssetOpen(false)}>
                      Annulla
                    </Button>
                    <Button
                      onClick={async () => {
                        const payload = {
                          symbol: newAsset.symbol.trim(),
                          name: newAsset.name.trim() || undefined,
                          currency: newAsset.currency?.trim() || undefined,
                          type: newAsset.type?.trim() || undefined,
                          category: newAsset.category?.trim() || undefined,
                          isin: newAsset.isin?.trim() || undefined,
                          visible: true,
                        };
                        if (!payload.symbol || !payload.category) return;
                        const created = await createAsset(payload);
                        setAssets((prev) =>
                          [...prev, created].sort((a, b) => (a.name || a.symbol).localeCompare(b.name || b.symbol))
                        );
                        update("asset_symbol", created.symbol);
                        setNewAssetOpen(false);
                      }}
                    >
                      Salva
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Quantità */}
          <div>
            <Label className="block text-sm mb-1">Quantità</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="-1.234567 o 2,5"
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              onBlur={(e) => {
                const n = clamp6Decimals(toNumber(e.target.value)) ?? 0;
                update("quantity", n);
                setQtyText(String(n));
              }}
              className={fieldErrors.quantity ? "border-red-500" : undefined}
            />
          </div>

          {/* Wallet + nuovo */}
          <div className="md:col-span-2">
            <Label className="block text-sm mb-1">Wallet</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={String(form.wallet_id ?? "")}
                  onValueChange={(val) => update("wallet_id", Number(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                className="w-44"
                placeholder="Nuovo wallet"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
              />
              <Button
                type="button"
                onClick={async () => {
                  const name = newWalletName.trim();
                  if (!name) return;
                  const w = await createWallet(name);
                  setWallets((prev) => [...prev, w].sort((a, b) => a.name.localeCompare(b.name)));
                  update("wallet_id", w.id);
                  setNewWalletName("");
                }}
              >
                + Aggiungi
              </Button>
            </div>
          </div>

          {/* Utente */}
          <div>
            <Label className="block text-sm mb-1">Utente</Label>
            <Select value={form.user ?? ""} onValueChange={(val) => update("user", val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona utente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Roberto">Roberto</SelectItem>
                <SelectItem value="Lotte">Lotte</SelectItem>
                <SelectItem value="Giovanni">Giovanni</SelectItem>
                <SelectItem value="Levi">Levi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Broker/Exchange */}
          <div>
            <Label className="block text-sm mb-1">Broker/Exchange</Label>
            <Input value={form.broker ?? ""} onChange={(e) => update("broker", e.target.value)} />
          </div>

          {/* Prezzo manuale */}
          <div>
            <Label className="block text-sm mb-1">Prezzo Manuale (opz.)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="123.456789"
              value={priceManualText}
              onChange={(e) => setPriceManualText(e.target.value)}
              onBlur={(e) => {
                const n = toNumberOrNull(e.target.value);
                update("price_manual", n);
                setPriceManualText(n === null ? "" : String(n));
              }}
            />
          </div>

          {/* Valuta acquisto */}
          <div>
            <Label className="block text-sm mb-1">Valuta Acquisto</Label>
            <Input
              value={form.purchase_currency ?? "EUR"}
              onChange={(e) => { setCurrencyTouched(true); update("purchase_currency", e.target.value.toUpperCase()); }}
            />
          </div>

          {/* Fees */}
          <div>
            <Label className="block text-sm mb-1">Fees</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.50"
              value={feesText}
              onChange={(e) => setFeesText(e.target.value)}
              onBlur={(e) => {
                const n = toNumber(e.target.value);
                const val = isNaN(n) ? 0 : clamp6Decimals(n) ?? 0;
                update("fees", val);
                setFeesText(String(val));
              }}
            />
          </div>

          {/* Accounting */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Checkbox
              id="acc"
              className="h-4 w-4"
              checked={Boolean(form.accounting)}
              onCheckedChange={(v) => update("accounting", Boolean(v))}
            />
            <Label htmlFor="acc" className="leading-none">Includi in contabilizzazione</Label>
          </div>

          {/* Commento */}
          <div className="md:col-span-3">
            <Label className="block text-sm mb-1">Commento</Label>
            <Textarea value={form.comment ?? ""} onChange={(e) => update("comment", e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={doPreview} disabled={loadingPrev}>
            {loadingPrev ? "Calcolo..." : "Preview"}
          </Button>
          <Button onClick={doSave} disabled={loadingSave}>
            {loadingSave ? "Salvataggio..." : "Salva"}
          </Button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {okMsg && <div className="text-green-600 text-sm">{okMsg}</div>}

        {prev && (
          <div className="mt-4 border rounded p-4 text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="font-medium">Qty:</span> {fmtQty(prev.quantity)}
            </div>
            <div>
              <span className="font-medium">Prezzo:</span> {fmtMoney(prev.price)}
            </div>
            <div>
              <span className="font-medium">High:</span> {fmtMoney(prev.price_high_day)}
            </div>
            <div>
              <span className="font-medium">Low:</span> {fmtMoney(prev.price_low_day)}
            </div>
            <div>
              <span className="font-medium">Close:</span> {fmtMoney(prev.price_avg_day)}
            </div>
            <div>
              <span className="font-medium">FX ({prev.purchase_currency}→EUR):</span> {fmtFx(prev.exchange_rate)}
            </div>
            <div>
              <span className="font-medium">Fees:</span> {fmtMoney(currentFeesNumber(feesText, form.fees))}
            </div>
            <div className="md:col-span-2">
              <span className="font-medium">Totale EUR (incl. fees):</span> {fmtMoney(prev.total_value + currentFeesNumber(feesText, form.fees))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
