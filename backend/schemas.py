from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import date

class OperationOut(BaseModel):
    # Pydantic v2: abilita lettura da ORM
    model_config = ConfigDict(from_attributes=True)

    id: int
    user: Optional[str]
    date: Optional[str]  # manteniamo string per compatibilità con il backend attuale
    operation_type: Optional[str]
    quantity: Optional[float]
    asset_symbol: Optional[str]
    wallet_id: Optional[int]
    broker: Optional[str]
    accounting: Optional[bool]
    comment: Optional[str]
    price: Optional[float]
    price_manual: Optional[float]
    price_avg_day: Optional[float]
    price_high_day: Optional[float]
    price_low_day: Optional[float]
    purchase_currency: Optional[str]
    exchange_rate: Optional[float]
    total_value: Optional[float]
    fees: Optional[float]
    dividend_value: Optional[float]

    # Normalizza stringhe vuote/NaN e converte string->float per i campi numerici
    @field_validator(
        "quantity",
        "price",
        "price_manual",
        "price_avg_day",
        "price_high_day",
        "price_low_day",
        "exchange_rate",
        "total_value",
        "fees",
        "dividend_value",
        mode="before",
    )
    @classmethod
    def _normalize_numeric(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            if s == "" or s.lower() == "nan":
                return None
            # prova a convertire stringhe numeriche in float
            try:
                return float(s)
            except ValueError:
                return v
        return v


class WalletOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    symbol: str
    name: Optional[str]
    currency: Optional[str]
    type: Optional[str]
    category: Optional[str]
    isin: Optional[str]
    visible: Optional[bool]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: Optional[str]
    language: Optional[str]


class PortfolioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    owner_id: Optional[int]
    shared: Optional[bool]


class CashflowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user: str
    type: str
    category: str
    description: Optional[str]
    date: str
    amount: float
    recurring: bool
    recurrence_months: Optional[int]
    end_date: Optional[str]


class SettingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user: str
    base_currency: Optional[str]
    pac_monthly: Optional[float]
    alert_threshold: Optional[float]


class DashboardSummary(BaseModel):
    total_value: float
    liquidity: float
    monthly_gain: float
    gain_percentage: float


class WalletBase(BaseModel):
    name: str


class WalletCreate(WalletBase):
    pass


class WalletOut(WalletBase):  # mantenuta per compatibilità con import esistenti
    id: int

    class Config:
        orm_mode = True


class OperationIn(BaseModel):
    date: str                       # "YYYY-MM-DD"
    operation_type: str             # es. "Acquisto", "Vendita", "Dividendo", ...
    asset_symbol: str               # es. "ACN", "BTC-USD", "EUR", "USD"
    quantity: float                 # positiva (segno gestito dal backend)
    wallet_id: int
    user: Optional[str] = None
    broker: Optional[str] = None
    accounting: bool = True
    price_manual: Optional[float] = None    # se presente, sovrascrive il prezzo auto
    purchase_currency: Optional[str] = None # default = currency da AssetInfo o "EUR"
    fees: Optional[float] = 0.0
    comment: Optional[str] = None


# --- Asset schemas ---
class AssetBase(BaseModel):
    symbol: str
    name: str | None = None
    currency: str | None = None
    type: str | None = None
    category: str | None = None
    isin: str | None = None
    visible: bool = True


class AssetCreate(AssetBase):
    symbol: str  # obbligatorio


class AssetOut(AssetBase):  # mantenuta per compatibilità con import esistenti
    id: int

    class Config:
        orm_mode = True


class AssetGuessOut(BaseModel):
    symbol: str
    name: str | None = None
    currency: str | None = None


class OperationPreviewOut(BaseModel):
    price: float
    price_avg_day: float | None = None
    price_high_day: float | None = None
    price_low_day: float | None = None
    exchange_rate: float
    total_value: float
    quantity: float
    purchase_currency: str
