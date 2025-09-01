import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
// Import select components for wallet dropdown (same as OperationForm)
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
  date: string;                 // ISO o YYYY-MM-DD
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
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

export default function OperationsManagePage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lista dei wallet per mappare gli ID ai nomi e popolare il menu a discesa
  const [wallets, setWallets] = useState<{ id: number; name: string }[]>([]);

  // Carica i wallet al mount della pagina
  useEffect(() => {
    // recupera lista wallet dal backend
    fetch(`${API_BASE}/wallets`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch wallets failed: ${r.status}`);
        return r.json();
      })
      .then((data: { id: number; name: string }[]) => setWallets(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error(err);
        setWallets([]);
      });
  }, []);

  // Mappa wallet ID → nome per sostituire la visualizzazione degli ID
  const walletsMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const w of wallets) {
      map[w.id] = w.name;
    }
    return map;
  }, [wallets]);

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
      setOperations((ops) => [...ops, newOp]);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestisci operazioni</h2>
        <div className="text-sm text-muted-foreground">
          {loading ? "Caricamento…" : error ? `Errore: ${error}` : `${operations.length} operazioni`}
        </div>
      </div>

      <div className="w-full overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Quantità</th>
              <th className="px-3 py-2">Asset</th>
              <th className="px-3 py-2">Wallet</th>
              <th className="px-3 py-2">Utente</th>
              <th className="px-3 py-2">Broker</th>
              <th className="px-3 py-2">Valuta</th>
              <th className="px-3 py-2">Prezzo manuale</th>
              <th className="px-3 py-2">Commissioni</th>
              <th className="px-3 py-2">Commento</th>
              <th className="px-3 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={13}>
                  Caricamento…
                </td>
              </tr>
            ) : operations.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={13}>
                  Nessuna operazione disponibile
                </td>
              </tr>
            ) : (
              operations.map((op) => {
                const isEditing = editingId === op.id;
                return (
                  <tr key={op.id} className="border-t">
                    {/* Data */}
                    <td className="px-3 py-2 align-middle">
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
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          value={draft?.operation_type ?? ""}
                          onChange={(e) => onDraftChange("operation_type", e.target.value)}
                        />
                      ) : (
                        op.operation_type
                      )}
                    </td>

                    {/* Quantità */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={draft?.quantity ?? 0}
                          onChange={(e) => onDraftChange("quantity", parseFloat(e.target.value))}
                        />
                      ) : (
                        op.quantity
                      )}
                    </td>

                    {/* Asset */}
                    <td className="px-3 py-2 align-middle">
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
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        // Usa un menu a discesa (Select) per scegliere il wallet di riferimento
                        <Select
                          value={String(draft?.wallet_id ?? "")}
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
                        // Visualizza il nome del wallet, se disponibile; altrimenti l'ID
                        walletsMap[op.wallet_id] ?? op.wallet_id
                      )}
                    </td>

                    {/* Utente */}
                    <td className="px-3 py-2 align-middle">
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
                    <td className="px-3 py-2 align-middle">
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
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          value={draft?.purchase_currency ?? ""}
                          onChange={(e) => onDraftChange("purchase_currency", e.target.value)}
                        />
                      ) : (
                        op.purchase_currency ?? "—"
                      )}
                    </td>

                    {/* Prezzo manuale */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.0001"
                          value={draft?.price_manual ?? 0}
                          onChange={(e) => onDraftChange("price_manual", parseFloat(e.target.value))}
                        />
                      ) : (
                        op.price_manual ?? "—"
                      )}
                    </td>

                    {/* Commissioni */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={draft?.fees ?? 0}
                          onChange={(e) => onDraftChange("fees", parseFloat(e.target.value))}
                        />
                      ) : (
                        op.fees ?? "—"
                      )}
                    </td>

                    {/* Commento */}
                    <td className="px-3 py-2 align-middle">
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
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="rounded-md border px-3 py-1 hover:bg-muted"
                          >
                            Salva
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-md border px-3 py-1 hover:bg-muted"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(op)}
                            className="rounded-md border px-3 py-1 hover:bg-muted"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => duplicate(op)}
                            className="rounded-md border px-3 py-1 hover:bg-muted"
                          >
                            Duplica
                          </button>
                          <button
                            onClick={() => remove(op)}
                            className="rounded-md border px-3 py-1 hover:bg-destructive/10 text-destructive border-destructive/50"
                          >
                            Elimina
                          </button>
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
    </div>
  );
}
