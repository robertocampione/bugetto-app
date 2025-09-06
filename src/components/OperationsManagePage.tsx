import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/** Tipi dal backend */
interface Operation {
  id: number;
  date: string; // ISO o YYYY-MM-DD
  operation_type: string;
  quantity: number;
  asset_symbol?: string;
  asset_id?: number;
  wallet_id: number;
  user?: string | null;
  broker?: string | null;
  purchase_currency?: string | null;
  price?: number | null;
  price_manual?: number | null;
  fees?: number | null;
  dividend_value?: number | null;
  exchange_rate?: number | null;
  total_value?: number | null;
  comment?: string | null;
  accounting?: boolean;
  [key: string]: any;
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, "") ||
  "http://127.0.0.1:8000";

/** Stato dei filtri (uno per colonna) */
interface FiltersState {
  // string search (case-insensitive, contains)
  operation_type: string;
  asset_symbol: string;
  user: string;
  broker: string;
  purchase_currency: string;
  comment: string;

  // wallet (select)
  wallet_id: string; // "all" = tutti, otherwise wallet id as string

  // numeric ranges
  quantityMin: string;
  quantityMax: string;
  priceManualMin: string;
  priceManualMax: string;
  feesMin: string;
  feesMax: string;

  // date range
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD

  // global text (applies to several columns)
  global: string;
}

const initialFilters: FiltersState = {
  operation_type: "",
  asset_symbol: "",
  user: "",
  broker: "",
  purchase_currency: "",
  comment: "",
  wallet_id: "all",
  quantityMin: "",
  quantityMax: "",
  priceManualMin: "",
  priceManualMax: "",
  feesMin: "",
  feesMax: "",
  dateFrom: "",
  dateTo: "",
  global: "",
};

// —— ORDINAMENTO ——
type SortKey =
  | "date"
  | "operation_type"
  | "quantity"
  | "asset_symbol"
  | "wallet"
  | "user"
  | "broker"
  | "purchase_currency"
  | "price_manual"
  | "fees"
  | "comment";

type SortDir = "asc" | "desc";

