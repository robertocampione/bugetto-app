# backend/crud.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend import models
from .models import Operation, AssetInfo, Wallet
from .services import get_conversion_rate, get_current_price
from datetime import datetime
from collections import defaultdict
from .schemas import OperationIn
from sqlalchemy import func
from .database import SessionLocal
from typing import List
from . import models, schemas


import yfinance as yf
import logging

logger = logging.getLogger(__name__)

POSITIVE_TYPES = {"Acquisto", "Donazione (ricevuta)", "Saving", "Consolidamento"}
NEGATIVE_TYPES = {"Vendita", "Donazione (effettuata)", "Spesa"}

def get_operations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Operation).offset(skip).limit(limit).all()

def get_wallets(db: Session):
    return db.query(models.Wallet).all()

def get_assets(db: Session):
    return db.query(models.AssetInfo).all()

def get_dashboard_summary(db: Session):
    from .services import get_conversion_rate
    from .models import AssetInfo

    total_value = db.query(func.sum(models.Operation.total_value)) \
        .filter(models.Operation.accounting == True).scalar() or 0

    liquid_assets = db.query(AssetInfo).filter(
        AssetInfo.visible == True,
        AssetInfo.type == 'Liquidi'
    ).all()

    total_liquidity = 0
    for asset in liquid_assets:
        symbol = asset.symbol.upper()
        quantity = get_asset_quantity(db, symbol)

        if symbol == "EUR":
            price = 1.0
        else:
            price = get_conversion_rate(symbol, "EUR")

        logger.warning(f">>> Liquidity conversion: {quantity} {symbol} → EUR @ {price}")
        total_liquidity += quantity * price
        

    return {
        "total_value": round(total_value, 2),
        "liquidity": round(total_liquidity, 2),
        "monthly_gain": 2128.97,
        "gain_percentage": 2.5
    }


def get_allocation_by_asset(db: Session):
    total = db.query(func.sum(models.Operation.total_value))\
        .filter(models.Operation.accounting == True).scalar() or 0

    results = db.query(
        models.Operation.asset_symbol,
        func.sum(models.Operation.total_value).label("value")
    ).filter(models.Operation.accounting == True)\
     .group_by(models.Operation.asset_symbol)\
     .order_by(func.sum(models.Operation.total_value).desc()).all()

    return [
        {
            "symbol": r.asset_symbol,
            "value": round(r.value, 2),
            "allocation_pct": round(r.value / total * 100, 2) if total else 0
        }
        for r in results
    ]

def get_allocation_by_category(db: Session):
    total = db.query(func.sum(models.Operation.total_value))\
        .filter(models.Operation.accounting == True).scalar() or 0

    results = db.query(
        models.AssetInfo.type,
        func.sum(models.Operation.total_value).label("value")
    ).join(
        models.AssetInfo,
        models.Operation.asset_symbol == models.AssetInfo.symbol
    ).filter(models.Operation.accounting == True)\
     .group_by(models.AssetInfo.type)\
     .order_by(func.sum(models.Operation.total_value).desc()).all()

    return [
        {
            "type": r.type,
            "value": round(r.value, 2),
            "allocation_pct": round(r.value / total * 100, 2) if total else 0
        }
        for r in results
    ]


def get_average_purchase_rate(db: Session, symbol: str) -> float:
    symbol_lower = symbol.lower()

    # Filter using case-insensitive match
    purchase_total = db.query(
        func.sum(models.Operation.price * models.Operation.quantity)
    ).filter(
        func.lower(models.Operation.asset_symbol) == symbol_lower,
        models.Operation.accounting == True,
        models.Operation.operation_type == "Acquisto"
    ).scalar() or 0

    donation_total = db.query(
        func.sum(0 * models.Operation.quantity)
    ).filter(
        func.lower(models.Operation.asset_symbol) == symbol_lower,
        models.Operation.accounting == True,
        models.Operation.operation_type == "Donazione (ricevuta)"
    ).scalar() or 0

    numerator = purchase_total + donation_total

    denominator = db.query(
        func.sum(models.Operation.quantity)
    ).filter(
        func.lower(models.Operation.asset_symbol) == symbol_lower,
        models.Operation.accounting == True,
        models.Operation.operation_type.in_(["Acquisto", "Donazione (ricevuta)"])
    ).scalar() or 0

    return round(numerator / denominator, 6) if denominator else 0.0

def get_asset_quantity_by_wallet(db: Session, asset_symbol: str, wallet_id: int) -> float:
    symbol_lower = asset_symbol.lower()
    result = db.query(
        func.sum(models.Operation.quantity)
    ).filter(
        func.lower(models.Operation.asset_symbol) == symbol_lower,
        models.Operation.wallet_id == wallet_id,
        models.Operation.accounting == True
    ).scalar()
    
    return round(result or 0, 6)


