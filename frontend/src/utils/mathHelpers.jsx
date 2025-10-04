export const calculateStockStats = (stock) => {
  const totalValue = stock.shares * stock.currentPrice;
  const totalCost = stock.shares * stock.buyPrice;
  const pl = totalValue - totalCost;
  const returnPercent =
    ((stock.currentPrice - stock.buyPrice) / stock.buyPrice) * 100;
  const isPositive = pl >= 0;
  return { totalValue, totalCost, pl, returnPercent, isPositive };
};

export const formatCurrency = (value) => `$${value.toFixed(2)}`;

export const formatPercentage = (value, isPositive) =>
  `${isPositive ? "+" : ""}${value.toFixed(2)}%`;

/**
 * Calculate the total value of a portfolio
 * @param {Array} portfolio - array of stock objects with shares and currentPrice
 * @returns {number} total portfolio value
 */
export const calculateTotalValue = (portfolio) => {
  return portfolio.reduce(
    (sum, stock) => sum + stock.shares * stock.currentPrice,
    0
  );
};

/**
 * Calculate the total cost of a portfolio
 * @param {Array} portfolio - array of stock objects with shares and buyPrice
 * @returns {number} total invested cost
 */
export const calculateTotalCost = (portfolio) => {
  return portfolio.reduce(
    (sum, stock) => sum + stock.shares * stock.buyPrice,
    0
  );
};

/**
 * Calculate P&L for a portfolio
 * @param {Array} portfolio - array of stock objects
 * @returns {number} profit or loss
 */
export const calculateTotalPL = (portfolio) => {
  return calculateTotalValue(portfolio) - calculateTotalCost(portfolio);
};

/**
 * Calculate total return (%) for a portfolio
 * @param {Array} portfolio - array of stock objects
 * @returns {number} total return percentage
 */
export const calculateTotalReturn = (portfolio) => {
  const totalCost = calculateTotalCost(portfolio);
  if (totalCost === 0) return 0;
  return ((calculateTotalValue(portfolio) - totalCost) / totalCost) * 100;
};