export default function OperationsManagePage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lista dei wallet per mappare gli ID ai nomi e popolare il menu a discesa
  const [wallets, setWallets] = useState<{ id: number; name: string }[]>([]);

  // Filtri
  const [filters, setFilters] = useState<FiltersState>(initialFilters);

  // Ordinamento
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Paginazione lato client
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Carica i wallet al mount della pagina
  useEffect(() => {
    fetch(`${API_BASE}/wallets`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch wallets failed: ${r.status}`);
        return r.json();
      })
      .then((data: { id: number; name: string }[]) =>
        setWallets(Array.isArray(data) ? data : [])
      )
      .catch((err) => {
        console.error(err);
        setWallets([]);
      });
  }, []);

  // Mappa wallet ID → nome
  const walletsMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const w of wallets) map[w.id] = w.name;
    return map;
  }, [wallets]);

  // Carica operazioni
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/operations`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data: Operation[]) => setOperations(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (op: Operation) => {
    setEditingId(op.id);
    setDraft({ ...op });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const onDraftChange = (field: keyof Operation, value: any) => {
    setDraft((cur) => (cur ? { ...cur, [field]: value } : cur));
  };

  const saveEdit = async () => {
    if (!draft) return;
    if (!window.confirm("Confermi le modifiche a questa operazione?")) return;
    try {
      const res = await fetch(`${API_BASE}/operations/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      const updated: Operation = await res.json();
      setOperations((ops) => ops.map((o) => (o.id === updated.id ? updated : o)));
      setEditingId(null);
      setDraft(null);
    } catch (e: any) {
      alert(e.message || "Errore nel salvataggio");
    }
  };

  const duplicate = async (op: Operation) => {
    if (!window.confirm("Sei sicuro di voler duplicare questa operazione?")) return;
    try {
      const res = await fetch(`${API_BASE}/operations/${op.id}/duplicate`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Duplicate failed: ${res.status}`);
      const newOp: Operation = await res.json();
      setOperations((ops) => [newOp, ...ops]);
    } catch (e: any) {
      alert(e.message || "Errore nella duplicazione");
    }
  };

  const remove = async (op: Operation) => {
    if (!window.confirm(`Eliminare definitivamente l'operazione #${op.id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/operations/${op.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Operazione non trovata (già eliminata?)");
        throw new Error(`Delete failed: ${res.status}`);
      }
      setOperations((ops) => ops.filter((o) => o.id !== op.id));
      if (editingId === op.id) {
        setEditingId(null);
        setDraft(null);
      }
    } catch (e: any) {
      alert(e.message || "Errore nell'eliminazione");
    }
  };

  const fmtDate = (d?: string | null) => {
    if (!d) return "";
    return d.includes("T") ? d.split("T")[0] : d;
  };

  // ——— FILTERING LOGIC ———
  const norm = (s: any) => (s ?? "").toString().toLowerCase();

  const filteredOperations = useMemo(() => {
    const f = filters;
    const dateFrom = f.dateFrom ? new Date(f.dateFrom) : null;
    const dateTo = f.dateTo ? new Date(f.dateTo) : null;

    const qMin = f.quantityMin !== "" ? Number(f.quantityMin) : null;
    const qMax = f.quantityMax !== "" ? Number(f.quantityMax) : null;
    const pMin = f.priceManualMin !== "" ? Number(f.priceManualMin) : null;
    const pMax = f.priceManualMax !== "" ? Number(f.priceManualMax) : null;
    const feMin = f.feesMin !== "" ? Number(f.feesMin) : null;
    const feMax = f.feesMax !== "" ? Number(f.feesMax) : null;

    const global = norm(f.global);

    return operations.filter((op) => {
      // date range
      if (dateFrom || dateTo) {
        const d = new Date(fmtDate(op.date));
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }

      // wallet exact match (if set)
      if (f.wallet_id !== "all" && String(op.wallet_id) !== f.wallet_id) return false;

      // numeric ranges
      if (qMin !== null && Number(op.quantity) < qMin) return false;
      if (qMax !== null && Number(op.quantity) > qMax) return false;

      const priceManual = op.price_manual ?? 0;
      if (pMin !== null && Number(priceManual) < pMin) return false;
      if (pMax !== null && Number(priceManual) > pMax) return false;

      const fees = op.fees ?? 0;
      if (feMin !== null && Number(fees) < feMin) return false;
      if (feMax !== null && Number(fees) > feMax) return false;

      // text contains for per-column filters
      if (f.operation_type && !norm(op.operation_type).includes(norm(f.operation_type)))
        return false;
      if (f.asset_symbol && !norm(op.asset_symbol).includes(norm(f.asset_symbol)))
        return false;
      if (f.user && !norm(op.user).includes(norm(f.user))) return false;
      if (f.broker && !norm(op.broker).includes(norm(f.broker))) return false;
      if (
        f.purchase_currency &&
        !norm(op.purchase_currency).includes(norm(f.purchase_currency))
      )
        return false;
      if (f.comment && !norm(op.comment).includes(norm(f.comment))) return false;

      // global fuzzy across common fields
      if (global) {
        const hay = [
          op.id,
          fmtDate(op.date),
          op.operation_type,
          op.quantity,
          op.asset_symbol,
          walletsMap[op.wallet_id] ?? op.wallet_id,
          op.user,
          op.broker,
          op.purchase_currency,
          op.price_manual,
          op.fees,
          op.comment,
        ]
          .map((x) => norm(x))
          .join(" ");
        if (!hay.includes(global)) return false;
      }

      return true;
    });
  }, [operations, filters, walletsMap]);

  // ——— SORTING LOGIC ———
  const sortedOperations = useMemo(() => {
    const arr = [...filteredOperations];
    const dir = sortDir === "asc" ? 1 : -1;

    const getVal = (op: Operation, key: SortKey): any => {
      switch (key) {
        case "date":
          return new Date(fmtDate(op.date)).getTime() || 0;
        case "operation_type":
          return op.operation_type ?? "";
        case "quantity":
          return Number(op.quantity) || 0;
        case "asset_symbol":
          return op.asset_symbol ?? "";
        case "wallet":
          return walletsMap[op.wallet_id] ?? String(op.wallet_id ?? "");
        case "user":
          return op.user ?? "";
        case "broker":
          return op.broker ?? "";
        case "purchase_currency":
          return op.purchase_currency ?? "";
        case "price_manual":
          return Number(op.price_manual ?? 0);
        case "fees":
          return Number(op.fees ?? 0);
        case "comment":
          return op.comment ?? "";
        default:
          return "";
      }
    };

    arr.sort((a, b) => {
      const va = getVal(a, sortKey);
      const vb = getVal(b, sortKey);
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });

    return arr;
  }, [filteredOperations, sortKey, sortDir, walletsMap]);

  // ——— PAGINATION LOGIC ———
  const totalRows = sortedOperations.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const pageRows = sortedOperations.slice(startIndex, endIndex);

  // reset pagina quando cambiano i filtri o la pageSize
  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const anyFilterActive = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(initialFilters);
  }, [filters]);

  const resetFilters = () => setFilters(initialFilters);

  const toggleSort = (key: SortKey) => {
    // versione semplice e robusta: niente updater annidato
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortHeader: React.FC<{ label: string; k: SortKey; align?: "left" | "right" }> = ({
    label,
    k,
    align = "left",
  }) => {
    const active = sortKey === k;
    const arrow = !active ? "↕" : sortDir === "asc" ? "▲" : "▼";
    return (
      <button
        type="button"
        className={`px-3 py-2 inline-flex items-center gap-1 w-full ${
          align === "right" ? "justify-end" : "justify-start"
        } hover:bg-muted/60`}
        onClick={() => toggleSort(k)}
        title={`Ordina per ${label}`}
      >
        <span className="font-medium">{label}</span>
        <span className="text-xs opacity-70">{arrow}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestisci operazioni</h2>
        <div className="text-sm text-muted-foreground">
          {loading
            ? "Caricamento…"
            : error
            ? `Errore: ${error}`
            : `${pageRows.length}/${filteredOperations.length} filtrate • ${operations.length} totali`}
        </div>
      </div>

      {/* FILTRI */}
      <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Global search */}
          <div className="col-span-1 md:col-span-3 lg:col-span-4">
            <Input
              placeholder="🔎 Cerca in tutte le colonne…"
              value={filters.global}
              onChange={(e) => setFilters((s) => ({ ...s, global: e.target.value }))}
            />
          </div>

          {/* Date range */}
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((s) => ({ ...s, dateFrom: e.target.value }))}
            placeholder="Da data"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((s) => ({ ...s, dateTo: e.target.value }))}
            placeholder="A data"
          />

          {/* Wallet */}
          <div>
            <Select
              value={filters.wallet_id}
              onValueChange={(val) => setFilters((s) => ({ ...s, wallet_id: val }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tutti i wallet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i wallet</SelectItem>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operation type */}
          <Input
            placeholder="Tipo (es. Buy/Sell/Transfer)"
            value={filters.operation_type}
            onChange={(e) =>
              setFilters((s) => ({ ...s, operation_type: e.target.value }))
            }
          />

          {/* Asset symbol */}
          <Input
            placeholder="Asset (es. BTC, EUNL)"
            value={filters.asset_symbol}
            onChange={(e) => setFilters((s) => ({ ...s, asset_symbol: e.target.value }))}
          />

          {/* User / Broker / Currency */}
          <Input
            placeholder="Utente"
            value={filters.user}
            onChange={(e) => setFilters((s) => ({ ...s, user: e.target.value }))}
          />
          <Input
            placeholder="Broker"
            value={filters.broker}
            onChange={(e) => setFilters((s) => ({ ...s, broker: e.target.value }))}
          />
          <Input
            placeholder="Valuta acquisto (EUR, USD, …)"
            value={filters.purchase_currency}
            onChange={(e) =>
              setFilters((s) => ({ ...s, purchase_currency: e.target.value }))
            }
          />

          {/* Numeric ranges */}
          <Input
            type="number"
            placeholder="Quantità min"
            value={filters.quantityMin}
            onChange={(e) => setFilters((s) => ({ ...s, quantityMin: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Quantità max"
            value={filters.quantityMax}
            onChange={(e) => setFilters((s) => ({ ...s, quantityMax: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Prezzo manuale min"
            value={filters.priceManualMin}
            onChange={(e) => setFilters((s) => ({ ...s, priceManualMin: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Prezzo manuale max"
            value={filters.priceManualMax}
            onChange={(e) => setFilters((s) => ({ ...s, priceManualMax: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Commissioni min"
            value={filters.feesMin}
            onChange={(e) => setFilters((s) => ({ ...s, feesMin: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Commissioni max"
            value={filters.feesMax}
            onChange={(e) => setFilters((s) => ({ ...s, feesMax: e.target.value }))}
          />

          {/* Comment text */}
          <div className="md:col-span-2 lg:col-span-2">
            <Input
              placeholder="Commento contiene…"
              value={filters.comment}
              onChange={(e) => setFilters((s) => ({ ...s, comment: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button variant="secondary" onClick={resetFilters} disabled={!anyFilterActive}>
            Pulisci filtri
          </Button>
          {anyFilterActive && (
            <span className="text-xs text-muted-foreground">Filtri attivi</span>
          )}
        </div>
      </div>

      {/* TABELLA */}
      <div className="w-full overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left">
                <SortHeader label="Data" k="date" />
              </th>
              <th className="text-left">
                <SortHeader label="Tipo" k="operation_type" />
              </th>
              <th className="text-right">
                <SortHeader label="Quantità" k="quantity" align="right" />
              </th>
              <th className="text-left">
                <SortHeader label="Asset" k="asset_symbol" />
              </th>
              <th className="text-left">
                <SortHeader label="Wallet" k="wallet" />
              </th>
              <th className="text-left">
                <SortHeader label="Utente" k="user" />
              </th>
              <th className="text-left">
                <SortHeader label="Broker" k="broker" />
              </th>
              <th className="text-left">
                <SortHeader label="Valuta" k="purchase_currency" />
              </th>
              <th className="text-right">
                <SortHeader label="Prezzo manuale" k="price_manual" align="right" />
              </th>
              <th className="text-right">
                <SortHeader label="Commissioni" k="fees" align="right" />
              </th>
              <th className="text-left">
                <SortHeader label="Commento" k="comment" />
              </th>
              <th className="px-3 py-2 text-left">Azioni</th>
            </tr>
          </thead>
          <tbody className="text-center">
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={12}>
                  Caricamento…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={12}>
                  Nessuna operazione corrispondente ai filtri
                </td>
              </tr>
            ) : (
              pageRows.map((op) => {
                const isEditing = editingId === op.id;
                return (
                  <tr key={op.id} className="border-t">
                    {/* Data */}
                    <td className="px-3 py-2 align-middle text-left whitespace-nowrap">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={fmtDate(draft?.date)}
                          onChange={(e) => onDraftChange("date", e.target.value)}
                        />
                      ) : (
                        fmtDate(op.date)
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-3 py-2 align-middle text-left">
                      {isEditing ? (
                        <Input
                          value={draft?.operation_type ?? ""}
                          onChange={(e) =>
                            onDraftChange("operation_type", e.target.value)
                          }
                        />
                      ) : (
                        op.operation_type
                      )}
                    </td>

                    {/* Quantità */}
                    <td className="px-3 py-2 align-middle text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={draft?.quantity ?? 0}
                          onChange={(e) =>
                            onDraftChange(
                              "quantity",
                              e.target.value === "" ? 0 : parseFloat(e.target.value)
                            )
                          }
                        />
                      ) : (
                        op.quantity
                      )}
                    </td>

                    {/* Asset */}
                    <td className="px-3 py-2 align-middle text-left">
                      {isEditing ? (
                        <Input
                          value={draft?.asset_symbol ?? ""}
                          onChange={(e) => onDraftChange("asset_symbol", e.target.value)}
                        />
                      ) : (
                        op.asset_symbol ?? "—"
                      )}
                    </td>

                    {/* Wallet */}
                    <td className="px-3 py-2 align-middle text-left">
                      {isEditing ? (
                        <Select
                          value={String(
                            draft?.wallet_id ?? (wallets[0] ? wallets[0].id : "")
                          )}
                          onValueChange={(val) => onDraftChange("wallet_id", Number(val))}
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
                      ) : (
                        walletsMap[op.wallet_id] ?? op.wallet_id
                      )}
                    </td>

                    {/* Utente */}
                    <td className="px-3 py-2 align-middle text-left">
                      {isEditing ? (
                        <Input
                          value={draft?.user ?? ""}
                          onChange={(e) => onDraftChange("user", e.target.value)}
                        />
                      ) : (
                        op.user ?? "—"
                      )}
                    </td>

                    {/* Broker */}
                    <td className="px-3 py-2 align-middle text-left">
                      {isEditing ? (
                        <Input
                          value={draft?.broker ?? ""}
                          onChange={(e) => onDraftChange("broker", e.target.value)}
                        />
                      ) : (
                        op.broker ?? "—"
                      )}
                    </td>

                    {/* Valuta */}
                    <td className="px-3 py-2 align-middle text-left">
                      {isEditing ? (
                        <Input
                          value={draft?.purchase_currency ?? ""}
                          onChange={(e) =>
                            onDraftChange("purchase_currency", e.target.value)
                          }
                        />
                      ) : (
                        op.purchase_currency ?? "—"
                      )}
                    </td>

                    {/* Prezzo manuale */}
                    <td className="px-3 py-2 align-middle text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.0001"
                          value={draft?.price_manual ?? 0}
                          onChange={(e) =>
                            onDraftChange(
                              "price_manual",
                              e.target.value === "" ? 0 : parseFloat(e.target.value)
                            )
                          }
                        />
                      ) : (
                        op.price_manual ?? "—"
                      )}
                    </td>

                    {/* Commissioni */}
                    <td className="px-3 py-2 align-middle text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={draft?.fees ?? 0}
                          onChange={(e) =>
                            onDraftChange(
                              "fees",
                              e.target.value === "" ? 0 : parseFloat(e.target.value)
                            )
                          }
                        />
                      ) : (
                        op.fees ?? "—"
                      )}
                    </td>

                    {/* Commento */}
                    <td className="px-3 py-2 align-middle text-left">
                      {isEditing ? (
                        <Input
                          value={draft?.comment ?? ""}
                          onChange={(e) => onDraftChange("comment", e.target.value)}
                        />
                      ) : (
                        op.comment ?? "—"
                      )}
                    </td>

                    {/* Azioni */}
                    <td className="px-3 py-2 align-middle whitespace-nowrap text-left">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button onClick={saveEdit} variant="default" className="px-3 py-1">
                            Salva
                          </Button>
                          <Button onClick={cancelEdit} variant="secondary" className="px-3 py-1">
                            Annulla
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => startEdit(op)}
                            variant="outline"
                            className="px-3 py-1"
                          >
                            Modifica
                          </Button>
                          <Button
                            onClick={() => duplicate(op)}
                            variant="outline"
                            className="px-3 py-1"
                          >
                            Duplica
                          </Button>
                          <Button
                            onClick={() => remove(op)}
                            variant="outline"
                            className="px-3 py-1"
                          >
                            Elimina
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINAZIONE */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Righe per pagina</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {totalRows === 0
              ? "0–0 di 0"
              : `${startIndex + 1}–${endIndex} di ${totalRows}`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Prev
            </Button>
            <div className="min-w-[60px] text-center text-sm">
              Pag. {safePage}/{totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
