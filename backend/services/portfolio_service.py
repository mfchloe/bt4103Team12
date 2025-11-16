import hashlib
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd
from fastapi import HTTPException, status

from core.config import settings
from core.firebase_app import get_firestore_client
from schemas import PortfolioItemCreate, PortfolioItemUpdate
from services import far_service
from services.dataset_time_series_service import DatasetTimeSeriesService

dataset_service = DatasetTimeSeriesService()


def _portfolio_collection(actor):
    if actor.mode != "app":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Portfolio operations are available only for Firebase users.",
        )
    client = get_firestore_client()
    return (
        client.collection(settings.firestore_users_collection)
        .document(actor.id)
        .collection(settings.firestore_portfolio_collection)
    )


def _deserialize_firestore_item(doc_id: str, data: dict) -> dict:
    created_at = data.get("created_at")
    updated_at = data.get("updated_at")
    buy_date_value = data.get("buy_date")
    if isinstance(buy_date_value, str):
        try:
            buy_date = datetime.fromisoformat(buy_date_value).date()
        except ValueError:
            buy_date = None
    else:
        buy_date = buy_date_value

    return {
        "id": doc_id,
        "symbol": data.get("symbol"),
        "name": data.get("name"),
        "shares": float(data.get("shares", 0.0)),
        "buy_price": float(data.get("buy_price", 0.0)),
        "buy_date": buy_date,
        "current_price": data.get("current_price"),
        "created_at": created_at,
        "updated_at": updated_at,
        "total_buy_value": data.get("total_buy_value"),
        "total_sell_value": data.get("total_sell_value"),
        "realized_pl": data.get("realized_pl"),
        "remaining_cost": data.get("remaining_cost"),
        "synthetic": False,
        "last_seen_price": data.get("last_seen_price"),
        "last_seen_date": data.get("last_seen_date"),
        "isin": data.get("isin"),
    }


def _get_firestore_item(actor, item_id: str):
    collection = _portfolio_collection(actor)
    doc_ref = collection.document(str(item_id))
    snapshot = doc_ref.get()
    if not snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio item not found",
        )
    return doc_ref, snapshot.to_dict()


def _parse_timestamp(value) -> Optional[datetime]:
  if value is None:
    return None
  if isinstance(value, datetime):
    return value
  if hasattr(value, "to_pydatetime"):
    try:
      return value.to_pydatetime()
    except Exception:
      value = str(value)
  if not isinstance(value, str):
    return None
  value = value.strip()
  if not value:
    return None
  try:
    return datetime.fromisoformat(value)
  except ValueError:
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d", "%d-%m-%Y"):
      try:
        return datetime.strptime(value, fmt)
      except ValueError:
        continue
  return None


def _make_synthetic_id(key: str) -> str:
  """Return a deterministic synthetic ID that is always a string for schema compatibility."""
  try:
    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()
    return f"synthetic_{digest[:16]}"
  except Exception:
    return f"synthetic_{abs(hash(key))}"


