from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers import yfinance_controller
from controllers import far_controller
from controllers import sentiment_controller
from controllers import auth_controller, far_controller, portfolio_controller, yfinance_controller
from database import Base, engine
import logging
import uvicorn
import nltk

def ensure_vader():
    try:
        nltk.data.find('sentiment/vader_lexicon.zip')
    except LookupError:
        nltk.download('vader_lexicon', quiet=True)

# configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="Stock Portfolio API",
    description="API for managing stock portfolio with real-time price data from Yahoo Finance",
    version="1.0.0"
)

# configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],   # react devs (vite is 5173)
    allow_origin_regex=r"https?://localhost(:\d+)?",  # allow any localhost port during dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    ensure_vader()

# ROUTERS HERE
# include routers
app.include_router(auth_controller.router)
app.include_router(portfolio_controller.router)
app.include_router(yfinance_controller.router)
app.include_router(far_controller.router)
app.include_router(sentiment_controller.router)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Stock Portfolio API with real-time Yahoo Finance data is running"
    }

@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "service": "Stock Portfolio API",
        "data_source": "Yahoo Finance (yfinance)",
        "version": "1.0.0"
    }

# uvicorn main:app --reload --port 8000
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
