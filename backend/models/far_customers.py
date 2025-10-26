from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.sql import func
from database import Base

class FarCustomer(Base):
    __tablename__ = "far_customers"
    customer_id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FarTransaction(Base):
    __tablename__ = "far_transactions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(String, index=True)
    transaction_id = Column(String, index=True)
    transaction_type = Column(String)
    timestamp = Column(String)
    symbol = Column(String)
    company_name = Column(String)
    shares = Column(Float)
    price = Column(Float)
    total_value = Column(Float)