# Total quantity held (only operations with accounting = True)
def get_asset_quantity(db: Session, symbol: str):
    symbol_lower = symbol.lower()  
   # logger.warning(">>> DEBUG SYMBOL: %s", symbol_lower)
    result = db.query(
        func.sum(models.Operation.quantity)
    ).filter(
        func.lower(models.Operation.asset_symbol) == symbol_lower,
        models.Operation.accounting == True
    ).scalar()
    
    return round(result or 0, 6)  
        
def get_total_dividends_by_asset(db: Session, symbol: str):
    symbol_lower = symbol.lower()
    
    total_dividends = db.query(
        func.sum(models.Operation.total_value)
    ).filter(
        func.lower(models.Operation.asset_symbol) == symbol_lower,
        models.Operation.accounting == True,
          func.lower(models.Operation.operation_type) == "dividendo"
    ).scalar()
    
    return round(total_dividends or 0, 2)

def get_allocation_by_category_group(db: Session):
    from .services import get_current_price, get_conversion_rate
    from .models import AssetInfo, Operation

    POSITIVE_TYPES = {"Acquisto", "Donazione (ricevuta)", "Saving", "Consolidamento"}
    NEGATIVE_TYPES = {"Vendita", "Donazione (effettuata)", "Spesa"}

    category_totals = {}
    symbol_to_category = {}

    # Join operations + asset info solo su visibili
    operations = (
        db.query(Operation, AssetInfo)
        .join(AssetInfo, Operation.asset_symbol == AssetInfo.symbol)
        .filter(AssetInfo.visible == True)
        .filter(AssetInfo.category != None)
        .filter(Operation.accounting == True)
        .filter(Operation.operation_type.in_(POSITIVE_TYPES.union(NEGATIVE_TYPES)))
        .all()
    )

    # Raggruppa le quantità per asset
    asset_quantities = {}
    for op, asset in operations:
        symbol = asset.symbol
        symbol_to_category[symbol] = asset.category
        try:
            qty = float(op.quantity)
        except Exception:
            continue

        if symbol not in asset_quantities:
            asset_quantities[symbol] = 0.0
        asset_quantities[symbol] += qty

    for symbol, quantity in asset_quantities.items():
        try:
            asset = db.query(AssetInfo).filter(AssetInfo.symbol == symbol).first()
            if not asset or not asset.category:
                continue

            # ✅ Liquidità: non usare get_current_price
            if asset.category.lower() == "liquidità":
                current_price = 1.0
            elif symbol.upper() == "EUR":
                current_price = 1.0
            else:
                current_price = get_current_price(symbol)

            conversion_rate = 1.0
            if asset.currency and asset.currency.upper() != "EUR":
                conversion_rate = get_conversion_rate(asset.currency, "EUR")

            value_eur = quantity * current_price * conversion_rate

            logger.warning(
                ">>> DEBUG: %s | category=%s | currency=%s | qty=%.4f | price=%.4f | rate=%.4f | EUR=%.2f",
                symbol, asset.category, asset.currency, quantity, current_price, conversion_rate, value_eur
            )

            if asset.category not in category_totals:
                category_totals[asset.category] = 0.0
            category_totals[asset.category] += value_eur

        except Exception as e:
            logger.warning(">>> ERRORE asset %s: %s", symbol, str(e))
            continue

    # Elimina categorie nulle o con valore irrilevante
    category_totals = {k: v for k, v in category_totals.items() if k and abs(v) > 0.01}
    total = sum(category_totals.values())

    result = [
        {
            "category": category,
            "value": round(value, 2),
            "allocation_pct": round((value / total) * 100, 2)
        }
        for category, value in sorted(category_totals.items(), key=lambda x: -x[1])
    ]

    return result


