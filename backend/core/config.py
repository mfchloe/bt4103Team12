import os
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  """Application configuration loaded from environment variables."""

  database_url: str = Field(
    default="sqlite:///./app.db",
    env="DATABASE_URL",
    description="SQLAlchemy compatible database URL.",
  )
  secret_key: str = Field(
    default="change-me-secret-key",
    env="SECRET_KEY",
    description="Secret key used for signing JWT tokens.",
  )
  access_token_expire_minutes: int = Field(
    default=60,
    env="ACCESS_TOKEN_EXPIRE_MINUTES",
    description="Lifetime of access tokens in minutes.",
  )
  refresh_token_expire_minutes: int = Field(
    default=60 * 24 * 7,
    env="REFRESH_TOKEN_EXPIRE_MINUTES",
    description="Lifetime of refresh tokens in minutes.",
  )
  google_client_id: str = Field(
    default="",
    env="GOOGLE_CLIENT_ID",
    description="OAuth client ID for Google Sign-In.",
  )
  apple_client_id: str = Field(
    default="",
    env="APPLE_CLIENT_ID",
    description="Service ID configured for Sign in with Apple on the web.",
  )

  model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
    case_sensitive=False,
  )


@lru_cache()
def get_settings() -> Settings:
  return Settings()


settings = get_settings()
