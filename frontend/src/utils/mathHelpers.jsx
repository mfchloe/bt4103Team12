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