def get_historical_allocation_by_category(db: Session):
    from .services import get_current_price, get_conversion_rate
    from .models import AssetInfo, Operation
    from collections import defaultdict
    from datetime import datetime

    POSITIVE_TYPES = {"Acquisto", "Donazione (ricevuta)", "Saving", "Consolidamento"}
    NEGATIVE_TYPES = {"Vendita", "Donazione (effettuata)", "Spesa"}

    # Step 1 - Carica tutte le operazioni valide e visibili
    raw = (
        db.query(Operation, AssetInfo)
        .join(AssetInfo, Operation.asset_symbol == AssetInfo.symbol)
        .filter(AssetInfo.visible == True)
        .filter(AssetInfo.category != None)
        .filter(Operation.accounting == True)
        .filter(Operation.operation_type.in_(POSITIVE_TYPES.union(NEGATIVE_TYPES)))
        .all()
    )

    # Step 2 - Raggruppa quantità per (YYYY-MM, symbol)
    grouped_quantities = defaultdict(lambda: defaultdict(float))  # date -> symbol -> qty
    symbol_to_category = {}

    for op, asset in raw:
        try:
            date_obj = (
                op.date
                if isinstance(op.date, datetime)
                else datetime.strptime(op.date, "%Y-%m-%d")
            )
            year_month = date_obj.strftime("%Y-%m")
            qty = float(str(op.quantity).replace(",", "."))
            grouped_quantities[year_month][asset.symbol] += qty
            symbol_to_category[asset.symbol] = asset.category
        except Exception as e:
            print(f"Errore parsing operazione: {e}")
            continue

    # Step 3 - Calcola EUR value per (YYYY-MM, category)
    historical_data = []
    for date, symbol_quantities in grouped_quantities.items():
        category_totals = defaultdict(float)

        for symbol, qty in symbol_quantities.items():
            try:
                asset = db.query(AssetInfo).filter(AssetInfo.symbol == symbol).first()
                if not asset or not asset.category:
                    continue

                current_price = 1.0 if symbol.upper() == "EUR" else get_current_price(symbol)
                conversion_rate = 1.0
                if asset.currency and asset.currency.upper() != "EUR":
                    conversion_rate = get_conversion_rate(asset.currency, "EUR")

                value_eur = qty * current_price * conversion_rate
                category_totals[asset.category] += value_eur

            except Exception as e:
                print(f"Errore nel calcolo EUR per {symbol}: {e}")
                continue

        # Calcolo % su totale
        total = sum(category_totals.values())
        if total <= 0:
            continue

        percentages = {
            category: round((value / total) * 100, 2)
            for category, value in category_totals.items()
            if abs(value) > 0.01
        }

        historical_data.append({
            "date": date,
            "categories": percentages
        })

    return sorted(historical_data, key=lambda x: x["date"])


# --- nuova funzione ---
def create_operation(db: Session, op: OperationIn):
    # normalizza simbolo e recupera AssetInfo
    symbol = op.asset_symbol.upper()
    asset = db.query(AssetInfo).filter(func.lower(AssetInfo.symbol) == symbol.lower()).first()

    # valuta currency di acquisto
    purchase_ccy = (op.purchase_currency or (asset.currency if asset else None) or "EUR").upper()

    # determina segno quantità in base al tipo
    op_type = op.operation_type
    qty = abs(op.quantity)
    if op_type in NEGATIVE_TYPES:
        qty = -qty
    elif op_type in POSITIVE_TYPES:
        qty = +qty
    else:
        # es. Dividendo: quantità può restare 0 o quella fornita; nessun cambio di segno
        pass

    # prezzo base
    if op.price_manual is not None:
        price_base = float(op.price_manual)
        close, high, low = price_base, price_base, price_base
    else:
        from .services import get_current_price, get_day_prices
        # per liquidità o EUR: 1 nella propria valuta
        is_liquidity = (asset and ((asset.type or "").lower() == "liquidi" or (asset.category or "").lower() == "liquidità"))
        if is_liquidity or symbol == "EUR":
            price_base = 1.0
            close, high, low = 1.0, 1.0, 1.0
        else:
            close, high, low = get_day_prices(symbol)
            price_base = close if close else get_current_price(symbol)

    # tasso di cambio → EUR
    from .services import get_conversion_rate
    ex_rate = 1.0 if purchase_ccy == "EUR" else get_conversion_rate(purchase_ccy, "EUR")

    # totale in EUR (fee applicata in EUR)
    fees_eur = (op.fees or 0.0) * ex_rate
    total_eur = (qty * price_base * ex_rate) - fees_eur

    # build modello e persist
    db_op = Operation(
        user=None,
        date=op.date,
        operation_type=op_type,
        quantity=qty,
        asset_symbol=symbol,
        wallet_id=op.wallet_id,
        broker=op.broker,
        accounting=op.accounting,
        comment=op.comment,
        price=price_base,
        price_manual=op.price_manual,
        price_avg_day=close,
        price_high_day=high,
        price_low_day=low,
        purchase_currency=purchase_ccy,
        exchange_rate=ex_rate,
        total_value=total_eur,
        fees=op.fees or 0.0,
        dividend_value=None
    )
    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    return db_op