def _list_far_customer_portfolio(customer_id: str) -> List[Dict]:
  dfs = far_service.load_dataframes()
  tx_df = dfs.get("transactions")

  if tx_df is None or tx_df.empty or "customerID" not in tx_df.columns:
    return []

  tx_df = tx_df[tx_df["customerID"] == customer_id].copy()
  if tx_df.empty:
    return []

  date_col = next((col for col in ["timestamp", "date", "txn_date", "transaction_date"] if col in tx_df.columns), None)
  if date_col:
    tx_df[date_col] = pd.to_datetime(tx_df[date_col], errors="coerce")
    cutoff = pd.Timestamp("2022-10-29")
    tx_df = tx_df[(tx_df[date_col].isna()) | (tx_df[date_col] <= cutoff)]
    tx_df.sort_values(date_col, inplace=True)

  positions: Dict[str, Dict[str, float]] = {}

  for row in tx_df.itertuples():
    isin = str(getattr(row, "ISIN", "")).strip()
    if not isin:
      continue

    entry = positions.setdefault(
      isin,
      {
        "position": 0.0,
        "cost_basis": 0.0,
        "realized_pl": 0.0,
        "total_buy_qty": 0.0,
        "total_buy_value": 0.0,
        "total_sell_qty": 0.0,
        "total_sell_value": 0.0,
        "first_buy_at": None,
        "first_tx_at": None,
        "last_tx_at": None,
        "last_price": None,
      },
    )

    qty_raw = getattr(row, "units", None)
    try:
      qty = float(qty_raw)
    except (TypeError, ValueError):
      qty = 0.0
    if qty <= 0:
      continue

    total_value_raw = getattr(row, "totalValue", None)
    try:
      total_value = float(total_value_raw)
    except (TypeError, ValueError):
      total_value = 0.0

    timestamp_value = getattr(row, date_col) if date_col else None
    timestamp = _parse_timestamp(timestamp_value)
    price_per_unit = total_value / qty if qty else None

    if timestamp:
      if entry["first_tx_at"] is None or timestamp < entry["first_tx_at"]:
        entry["first_tx_at"] = timestamp
      if entry["last_tx_at"] is None or timestamp > entry["last_tx_at"]:
        entry["last_tx_at"] = timestamp
        if price_per_unit is not None:
          entry["last_price"] = price_per_unit
      elif price_per_unit is not None and timestamp == entry["last_tx_at"]:
        entry["last_price"] = price_per_unit
    elif entry["first_tx_at"] is None:
      now = datetime.utcnow()
      entry["first_tx_at"] = now
      entry["last_tx_at"] = now
      if price_per_unit is not None:
        entry["last_price"] = price_per_unit
    elif price_per_unit is not None:
      entry["last_price"] = price_per_unit

    tx_type = str(getattr(row, "transactionType", "")).strip().lower()
    if tx_type == "sell":
      if entry["position"] <= 0:
        continue

      avg_cost = entry["cost_basis"] / entry["position"] if entry["position"] else 0.0
      shares_to_reduce = min(qty, entry["position"])

      entry["position"] -= shares_to_reduce
      entry["cost_basis"] -= avg_cost * shares_to_reduce
      if entry["cost_basis"] < 0 and abs(entry["cost_basis"]) < 1e-6:
        entry["cost_basis"] = 0.0
      sell_price = price_per_unit if price_per_unit is not None else 0.0
      entry["realized_pl"] += (sell_price - avg_cost) * shares_to_reduce
      entry["total_sell_qty"] += qty
      entry["total_sell_value"] += total_value
    else:
      entry["position"] += qty
      entry["cost_basis"] += total_value
      if timestamp and (entry["first_buy_at"] is None or timestamp < entry["first_buy_at"]):
        entry["first_buy_at"] = timestamp
      entry["total_buy_qty"] += qty
      entry["total_buy_value"] += total_value

  items: List[Dict] = []

  for isin, data in positions.items():
    position = data["position"]
    net_shares = data["total_buy_qty"] - data["total_sell_qty"]
    if net_shares < 0:
      net_shares = 0.0
    total_buy_qty = data["total_buy_qty"]
    total_sell_qty = data["total_sell_qty"]
    if net_shares <= 0 and total_buy_qty <= 0 and total_sell_qty <= 0:
      continue

    asset_info = dataset_service.get_asset_info_by_isin(isin)
    symbol = asset_info.get("symbol") if asset_info else isin
    name = asset_info.get("name") if asset_info else symbol

    latest_price = None
    if symbol:
      latest_price = dataset_service.get_latest_price_for_symbol(symbol)
      if latest_price is None:
        latest_price = dataset_service.get_latest_price_for_symbol(isin)
    if latest_price is None and total_sell_qty > 0:
      latest_price = data["total_sell_value"] / total_sell_qty if total_sell_qty else None

    if net_shares > 0:
      avg_cost = data["cost_basis"] / net_shares if net_shares else 0.0
    elif total_buy_qty > 0:
      avg_cost = data["total_buy_value"] / total_buy_qty
    else:
      avg_cost = 0.0

    last_seen_date = data["last_tx_at"].date() if data["last_tx_at"] else None
    buy_date = last_seen_date
    created_at = data["first_tx_at"] or datetime.utcnow()
    updated_at = data["last_tx_at"] or created_at
    if hasattr(created_at, "to_pydatetime"):
      created_at = created_at.to_pydatetime()
    if hasattr(updated_at, "to_pydatetime"):
      updated_at = updated_at.to_pydatetime()

    items.append(
      {
        "id": _make_synthetic_id(isin),
        "symbol": symbol or isin,
        "name": name or (symbol or isin),
        "shares": float(net_shares),
        "buy_price": float(avg_cost),
        "buy_date": buy_date,
        "current_price": latest_price,
        "created_at": created_at,
        "updated_at": updated_at,
        "total_buy_value": float(data["total_buy_value"]),
        "total_sell_value": float(data["total_sell_value"]),
        "realized_pl": float(data["realized_pl"]),
        "remaining_cost": float(data["cost_basis"]),
        "synthetic": True,
        "last_seen_price": float(data["last_price"]) if data["last_price"] is not None else None,
        "last_seen_date": last_seen_date.isoformat() if last_seen_date else None,
      }
    )

  items.sort(key=lambda item: item["created_at"] or datetime.utcnow())
  return items


