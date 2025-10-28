import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def ensure_portfolio_owner_columns(engine: Engine) -> None:
    """Backfill owner_type/owner_key columns for legacy SQLite databases."""
    try:
        with engine.begin() as connection:
            inspector = inspect(connection)
            if "portfolio_items" not in inspector.get_table_names():
                return

            existing_columns = {column["name"] for column in inspector.get_columns("portfolio_items")}

            if "owner_type" not in existing_columns:
                logger.info("Adding owner_type column to portfolio_items table")
                connection.execute(text("ALTER TABLE portfolio_items ADD COLUMN owner_type VARCHAR"))
                connection.execute(text("UPDATE portfolio_items SET owner_type = 'app' WHERE owner_type IS NULL"))
                existing_columns.add("owner_type")

            if "owner_key" not in existing_columns:
                logger.info("Adding owner_key column to portfolio_items table")
                connection.execute(text("ALTER TABLE portfolio_items ADD COLUMN owner_key VARCHAR"))
                connection.execute(
                    text("UPDATE portfolio_items SET owner_key = COALESCE(CAST(user_id AS TEXT), '') WHERE owner_key IS NULL")
                )
                existing_columns.add("owner_key")

            if "owner_type" in existing_columns:
                connection.execute(text("UPDATE portfolio_items SET owner_type = 'app' WHERE owner_type IS NULL"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_portfolio_items_owner_type ON portfolio_items(owner_type)"))

            if "owner_key" in existing_columns:
                connection.execute(text("UPDATE portfolio_items SET owner_key = COALESCE(owner_key, '')"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_portfolio_items_owner_key ON portfolio_items(owner_key)"))
    except Exception:
        logger.exception("Failed to ensure portfolio_items owner columns are present")
