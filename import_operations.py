import sqlite3
import pandas as pd
import os
from datetime import datetime

DB_PATH = os.path.abspath("bugetto.db")
CSV_PATH = os.path.abspath("Portfolio Campione - Grevendonk V3a03_05_2025 - OperazioniV2.csv")

def clean_number(value):
    if pd.isna(value):
        return None
    value = str(value).replace("€", "").replace("$", "").replace(",", "").strip()
    try:
        return float(value)
    except ValueError:
        return None

def parse_date(date_str):
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date().isoformat()
    except:
        return None

def main():
    if not os.path.exists(DB_PATH) or not os.path.exists(CSV_PATH):
        print(f"[ERRORE] Database o CSV non trovato.")
        return

    print(f"[INFO] Connessione a {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Reset tabelle
    cur.execute("DELETE FROM operations")
    cur.execute("DELETE FROM asset_info")
    cur.execute("DELETE FROM wallets")
    conn.commit()

    df = pd.read_csv(CSV_PATH)
    importati = 0
    saltati = 0

    for index, row in df.iterrows():
        try:
            user = row.get("Utente", "Roberto")
            id_raw = str(row.get("ID", "")).strip()

            if id_raw.lower() == "cash eur":
                asset_id_ref = 9001
            elif id_raw.lower() == "cash usd":
                asset_id_ref = 9002
            else:
                asset_id_ref = int(id_raw)

            asset_symbol = str(row.get("Simbolo", "")).strip()
            asset_name = str(row.get("Nome", "")).strip()
            asset_type = str(row.get("Tipo", "")).strip()
            isin = row.get("ISIN", None)
            asset_currency = row.get("Valuta Acquisto", None)

            price = clean_number(row.get("Price Manual")) or clean_number(row.get("Price "))
            price_avg = clean_number(row.get("Price Avarage Day"))
            price_high = clean_number(row.get("Price High Day"))
            price_low = clean_number(row.get("Price Low Day"))

            qty = clean_number(row.get("Variazione quantità"))
            fees = clean_number(row.get("Fees"))
            total = clean_number(row.get("Totale"))
            exchange_rate = clean_number(row.get("Cambio"))
            dividend = clean_number(row.get("Dividendi euro"))

            wallet_name = str(row.get("Wallet", "")).strip()
            broker = str(row.get("Exchange/Broker", "")).strip()

            date = parse_date(row.get("Data"))
            op_type = str(row.get("Tipo Operazione", "")).strip()
            comment = row.get("Commento") if pd.notna(row.get("Commento")) else None
            accounting = str(row.get("Contabilizza in Portafoglio", "")).strip().lower() == "yes"

            # Inserimento asset_info
            cur.execute("SELECT id FROM asset_info WHERE symbol = ?", (asset_symbol,))
            asset = cur.fetchone()
            if not asset:
                cur.execute("""
                    INSERT INTO asset_info (symbol, name, currency, type, isin)
                    VALUES (?, ?, ?, ?, ?)
                """, (asset_symbol, asset_name, asset_currency, asset_type, isin))
                asset_id = cur.lastrowid
            else:
                asset_id = asset[0]

            # Inserimento wallets
            cur.execute("SELECT id FROM wallets WHERE name = ?", (wallet_name,))
            wallet = cur.fetchone()
            if not wallet:
                cur.execute("INSERT INTO wallets (name) VALUES (?)", (wallet_name,))
                wallet_id = cur.lastrowid
            else:
                wallet_id = wallet[0]

            # Inserimento operation
            cur.execute("""
                INSERT INTO operations (
                    user, date, operation_type, quantity, asset_symbol, asset_id_ref,
                    asset_id, wallet_id, broker, accounting, comment,
                    price, price_manual, price_avg_day, price_high_day, price_low_day,
                    purchase_currency, exchange_rate, total_value, fees, dividend_value
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user, date, op_type, qty, asset_symbol, asset_id_ref,
                asset_id, wallet_id, broker, accounting, comment,
                price, price, price_avg, price_high, price_low,
                asset_currency, exchange_rate, total, fees, dividend
            ))

            importati += 1

        except Exception as e:
            print(f"[SALTO] Riga {index + 1} fallita: {e}")
            saltati += 1

    conn.commit()
    conn.close()
    print(f"[OK] Operazioni importate: {importati}, saltate: {saltati}")

if __name__ == "__main__":
    main()
