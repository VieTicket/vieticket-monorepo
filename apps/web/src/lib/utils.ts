import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugifyAlias from "slugify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrencyVND(amount: number): string {
  return amount === 0 ? "Miễn phí" : vndFormatter.format(amount);
}

export function formatTimeRange(start: Date, end: Date) {
  const dateOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  } as const;
  const timeOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  } as const;

  const dateStr = start.toLocaleDateString("vi-VN", dateOptions);
  const timeStr = `${start.toLocaleTimeString("vi-VN", timeOptions)} - ${end.toLocaleTimeString("vi-VN", timeOptions)}`;

  return `${dateStr} | ${timeStr}`;
}

export function formatDateVi(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long", // e.g., Saturday
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


export function slugify(string: string, randomize: boolean = false) {
  const slug = slugifyAlias(string, { locale: 'vi', lower: true, strict: true });
  if (!randomize) {
    return slug;
  }

  return generateSlugWithSuffix(slug);
}

/**
 * Generate a slug with a time-plus-random suffix.
 * Fully Edge-safe (uses crypto.getRandomValues).
 *
 * @param baseSlug – the “human” part (e.g. "eco-toothbrush")
 * @param randChars – number of random base-36 chars to append (default: 4)
 * @returns e.g. "eco-toothbrush-kx1mz-4f7a"
 */
export function generateSlugWithSuffix(
  baseSlug: string,
  randChars: number = 4
): string {
  // 1) timestamp in base-36, e.g. "kjk3hf" (Date.now() → ms since epoch)
  const ts = Date.now().toString(36);

  // 2) secure random bytes → base-36 string
  const buf = crypto.getRandomValues(new Uint8Array(randChars));  // :contentReference[oaicite:0]{index=0}
  const rand = Array.from(buf)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, randChars);

  // 3) assemble
  return `${baseSlug}_${ts}${rand}`;
}
