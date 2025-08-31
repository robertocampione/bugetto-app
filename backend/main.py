from fastapi import FastAPI, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from backend import models, schemas, crud
from backend.database import SessionLocal, engine, get_db

from fastapi.middleware.cors import CORSMiddleware
from .services import get_current_price
from .services import get_exchange_rate
from .services import get_conversion_rate
from backend.schemas import OperationIn, OperationOut
from fastapi.middleware.cors import CORSMiddleware
import logging

logger = logging.getLogger("uvicorn.error")
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.get("/operations/", response_model=list[schemas.OperationOut])
def read_operations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_operations(db, skip=skip, limit=limit)

@app.get("/wallets/", response_model=list[schemas.WalletOut])
def read_wallets(db: Session = Depends(get_db)):
    return crud.get_wallets(db)

@app.get("/assets/", response_model=list[schemas.AssetOut])
def read_assets(db: Session = Depends(get_db)):
    return crud.get_assets(db)

@app.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def read_dashboard_summary(db: Session = Depends(get_db)):
    return crud.get_dashboard_summary(db)

@app.get("/dashboard/allocation/assets")
def dashboard_allocation_assets(db: Session = Depends(get_db)):
    return crud.get_allocation_by_asset(db)

@app.get("/dashboard/allocation/categories")
def dashboard_allocation_categories(db: Session = Depends(get_db)):
    return crud.get_allocation_by_category(db)

@app.get("/assets/{symbol}/average-price")
def get_asset_average_price(symbol: str, db: Session = Depends(get_db)):
    return {
        "symbol": symbol,
        "average_purchase_rate": crud.get_average_purchase_rate(db, symbol)
    }

@app.get("/assets/{symbol}/wallet/{wallet_id}/quantity")
def get_asset_quantity(symbol: str, wallet_id: int, db: Session = Depends(get_db)):
    quantity = crud.get_asset_quantity_by_wallet(db, symbol.lower(), wallet_id)
    return {"symbol": symbol, "wallet_id": wallet_id, "quantity": quantity}

@app.get("/assets/{symbol}/delta")
def asset_delta(symbol: str, db: Session = Depends(get_db)):
    symbol_lower = symbol.lower()

    avg_price = crud.get_average_purchase_rate(db, symbol)
    quantity = crud.get_asset_quantity(db, symbol.lower())  # oppure una funzione totale
    current_price = get_current_price(symbol)  # integra yfinance

    delta_value = (current_price - avg_price) * quantity
    delta_pct = ((current_price - avg_price) / avg_price) * 100 if avg_price != 0 else 0

    return {
        "symbol": symbol,
        "average_price": round(avg_price, 4),
        "current_price": round(current_price, 4),
        "quantity": round(quantity, 6),
        "delta_value": round(delta_value, 2),
        "delta_percentage": round(delta_pct, 2)
    }

@app.get("/assets/{symbol}/current-price")
def get_asset_current_price(symbol: str):
    current_price = get_current_price(symbol)
    return {
        "symbol": symbol,
        "current_price": round(current_price, 4)
    }

@app.get("/assets/{symbol}/total-quantity")
def dashboard_allocation_categories(symbol: str, db: Session = Depends(get_db)):
    return crud.get_asset_quantity(db, symbol)


@app.get("/assets/{symbol}/dividends")
def read_total_dividends(symbol: str, db: Session = Depends(get_db)):
    return crud.get_total_dividends_by_asset(db, symbol)

@app.get("/convert")
def convert_currency(
    from_currency: str = Query(..., alias="from"),
    to_currency: str = Query(..., alias="to")
):
    return get_conversion_rate(from_currency, to_currency)

    

@app.get("/dashboard/allocation/categories-group", response_model=list[dict])
def get_category_allocation(db: Session = Depends(get_db)):
    return crud.get_allocation_by_category_group(db)

@app.get("/dashboard/allocation/categories-history")
def get_historical_category_allocation(db: Session = Depends(get_db)):
    return crud.get_historical_allocation_by_category(db)

@app.post("/operations/", response_model=schemas.OperationOut)
def create_operation_endpoint(payload: OperationIn, db: Session = Depends(get_db)):
    return crud.create_operation(db, payload)

@app.post("/operations/preview", response_model=schemas.OperationPreviewOut)
def preview_operation_endpoint(payload: schemas.OperationIn, db: Session = Depends(get_db)):
    """
    Se price_manual è presente:
    - usa price_manual SOLO per price e total_value
    - high/low/close vengono SEMPRE dalle API (ignorano price_manual)
    """
    try:
        # Sempre calcolo 'auto' per avere high/low/close reali
        auto = crud.preview_operation(db, schemas.OperationIn(**{**payload.dict(), "price_manual": None}))

        # Calcolo principale: con o senza manuale (per price e total_value)
        main = crud.preview_operation(db, payload)

        return schemas.OperationPreviewOut(
            price=float(main.price or 0),
            price_avg_day=float(auto.price_avg_day or 0),
            price_high_day=float(auto.price_high_day or 0),
            price_low_day=float(auto.price_low_day or 0),
            exchange_rate=float((main.exchange_rate or auto.exchange_rate or 1)),
            total_value=float(main.total_value or 0),
            quantity=float(main.quantity or 0),
            purchase_currency=main.purchase_currency or auto.purchase_currency or "EUR",
        )
    except Exception as e:
        logger.exception("Preview failed")
        raise HTTPException(status_code=400, detail=str(e))

# Wallets
@app.get("/wallets", response_model=list[schemas.WalletOut])
def wallets_list(db: Session = Depends(get_db)):
    return crud.list_wallets(db)

@app.post("/wallets", response_model=schemas.WalletOut)
def wallets_create(payload: schemas.WalletCreate, db: Session = Depends(get_db)):
    w = crud.create_wallet(db, payload.name)
    return w

# Last purchase meta for an asset
@app.get("/assets/{symbol}/last-purchase-meta")
def last_purchase_meta(symbol: str, db: Session = Depends(get_db)):
    meta = crud.get_last_purchase_meta(db, symbol)
    return meta or {}


# elenco asset visibili (per picker)
@app.get("/assets/visible", response_model=list[schemas.AssetOut])
def assets_visible(db: Session = Depends(get_db)):
    return crud.list_assets_visible(db)

# crea/aggiorna asset
@app.post("/assets", response_model=schemas.AssetOut)
def assets_create(payload: schemas.AssetCreate, db: Session = Depends(get_db)):
    return crud.create_asset(db, payload.dict())

# auto-compila da symbol
@app.get("/assets/guess", response_model=schemas.AssetGuessOut)
def assets_guess(symbol: str, db: Session = Depends(get_db)):
    from .services import guess_asset_metadata
    data = guess_asset_metadata(symbol)
    return schemas.AssetGuessOut(**data)