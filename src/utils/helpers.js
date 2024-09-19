async function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  });
}

function formatEnergy(kWh) {
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

function formatCurrency(mwhValue, showUnit = true) {
  const unit = 'mWh';
  return `$${mwhValue.toLocaleString('en-GB', { maximumFractionDigits: 2 })}${showUnit ? ` / ${unit}` : ''}`;
}

module.exports = { delay, formatEnergy, formatCurrency };