def _build_operation_object(db: Session, op: OperationIn) -> Operation:
    symbol = op.asset_symbol.upper()
    asset = db.query(AssetInfo).filter(func.lower(AssetInfo.symbol) == symbol.lower()).first()

    purchase_ccy = (op.purchase_currency or (asset.currency if asset else None) or "EUR").upper()

    op_type = op.operation_type
    qty = abs(op.quantity)
    if op_type in NEGATIVE_TYPES:
        qty = -qty
    elif op_type in POSITIVE_TYPES:
        qty = +qty

    if op.price_manual is not None:
        price_base = float(op.price_manual)
        close = high = low = price_base
    else:
        from .services import get_current_price, get_day_prices
        is_liquidity = (asset and ((asset.type or "").lower() == "liquidi" or (asset.category or "").lower() == "liquidità"))
        if is_liquidity or symbol == "EUR":
            price_base = 1.0
            close = high = low = 1.0
        else:
            close, high, low = get_day_prices(symbol)
            price_base = close if close else get_current_price(symbol)

    from .services import get_conversion_rate
    ex_rate = 1.0 if purchase_ccy == "EUR" else get_conversion_rate(purchase_ccy, "EUR")

    fees_eur = (op.fees or 0.0) * ex_rate
    total_eur = (qty * price_base * ex_rate) - fees_eur
      # <— set it from payload

    return Operation(
         user=op.user,
        date=op.date,
        operation_type=op_type,
        quantity=qty,
        asset_symbol=symbol,
        wallet_id=op.wallet_id,
        broker=op.broker,
        accounting=op.accounting,
        comment=op.comment,
        price=price_base,
        price_manual=op.price_manual,
        price_avg_day=close,
        price_high_day=high,
        price_low_day=low,
        purchase_currency=purchase_ccy,
        exchange_rate=ex_rate,
        total_value=total_eur,
        fees=op.fees or 0.0,
        dividend_value=None
    )

def preview_operation(db: Session, op: OperationIn) -> Operation:
    # Solo calcolo, nessun salvataggio
    return _build_operation_object(db, op)

def create_operation(db: Session, op: OperationIn):
    # (se esiste già, sostituisci la logica attuale con l’uso del builder)
    db_op = _build_operation_object(db, op)
    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    return db_op


def list_wallets(db: Session):
    return db.query(Wallet).order_by(Wallet.name.asc()).all()

def create_wallet(db: Session, name: str):
    existing = db.query(Wallet).filter(func.lower(Wallet.name) == name.lower()).first()
    if existing:
        return existing
    w = Wallet(name=name)
    db.add(w); db.commit(); db.refresh(w)
    return w

def get_last_purchase_meta(db: Session, symbol: str):
    q = (db.query(Operation, Wallet)
           .join(Wallet, Wallet.id == Operation.wallet_id, isouter=True)
           .filter(func.lower(Operation.asset_symbol) == symbol.lower())
           .filter(Operation.operation_type == "Acquisto")
           .order_by(Operation.date.desc(), Operation.id.desc()))
    row = q.first()
    if not row:
        return None
    op, w = row
    return {
        "wallet_id": op.wallet_id,
        "wallet_name": (w.name if w else None),
        "user": op.user
    }

def list_assets_visible(db: Session):
    return db.query(AssetInfo).filter(AssetInfo.visible == True).order_by(AssetInfo.name.asc(), AssetInfo.symbol.asc()).all()

# CREATE asset (se esiste per symbol -> aggiorna i campi passati)
def create_asset(db: Session, data: dict):
    sym = data.get("symbol", "").upper()
    if not sym:
        raise ValueError("symbol required")
    a = db.query(AssetInfo).filter(func.lower(AssetInfo.symbol) == sym.lower()).first()
    if a:
        # update parziale
        for k in ["name","currency","type","category","isin","visible"]:
            if k in data and data[k] is not None:
                setattr(a, k, data[k])
        db.commit(); db.refresh(a)
        return a
    a = AssetInfo(
        symbol=sym,
        name=data.get("name"),
        currency=(data.get("currency") or "EUR"),
        type=data.get("type"),
        category=data.get("category"),
        isin=data.get("isin"),
        visible=bool(data.get("visible", True)),
    )
    db.add(a); db.commit(); db.refresh(a)
    return a

def get_operations(db: Session, skip: int = 0, limit: int = 100) -> List[models.Operation]:
    return db.query(models.Operation).offset(skip).limit(limit).all()

def update_operation(db: Session, op_id: int, operation_in: schemas.OperationIn):
    # Example update implementation
    op = db.query(models.Operation).get(op_id)
    if not op:
        return None
    for field, value in operation_in.dict(exclude_unset=True).items():
        setattr(op, field, value)
    db.commit()
    db.refresh(op)
    return op

def duplicate_operation(db: Session, op_id: int):
    op = db.query(models.Operation).get(op_id)
    if not op:
        return None
    # Copy fields except id
    new_op = models.Operation(
        date=op.date,
        operation_type=op.operation_type,
        asset_id=op.asset_id,
        quantity=op.quantity,
        wallet_id=op.wallet_id,
        user=op.user,
        broker=op.broker,
        accounting=op.accounting,
        price_manual=op.price_manual,
        purchase_currency=op.purchase_currency,
        fees=op.fees,
        comment=op.comment,
    )
    db.add(new_op)
    db.commit()
    db.refresh(new_op)
    return new_op
