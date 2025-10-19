from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import PortfolioItem, User
from schemas import PortfolioItemCreate, PortfolioItemUpdate


def list_portfolio_items(db: Session, user: User) -> List[PortfolioItem]:
  return (
    db.query(PortfolioItem)
    .filter(PortfolioItem.user_id == user.id)
    .order_by(PortfolioItem.created_at.asc())
    .all()
  )


def create_portfolio_item(db: Session, user: User, data: PortfolioItemCreate) -> PortfolioItem:
  item = PortfolioItem(
    user_id=user.id,
    symbol=data.symbol.upper(),
    name=data.name,
    shares=data.shares,
    buy_price=data.buy_price,
    buy_date=data.buy_date,
    current_price=data.current_price,
  )
  db.add(item)
  db.commit()
  db.refresh(item)
  return item


def update_portfolio_item(db: Session, user: User, item_id: int, data: PortfolioItemUpdate) -> PortfolioItem:
  item = db.get(PortfolioItem, item_id)
  if not item or item.user_id != user.id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio item not found")

  for field, value in data.dict(exclude_unset=True).items():
    setattr(item, field, value)

  db.commit()
  db.refresh(item)
  return item


def delete_portfolio_item(db: Session, user: User, item_id: int) -> None:
  item = db.get(PortfolioItem, item_id)
  if not item or item.user_id != user.id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio item not found")
  db.delete(item)
  db.commit()

