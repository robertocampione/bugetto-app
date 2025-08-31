export const API_BASE = "http://127.0.0.1:8000";
export type Wallet = { id: number; name: string };

export async function getWallets(): Promise<Wallet[]> {
  const r = await fetch(`${API_BASE}/wallets`);
  if (!r.ok) throw new Error("wallets");
  return r.json();
}
export async function createWallet(name: string): Promise<Wallet> {
  const r = await fetch(`${API_BASE}/wallets`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ name })
  });
  if (!r.ok) throw new Error("create wallet");
  return r.json();
}
export async function getLastPurchaseMeta(symbol: string): Promise<{wallet_id?:number; wallet_name?:string; user?:string}> {
  const r = await fetch(`${API_BASE}/assets/${encodeURIComponent(symbol)}/last-purchase-meta`);
  if (!r.ok) throw new Error("last meta");
  return r.json();
}

export type OperationIn = {
  date: string;
  operation_type: string;
  asset_symbol: string;
  quantity: number;
  wallet_id: number;
  user?: string | null; 
  broker?: string | null;
  accounting?: boolean;
  price_manual?: number | null;
  purchase_currency?: string | null;
  fees?: number | null;
  comment?: string | null;
};

export async function previewOperation(data: OperationIn) {
  const res = await fetch(`${API_BASE}/operations/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
  return res.json();
}

export async function createOperation(data: OperationIn) {
  const res = await fetch(`${API_BASE}/operations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

export type Asset = { id: number; symbol: string; name?: string; currency?: string; type?: string; category?: string; isin?: string; visible: boolean };

export async function getVisibleAssets(): Promise<Asset[]> {
  const r = await fetch(`${API_BASE}/assets/visible`);
  if (!r.ok) throw new Error("assets visible");
  return r.json();
}

export async function createAsset(a: Partial<Asset> & {symbol: string}) {
  const r = await fetch(`${API_BASE}/assets`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(a),
  });
  if (!r.ok) throw new Error("create asset");
  return r.json();
}

export async function guessAsset(symbol: string): Promise<{symbol:string; name?:string; currency?:string}> {
  const r = await fetch(`${API_BASE}/assets/guess?symbol=${encodeURIComponent(symbol)}`);
  if (!r.ok) throw new Error("guess asset");
  return r.json();
}
