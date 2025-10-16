import dayjs from "dayjs";

export const calculateStockStats = (stock) => {
  if (stock.currentPrice === null || stock.currentPrice === undefined) {
    return {
      totalValue: null,
      pl: null,
      returnPercent: null,
      isPositive: false,
    };
  }

  const totalValue = stock.shares * stock.currentPrice;
  const totalCost = stock.shares * stock.buyPrice;
  const pl = totalValue - totalCost;
  const returnPercent = (pl / totalCost) * 100;
  const isPositive = pl >= 0;

  return { totalValue, pl, returnPercent, isPositive };
};

export const calculateSharpeRatio = (portfolio) => {
  if (!portfolio || portfolio.length === 0) return 0;

  const totalValue = portfolio.reduce(
    (sum, stock) => sum + stock.currentPrice * stock.shares,
    0
  );

  if (!totalValue) return 0;

  const weightedReturns = portfolio.map((stock) => {
    const buyPrice = Number(stock.buyPrice);
    const currentPrice = Number(stock.currentPrice);
    if (!buyPrice || !currentPrice) return 0;

    const weight = (currentPrice * stock.shares) / totalValue;
    const dailyReturn = (currentPrice - buyPrice) / buyPrice;
    return dailyReturn * weight;
  });

  const portfolioReturn = weightedReturns.reduce((acc, value) => acc + value, 0);
  const mean = portfolioReturn;
  const variance =
    weightedReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    weightedReturns.length;
  const volatility = Math.sqrt(variance);

  if (!volatility) return 0;

  const riskFreeRate = 0;
  return (portfolioReturn - riskFreeRate) / volatility;
};

export const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "N/A";
  }
  return `$${numeric.toFixed(2)}`;
};

export const formatPercentage = (value, isPositive) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "N/A";
  }
  return `${isPositive ? "+" : ""}${numeric.toFixed(2)}%`;
};

export const formatDate = (value) => {
  if (!value) {
    return "--";
  }
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return "--";
  }
  return parsed.format("MMM D, YYYY");
};

export const calculateTotalCost = (portfolio) => {
  return portfolio.reduce(
    (sum, stock) => sum + stock.shares * stock.buyPrice,
    0
  );
};

export const calculateTotalValue = (portfolio) => {
  return portfolio.reduce((sum, stock) => {
    if (stock.currentPrice === null || stock.currentPrice === undefined) {
      return sum;
    }
    return sum + stock.shares * stock.currentPrice;
  }, 0);
};

export const calculateTotalPL = (portfolio) => {
  return calculateTotalValue(portfolio) - calculateTotalCost(portfolio);
};

export const calculateTotalReturn = (portfolio) => {
  const totalCost = calculateTotalCost(portfolio);
  if (totalCost === 0) return 0;
  return ((calculateTotalValue(portfolio) - totalCost) / totalCost) * 100;
};
