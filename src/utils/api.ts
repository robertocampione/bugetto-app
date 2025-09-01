import type {
  WalletSummaryResponse,
  AssetByWalletResponse,
} from "@/types/portfolio";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function fetchWalletSummary(): Promise<WalletSummaryResponse> {
  const r = await fetch(`${BASE}/wallets/summary`);
  if (!r.ok) throw new Error("Failed to load wallet summary");
  return r.json();
}

export async function fetchAssetByWallet(symbol: string): Promise<AssetByWalletResponse> {
  const r = await fetch(`${BASE}/assets/${encodeURIComponent(symbol)}/by-wallet`);
  if (!r.ok) throw new Error("Failed to load asset breakdown");
  return r.json();
}
