// src/types/portfolio.ts
export type WalletTopAsset = { symbol: string; qty: number; value: number };

export type WalletSummaryItem = {
  wallet_id: number;
  wallet_name: string;
  total_value: number;
  percent_of_portfolio: number;
  assets_count: number;
  top_assets: WalletTopAsset[];
};

export type WalletSummaryResponse = {
  total_portfolio_value: number;
  items: WalletSummaryItem[];
};

export type AssetWalletBreakdownItem = {
  wallet_id: number;
  wallet_name: string;
  qty: number;
  value: number;
  percent_of_asset: number;
};

export type AssetByWalletResponse = {
  symbol: string;
  price_used: number;
  total_qty: number;
  total_value: number;
  breakdown: AssetWalletBreakdownItem[];
};
