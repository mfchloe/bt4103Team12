import os
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  """Application configuration loaded from environment variables."""

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
  firebase_project_id: str = Field(
    default="",
    env="FIREBASE_PROJECT_ID",
    description="Firebase project ID for admin SDK.",
  )
  firebase_credentials_file: str = Field(
    default="",
    env="FIREBASE_CREDENTIALS_FILE",
    description="Path to Firebase service account JSON.",
  )
  firebase_api_key: str = Field(
    default="",
    env="FIREBASE_API_KEY",
    description="Web API key used for Identity Toolkit calls.",
  )
  firestore_users_collection: str = Field(
    default="users",
    env="FIRESTORE_USERS_COLLECTION",
    description="Firestore collection storing user documents.",
  )
  firestore_portfolio_collection: str = Field(
    default="portfolio",
    env="FIRESTORE_PORTFOLIO_COLLECTION",
    description="Sub-collection name under each user for portfolio items.",
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
