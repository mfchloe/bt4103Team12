# BT4103 Team 12: AI Powered Asset Recommender

An integrated AI-powered investment decision-support system that empowers retail investors to navigate complex financial markets with personalized recommendations, portfolio optimization, and predictive analytics.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Test Customer IDs](#test-customer-ids)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technologies Used](#technologies-used)

## Overview

Modern retail investors face significant challenges: information overload from thousands of global stocks, complexity in portfolio construction, limited personalization, and lack of predictive tools. Our application addresses these challenges by consolidating financial analysis, behavioral insights, and machine learning into a single, intuitive platform.

Built on the Far Trans dataset (2018-2022), the system combines multiple recommendation models (content-based filtering, LSTM, and neural collaborative filtering), Markowitz-based portfolio optimization, time-series forecasting, and customer segmentation to deliver tailored investment guidance.

## Demo Video

Watch our demo video to see the key features and workflow:

📹 [Capstone Demo.MOV](./Capstone%20Demo.MOV)

## Getting Started

### Prerequisites
- Node.js and npm (for frontend)
- Python 3.8+ (for backend)
- Far Trans dataset (datasets.zip)

### Frontend Setup

1. Navigate to the frontend directory:
```bash
   cd frontend
```

2. Install dependencies (only required on first setup):
```bash
   npm install
```

3. Start the development server:
```bash
   npm run dev
```

### Backend Setup

1. Navigate to the backend directory:
```bash
   cd backend
```

2. Download the datasets folder here ([`datasets.zip`](https://drive.google.com/uc?export=download&id=19LH_mcoqJzXPLJM0f-g2glhNUINl6Ae4)) and extract it into the backend folder. The folder structure should be:
```
   backend/
   └── datasets/
```

3. Create and activate a Python virtual environment:
```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
```

4. Install dependencies (only required on first setup):
```bash
   pip install -r requirements.txt
```

5. Run the FastAPI server:
```bash
   uvicorn main:app
```

The application should now be running locally. Access the frontend at the URL provided by the development server (typically `http://localhost:5173`).

## Test Customer IDs

To facilitate testing with existing Far Trans customers, use the following Customer IDs:

| Account Type | Customer ID | Cluster |
|-------------|-------------|---------|
| FAR customer | `DD35198E5AFDB753ED0D` | Whale |
| FAR customer | `76B29C004869FC2BCFFB` | Browser |
| FAR customer | `DD1E7FA6C74787F13EC7` | Core |

These IDs allow you to explore the system with pre-existing transaction histories and behavioral profiles.


## Key Features

### Portfolio Dashboard
- **Real-time Portfolio Management**: View and manage your current holdings with live valuations
- **Add/Remove Assets**: Simulate different portfolio compositions with instant metric updates
- **AI-Powered Recommendations**: Get personalized stock suggestions based on your profile, trading history, and risk appetite
- **Portfolio Optimization**: Generate optimal asset allocations using Markowitz optimization with either target return or maximum risk constraints
- **Performance Metrics**: Track total value, P&L, returns, and Sharpe ratio
- **Interactive Visualizations**: Portfolio allocation pie chart, P&L by stock, and returns analysis

### Investor Behavior Dashboard
- **Population-Level Analytics**: Explore trading patterns across the entire Far Trans dataset
- **Dynamic Filtering**: Filter by customer clusters (Whales, Core, Browsers), customer type, risk level, and investment capacity
- **Multi-Tab Views**:
  - **Trading Behavior**: Investor type distributions, trading activity, and customer trends
  - **Asset & Industry**: Category breakdowns, risk-return profiles, and top assets
  - **Affinity Overview**: Customer similarity matrix and behavioral correlations

### Time-Series & News Insights
- **Price History Analysis**: Compare historical price movements across multiple stocks
- **ARIMA-Based Forecasting**: View 7-day and 30-day price predictions
- **Sentiment Analysis**: AI-generated sentiment scores based on recent news
- **Interactive Selection**: Add/remove stocks dynamically to compare trends and volatility

### Transactions Page
- **Complete Transaction History**: View all past buy and sell transactions from the Far Trans dataset
- **Search Functionality**: Quickly find transactions by stock symbol
- **Visual Analytics**:
  - Cumulative investment amount over time
  - Buy/sell activity distribution (pie and bar charts)
  - Top 5 most actively traded stocks

### Profile & Quiz
- **Onboarding Quiz**: New users complete a brief questionnaire to establish their investment profile
- **Profile Management**: Update preferences at any time:
  - Trading style (aggressive, moderate, conservative)
  - Risk tolerance (high, medium, low)
  - Diversification preference
  - Investment capacity
  - Trader type (mass or premium)
- **Dynamic Clustering**: Profile updates automatically refresh your behavioral segment and recommendation strategy

## System Architecture

The application follows a three-layer web architecture:

### Frontend (Web Client)
- Single-page application built with modern web technologies
- Handles authentication, profile management, and all interactive visualizations
- Responsive design for seamless user experience

### Backend (Application & API Layer)
- RESTful API built with FastAPI
- Manages user authentication, portfolio operations, and transaction handling
- Orchestrates calls to ML models and data services
- Serves aggregated statistics and forecasts

### Data & ML Layer
- **Data Storage**: Cleaned Far Trans tables (customers, transactions, markets, asset information, prices)
- **Customer Segmentation**: Pre-computed behavioral clusters (Whales, Core, Browsers)
- **Recommendation Models**: Content-based filtering, LSTM, and hybrid neural collaborative filtering
- **Forecasting Models**: ARIMA-based price prediction and risk-adjusted scoring

## Technologies Used

### Frontend
- React.js
- Modern CSS frameworks
- Interactive charting libraries

### Backend
- FastAPI
- Python data science stack (pandas, numpy, scikit-learn)
- PyTorch (for neural network models)
- pmdarima (for ARIMA forecasting)
- cvxpy (for portfolio optimization)

### Machine Learning
- Content-Based Filtering
- LSTM (Long Short-Term Memory networks)
- Hybrid Neural Collaborative Filtering
- ARIMA time-series forecasting
- K-means clustering for customer segmentation


