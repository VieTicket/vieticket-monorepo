export const formatNumber = (
  value: number,
  isFloat: boolean = false
): string => {
  if (isFloat) {
    // For floats, round to 3 decimal places to avoid precision issues
    const rounded = Math.round(value * 1000) / 1000;
    const str = rounded.toString();
    return str.replace(/^0+(?=\d)/, "") || "0";
  } else {
    // For integers, always round to avoid floating point display issues
    const rounded = Math.round(value);
    const str = rounded.toString();
    return str.replace(/^0+(?=\d)/, "") || "0";
  }
};

export const parseNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};
