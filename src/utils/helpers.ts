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

export const parseValueToTonnes = (text: string): number => {
  const match = text.match(/([\d,.]+)\s*(kg|t)/i);
  if (!match) {
    console.warn(`Unable to parse value and unit from text: "${text}". Defaulting to 0.`);
    return 0;
  }

  let value = parseFloat(match[1].replace(/,/g, ''));
  const unit = match[2].toLowerCase();

  if (isNaN(value)) {
    console.warn(`Parsed value is NaN from text: "${text}". Defaulting to 0.`);
    return 0;
  }
  if (unit === 'kg') {
    value /= 1000;
  }
  return value;
};
