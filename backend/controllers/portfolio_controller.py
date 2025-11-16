from typing import List

from fastapi import APIRouter, Depends, Response, status

from dependencies import get_current_actor
from schemas import PortfolioItemCreate, PortfolioItemOut, PortfolioItemUpdate
from services.portfolio_service import (
  create_portfolio_item,
  delete_portfolio_item,
  list_portfolio_items,
  update_portfolio_item,
)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/", response_model=List[PortfolioItemOut])
def get_portfolio(actor = Depends(get_current_actor)):
  return list_portfolio_items(actor)


@router.post("/", response_model=PortfolioItemOut, status_code=status.HTTP_201_CREATED)
def add_portfolio_item(payload: PortfolioItemCreate, actor = Depends(get_current_actor)):
  return create_portfolio_item(actor, payload)


@router.put("/{item_id}", response_model=PortfolioItemOut)
def update_portfolio(item_id: str, payload: PortfolioItemUpdate, actor = Depends(get_current_actor)):
  return update_portfolio_item(actor, item_id, payload)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_portfolio_item(item_id: str, actor = Depends(get_current_actor)):
  delete_portfolio_item(actor, item_id)
  return Response(status_code=status.HTTP_204_NO_CONTENT)
