import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrencyVND(amount: number): string {
  return amount === 0 ? "Miễn phí" : vndFormatter.format(amount);
}

export function formatTimeRange(start: Date, end: Date) {
  const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' } as const;
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true } as const;

  const dateStr = start.toLocaleDateString("en-US", dateOptions);
  const timeStr = `${start.toLocaleTimeString("en-US", timeOptions)} - ${end.toLocaleTimeString("en-US", timeOptions)}`;

  return `${dateStr} | ${timeStr}`;
}