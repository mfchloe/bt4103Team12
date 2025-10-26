from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from dependencies import get_current_actor, get_db
from models import User
from schemas import PortfolioItemCreate, PortfolioItemOut, PortfolioItemUpdate
from services.portfolio_service import (
  create_portfolio_item,
  delete_portfolio_item,
  list_portfolio_items,
  update_portfolio_item,
)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/", response_model=List[PortfolioItemOut])
def get_portfolio(actor = Depends(get_current_actor), db: Session = Depends(get_db)):
  return list_portfolio_items(db, actor)


@router.post("/", response_model=PortfolioItemOut, status_code=status.HTTP_201_CREATED)
def add_portfolio_item(payload: PortfolioItemCreate, actor = Depends(get_current_actor), db: Session = Depends(get_db)):
  return create_portfolio_item(db, actor, payload)


@router.put("/{item_id}", response_model=PortfolioItemOut)
def update_portfolio(item_id: int, payload: PortfolioItemUpdate, actor = Depends(get_current_actor), db: Session = Depends(get_db)):
  return update_portfolio_item(db, actor, item_id, payload)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_portfolio_item(item_id: int, actor = Depends(get_current_actor), db: Session = Depends(get_db)):
  delete_portfolio_item(db, actor, item_id)
  return Response(status_code=status.HTTP_204_NO_CONTENT)