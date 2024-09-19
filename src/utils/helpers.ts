export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
