export function formatCurrency(amount: number, symbol = "₹"): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const formatted = rounded.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function formatCompactCurrency(amount: number, symbol = "₹"): string {
  if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount, symbol);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
