# backend/services.py
import yfinance as yf
import requests

def get_current_price(symbol: str) -> float:
    try:
        ticker = yf.Ticker(symbol.upper())
        data = ticker.history(period="1d")
        if data.empty:
            return 0
        return float(data["Close"].iloc[-1])
    except Exception:
        return 0

def get_exchange_rate(base_currency: str, quote_currency: str) -> float:
    """
    Ritorna il tasso di cambio da base_currency → quote_currency (es. USD → EUR).
    Usa Yahoo Finance (es. USDEUR=X)
    """
    try:
        if base_currency.upper() == quote_currency.upper():
            return 1.0
        
        pair = f"{base_currency.upper()}{quote_currency.upper()}=X"
        ticker = yf.Ticker(pair)
        data = ticker.history(period="1d")
        
        if data.empty:
            return 0
        return float(data["Close"].iloc[-1])
    except Exception:
        return 0

conversion_cache = {}

def get_conversion_rate(from_currency: str, to_currency: str = "EUR") -> float:
    if from_currency.upper() == to_currency.upper():
        return 1.0

    key = (from_currency.upper(), to_currency.upper())
    if key in conversion_cache:
        return conversion_cache[key]

    try:
        url = f"https://api.frankfurter.app/latest?from={from_currency.upper()}&to={to_currency.upper()}"
        response = requests.get(url)
        data = response.json()
        rate = data["rates"][to_currency.upper()]
        conversion_cache[key] = rate  # salva nel cache
        return rate
    except Exception as e:
        print(f"Errore cambio {from_currency}→{to_currency}:", e)
        return 1.0  # fallback


def get_day_prices(symbol: str):
    """
    Ritorna (close, high, low) del giorno per il simbolo dato.
    """
    try:
        t = yf.Ticker(symbol.upper())
        data = t.history(period="1d")
        if data.empty:
            return (0.0, 0.0, 0.0)
        return (float(data["Close"].iloc[-1]),
                float(data["High"].iloc[-1]),
                float(data["Low"].iloc[-1]))
    except Exception:
        return (0.0, 0.0, 0.0)

def guess_asset_metadata(symbol: str):
    try:
        t = yf.Ticker(symbol.upper())
        info = t.fast_info if hasattr(t, "fast_info") else None
        name = getattr(t, "info", {}).get("shortName") if hasattr(t, "info") else None
        currency = getattr(info, "currency", None) if info else None
        if not currency and hasattr(t, "info"):
            currency = t.info.get("currency")
        return {"symbol": symbol.upper(), "name": name, "currency": currency}
    except Exception:
        return {"symbol": symbol.upper(), "name": None, "currency": None}