def list_portfolio_items(actor) -> List[Dict]:
  if actor.mode == "far_customer":
    return _list_far_customer_portfolio(actor.customer_id)

  collection = _portfolio_collection(actor)
  snapshots = collection.order_by("created_at").stream()
  items: List[Dict] = []
  for doc in snapshots:
    data = doc.to_dict() or {}
    items.append(_deserialize_firestore_item(doc.id, data))
  return items


def create_portfolio_item(actor, data: PortfolioItemCreate):
  if actor.mode != "app":
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="Portfolio operations are unavailable for dataset accounts.",
    )

  collection = _portfolio_collection(actor)
  now = datetime.utcnow()
  symbol = data.symbol.upper()
  payload = {
    "owner_type": "app",
    "owner_key": actor.id,
    "symbol": symbol,
    "name": data.name or symbol,
    "shares": float(data.shares),
    "buy_price": float(data.buy_price),
    "buy_date": data.buy_date.isoformat() if data.buy_date else None,
    "current_price": data.current_price,
    "created_at": now,
    "updated_at": now,
    "total_buy_value": float(data.shares * data.buy_price),
    "synthetic": False,
    "last_seen_price": data.current_price,
    "last_seen_date": (data.buy_date.isoformat() if data.buy_date else None),
  }
  doc_ref = collection.document()
  doc_ref.set(payload)
  return _deserialize_firestore_item(doc_ref.id, payload)


def update_portfolio_item(actor, item_id: str, data: PortfolioItemUpdate):
  doc_ref, existing = _get_firestore_item(actor, item_id)
  updates = data.model_dump(exclude_unset=True)
  if not updates:
    return _deserialize_firestore_item(doc_ref.id, existing)

  processed: Dict[str, object] = {}
  for field, value in updates.items():
    if field == "buy_date" and value is not None:
      processed[field] = value.isoformat()
    else:
      processed[field] = value
  processed["updated_at"] = datetime.utcnow()
  if "shares" in processed or "buy_price" in processed:
    shares = float(processed.get("shares", existing.get("shares", 0)))
    price = float(processed.get("buy_price", existing.get("buy_price", 0)))
    processed["total_buy_value"] = shares * price

  doc_ref.update(processed)
  existing.update(processed)
  return _deserialize_firestore_item(doc_ref.id, existing)


def delete_portfolio_item(actor, item_id: str) -> None:
  doc_ref, _ = _get_firestore_item(actor, item_id)
  doc_ref.delete()
