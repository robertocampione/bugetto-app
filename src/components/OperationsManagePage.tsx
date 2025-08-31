import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

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
  price_avg_day?: number | null;
  price_high_day?: number | null;
  price_low_day?: number | null;
  exchange_rate?: number | null;
  total_value?: number | null;
  fees?: number | null;
  dividend_value?: number | null;
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

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/operations/`, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch operations: ${res.status}`);
        return res.json();
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

  const fmtDate = (d?: string | null) => {
    if (!d) return "";
    return d.includes("T") ? d.split("T")[0] : d;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestisci operazioni</h2>
        <div className="text-sm text-muted-foreground">
          Backend: <code>{API_BASE}</code>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Asset</th>
              <th className="px-3 py-2">Quantità</th>
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
                  Nessuna operazione trovata.
                </td>
              </tr>
            ) : (
              operations.map((op) => {
                const isEditing = editingId === op.id;
                const row = isEditing && draft ? draft : op;

                return (
                  <tr key={op.id} className="border-t">
                    <td className="px-3 py-2 align-middle">{op.id}</td>

                    {/* Data */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="date"
                          className="h-8 w-40 bg-background text-foreground"
                          value={fmtDate(row.date)}
                          onChange={(e) => onDraftChange("date", e.target.value)}
                        />
                      ) : (
                        new Date(op.date).toLocaleDateString()
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="text"
                          className="h-8 w-40 bg-background text-foreground"
                          value={row.operation_type || ""}
                          onChange={(e) => onDraftChange("operation_type", e.target.value)}
                        />
                      ) : (
                        op.operation_type
                      )}
                    </td>

                    {/* Asset */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="text"
                          className="h-8 w-32 bg-background text-foreground"
                          value={row.asset_symbol || ""}
                          onChange={(e) => onDraftChange("asset_symbol", e.target.value)}
                        />
                      ) : (
                        op.asset_symbol || ""
                      )}
                    </td>

                    {/* Quantità */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.0001"
                          className="h-8 w-32 text-right bg-background text-foreground"
                          value={row.quantity ?? 0}
                          onChange={(e) => onDraftChange("quantity", Number(e.target.value))}
                        />
                      ) : (
                        op.quantity
                      )}
                    </td>

                    {/* Wallet */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="number"
                          className="h-8 w-24 text-right bg-background text-foreground"
                          value={row.wallet_id ?? 0}
                          onChange={(e) => onDraftChange("wallet_id", Number(e.target.value))}
                        />
                      ) : (
                        op.wallet_id
                      )}
                    </td>

                    {/* Utente */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="text"
                          className="h-8 w-32 bg-background text-foreground"
                          value={row.user || ""}
                          onChange={(e) => onDraftChange("user", e.target.value)}
                        />
                      ) : (
                        op.user || ""
                      )}
                    </td>

                    {/* Broker */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="text"
                          className="h-8 w-32 bg-background text-foreground"
                          value={row.broker || ""}
                          onChange={(e) => onDraftChange("broker", e.target.value)}
                        />
                      ) : (
                        op.broker || ""
                      )}
                    </td>

                    {/* Valuta */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="text"
                          className="h-8 w-24 bg-background text-foreground"
                          value={row.purchase_currency || ""}
                          onChange={(e) => onDraftChange("purchase_currency", e.target.value)}
                        />
                      ) : (
                        op.purchase_currency || ""
                      )}
                    </td>

                    {/* Prezzo manuale */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.0001"
                          className="h-8 w-28 text-right bg-background text-foreground"
                          value={row.price_manual ?? 0}
                          onChange={(e) => onDraftChange("price_manual", Number(e.target.value))}
                        />
                      ) : (
                        row.price_manual ?? ""
                      )}
                    </td>

                    {/* Commissioni */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.0001"
                          className="h-8 w-28 text-right bg-background text-foreground"
                          value={row.fees ?? 0}
                          onChange={(e) => onDraftChange("fees", Number(e.target.value))}
                        />
                      ) : (
                        row.fees ?? ""
                      )}
                    </td>

                    {/* Commento */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          type="text"
                          className="h-8 w-56 bg-background text-foreground"
                          value={row.comment || ""}
                          onChange={(e) => onDraftChange("comment", e.target.value)}
                        />
                      ) : (
                        op.comment || ""
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
