const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrencyVND(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return vndFormatter.format(Math.round(amount));
}
