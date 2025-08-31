# models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    email = Column(String)
    language = Column(String, default='en')

class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    shared = Column(Boolean, default=False)

class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    operations = relationship("Operation", back_populates="wallet")

class AssetInfo(Base):
    __tablename__ = "asset_info"
    id = Column(Integer, primary_key=True)
    symbol = Column(String, nullable=False)
    name = Column(String)
    currency = Column(String)
    type = Column(String)
    category = Column(String)
    isin = Column(String)
    visible = Column(Boolean, default=True)

class Operation(Base):
    __tablename__ = "operations"
    id = Column(Integer, primary_key=True)
    user = Column(String)
    date = Column(String)
    operation_type = Column(String)
    quantity = Column(Float)
    asset_symbol = Column(String)
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    wallet = relationship("Wallet", back_populates="operations")
    broker = Column(String)
    accounting = Column(Boolean, default=True)
    comment = Column(Text)
    price = Column(Float)
    price_manual = Column(Float)
    price_avg_day = Column(Float)
    price_high_day = Column(Float)
    price_low_day = Column(Float)
    purchase_currency = Column(String)
    exchange_rate = Column(Float)
    total_value = Column(Float)
    fees = Column(Float)
    dividend_value = Column(Float)

class Cashflow(Base):
    __tablename__ = "cashflow"
    id = Column(Integer, primary_key=True)
    user = Column(String)
    type = Column(String)
    category = Column(String)
    description = Column(String)
    date = Column(String)
    amount = Column(Float)
    recurring = Column(Boolean, default=False)
    recurrence_months = Column(Integer)
    end_date = Column(String)

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True)
    user = Column(String)
    base_currency = Column(String, default="EUR")
    pac_monthly = Column(Float, default=0)
    alert_threshold = Column(Float, default=0)
