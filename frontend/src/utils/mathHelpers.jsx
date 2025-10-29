import dayjs from "dayjs";

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const resolveLastSeenPrice = (stock) => {
  const sources = [
    stock.lastSeenPrice,
    stock.buyPrice,
    stock.last_seen_price,
    stock.buy_price,
  ];
  for (const candidate of sources) {
    const parsed = toFiniteNumber(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

export const calculateStockStats = (stock) => {
  const shares = toFiniteNumber(stock.shares) ?? 0;
  const currentPrice = toFiniteNumber(stock.currentPrice);
  const lastSeenPrice = resolveLastSeenPrice(stock);

  const totalValue =
    shares && currentPrice !== null ? shares * currentPrice : 0;

  const pl =
    shares && currentPrice !== null && lastSeenPrice !== null
      ? (currentPrice - lastSeenPrice) * shares
      : 0;

  const returnPercent =
    lastSeenPrice !== null && lastSeenPrice !== 0 && currentPrice !== null
      ? ((currentPrice - lastSeenPrice) / lastSeenPrice) * 100
      : 0;

  const isPositive = pl >= 0;

  return {
    totalValue,
    pl,
    returnPercent,
    isPositive,
    basisPrice: lastSeenPrice,
  };
};

export const calculateSharpeRatio = (portfolio) => {
  if (!portfolio || portfolio.length === 0) return 0;

  const totals = portfolio.reduce(
    (acc, stock) => {
      const shares = toFiniteNumber(stock.shares) ?? 0;
      const currentPrice = toFiniteNumber(stock.currentPrice);
      const lastSeenPrice = resolveLastSeenPrice(stock);

      if (!shares || currentPrice === null || lastSeenPrice === null) {
        return acc;
      }

      const positionValue = shares * currentPrice;
      const positionReturn =
        lastSeenPrice !== 0
          ? (currentPrice - lastSeenPrice) / lastSeenPrice
          : 0;

      acc.totalValue += positionValue;
      acc.weightedReturns.push({ value: positionValue, ret: positionReturn });
      return acc;
    },
    { totalValue: 0, weightedReturns: [] }
  );

  if (!totals.totalValue || totals.weightedReturns.length === 0) return 0;

  const weightedReturns = totals.weightedReturns.map((entry) => {
    const weight = entry.value / totals.totalValue;
    return entry.ret * weight;
  });

  const portfolioReturn = weightedReturns.reduce(
    (acc, value) => acc + value,
    0
  );
  const mean = portfolioReturn;
  const variance =
    weightedReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (weightedReturns.length || 1);
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
  return portfolio.reduce((sum, stock) => {
    const shares = toFiniteNumber(stock.shares) ?? 0;
    const basisPrice = resolveLastSeenPrice(stock);
    if (basisPrice === null) return sum;
    return sum + shares * basisPrice;
  }, 0);
};

export const calculateTotalValue = (portfolio) => {
  return portfolio.reduce((sum, stock) => {
    const { totalValue } = calculateStockStats(stock);
    if (!Number.isFinite(totalValue)) {
      return sum;
    }
    return sum + totalValue;
  }, 0);
};

export const calculateTotalPL = (portfolio) => {
  return portfolio.reduce((sum, stock) => {
    const { pl } = calculateStockStats(stock);
    if (!Number.isFinite(pl)) {
      return sum;
    }
    return sum + pl;
  }, 0);
};

export const calculateTotalReturn = (portfolio) => {
  const totalCost = calculateTotalCost(portfolio);
  if (!totalCost) return 0;
  const totalPl = calculateTotalPL(portfolio);
  return (totalPl / totalCost) * 100;
};

// const createBins = (scores, numBins = 30) => {
//   if (!scores || scores.length === 0) return [];

//   const min = Math.min(...scores);
//   const max = Math.max(...scores);
//   const binSize = (max - min) / numBins;

//   const bins = Array.from({ length: numBins }, (_, i) => ({
//     bin_start: min + i * binSize,
//     bin_end: min + (i + 1) * binSize,
//     count: 0,
//   }));

//   scores.forEach((score) => {
//     const index = Math.min(Math.floor((score - min) / binSize), numBins - 1);
//     bins[index].count += 1;
//   });

//   return bins;
// };
