import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

/**
 * AssetsManagePage permette di visualizzare e modificare gli asset
 * presenti nel database. È strutturata in modo simile a
 * OperationsManagePage, ma lavora sulla lista degli asset invece
 * delle operazioni.
 */

interface Asset {
  id: number;
  symbol: string;
  name?: string | null;
  currency?: string | null;
  type?: string | null;
  category?: string | null;
  isin?: string | null;
  visible: boolean;
  [key: string]: any;
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

export default function AssetsManagePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/assets/`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data: Asset[]) => setAssets(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setDraft({ ...asset });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const onDraftChange = (field: keyof Asset, value: any) => {
    setDraft((cur) => (cur ? { ...cur, [field]: value } : cur));
  };

    const remove = async (asset: Asset) => {
    if (!window.confirm(`Eliminare definitivamente l'asset #${asset.id}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/assets/${asset.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Asset non trovato (già eliminato?)");
        throw new Error(`Delete failed: ${res.status}`);
      }
      setAssets((assets) => assets.filter((o) => o.id !== asset.id));
      if (editingId === asset.id) {
        setEditingId(null);
        setDraft(null);
      }
    } catch (e: any) {
      alert(e.message || "Errore nell'eliminazione");
    }
  };

  const saveEdit = async () => {
    if (!draft) return;
    if (!window.confirm("Confermi le modifiche a questo asset?")) return;
    try {
      const res = await fetch(`${API_BASE}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      const updated: Asset = await res.json();
      setAssets((as) => as.map((a) => (a.id === updated.id ? updated : a)));
      setEditingId(null);
      setDraft(null);
    } catch (e: any) {
      alert(e.message || "Errore nel salvataggio");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gestisci asset</h2>
        <div className="text-sm text-muted-foreground">
          {loading ? "Caricamento…" : error ? `Errore: ${error}` : `${assets.length} asset`}
        </div>
      </div>

      <div className="w-full overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Valuta</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">ISIN</th>
              <th className="px-3 py-2">Visibile</th>
              <th className="px-3 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody className="text-center">
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={8}>
                  Caricamento…
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                  Nessun asset disponibile
                </td>
              </tr>
            ) : (
              assets.map((a) => {
                const isEditing = editingId === a.id;
                return (
                  <tr key={a.id} className="border-t">
                    {/* Symbol */}
                    <td className="px-3 py-2 align-middle">
                      {a.symbol}
                    </td>

                    {/* Nome */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          value={draft?.name ?? ""}
                          onChange={(e) => onDraftChange("name", e.target.value)}
                        />
                      ) : (
                        a.name ?? "—"
                      )}
                    </td>

                    {/* Valuta */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          value={draft?.currency ?? ""}
                          onChange={(e) => onDraftChange("currency", e.target.value)}
                        />
                      ) : (
                        a.currency ?? "—"
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          value={draft?.type ?? ""}
                          onChange={(e) => onDraftChange("type", e.target.value)}
                        />
                      ) : (
                        a.type ?? "—"
                      )}
                    </td>

                    {/* Categoria */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          value={draft?.category ?? ""}
                          onChange={(e) => onDraftChange("category", e.target.value)}
                        />
                      ) : (
                        a.category ?? "—"
                      )}
                    </td>

                    {/* ISIN */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Input
                          value={draft?.isin ?? ""}
                          onChange={(e) => onDraftChange("isin", e.target.value)}
                        />
                      ) : (
                        a.isin ?? "—"
                      )}
                    </td>

                    {/* Visibile */}
                    <td className="px-3 py-2 align-middle">
                      {isEditing ? (
                        <Checkbox
                          checked={draft?.visible ?? true}
                          onCheckedChange={(val) => onDraftChange("visible", Boolean(val))}
                        />
                      ) : (
                        a.visible ? "✔" : "—"
                      )}
                    </td>

                    {/* Azioni */}
                    <td className="px-3 py-2 align-middle space-x-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={saveEdit}>
                            Salva
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>
                            Annulla
                          </Button>
                        </>
                      ) : (
                        <><Button size="sm" variant="secondary" onClick={() => startEdit(a)}>
                            Modifica
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => remove(a)}>
                              Elimina
                          </Button></>
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