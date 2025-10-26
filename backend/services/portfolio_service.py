from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import PortfolioItem, User
from schemas import PortfolioItemCreate, PortfolioItemUpdate


def _owner_fields(actor) -> dict:
    if actor.mode == "app":
        return {
            "owner_type": "app",
            "owner_key": str(actor.id),  # actor.id is numeric user.id
        }
    elif actor.mode == "far_customer":
        return {
            "owner_type": "far_customer",
            "owner_key": actor.customer_id,
        }
    else:
        raise ValueError(f"Unknown actor mode {actor.mode}")


def list_portfolio_items(db: Session, actor) -> List[PortfolioItem]:
  owner = _owner_fields(actor)
  return (
    db.query(PortfolioItem)
    .filter(
      PortfolioItem.owner_type == owner["owner_type"],
      PortfolioItem.owner_key == owner["owner_key"])
    .order_by(PortfolioItem.created_at.asc())
    .all()
  )


def create_portfolio_item(db: Session, actor, data: PortfolioItemCreate) -> PortfolioItem:
  owner = _owner_fields(actor)
  item = PortfolioItem(
    owner_type=owner["owner_type"],
    owner_key=owner["owner_key"],
    user_id=actor.id if actor.mode == "app" else None,
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


def _get_owned_item(db: Session, actor, item_id: int) -> PortfolioItem:
    owner = _owner_fields(actor)
    item = db.get(PortfolioItem, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio item not found",
        )
    if (item.owner_type != owner["owner_type"] or item.owner_key != owner["owner_key"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio item not found",
        )
    return item


def update_portfolio_item(db: Session, actor, item_id: int, data: PortfolioItemUpdate) -> PortfolioItem:
  item = _get_owned_item(db, actor, item_id)

  for field, value in data.dict(exclude_unset=True).items():
    setattr(item, field, value)

  db.commit()
  db.refresh(item)
  return item


def delete_portfolio_item(db: Session, actor, item_id: int) -> None:
  item = _get_owned_item(db, actor, item_id)
  db.delete(item)
  db.commit()