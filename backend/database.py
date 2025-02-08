import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import urlparse, urlunparse

# Get PostgreSQL connection URL from .env
DATABASE_URL = os.getenv("DB_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file")

# Remove sslmode if present in the URL (asyncpg does not support it as a query parameter)
parsed_url = urlparse(DATABASE_URL)
query_params = parsed_url.query.split("&")
filtered_query_params = [param for param in query_params if not param.startswith("sslmode")]
new_query = "&".join(filtered_query_params)
DATABASE_URL = urlunparse(parsed_url._replace(query=new_query))

# Create async engine for PostgreSQL
engine = create_async_engine(DATABASE_URL, echo=True)

# Create async session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

# Base class for models
Base = declarative_base()

# Dependency function for database session
async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()  # Ensure session is properly closed
