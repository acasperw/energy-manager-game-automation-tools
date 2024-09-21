export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

export function formatEnergy(kWh: number): string {
  const absKWh = Math.abs(kWh);
  let value, unit;

  if (absKWh >= 1000000) {
    value = kWh / 1000000;
    unit = 'GWh';
  } else if (absKWh >= 1000) {
    value = kWh / 1000;
    unit = 'MWh';
  } else {
    value = kWh;
    unit = 'KWh';
  }
  return `${value.toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${unit}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
