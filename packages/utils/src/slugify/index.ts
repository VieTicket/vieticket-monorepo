import slugifyAlias from "slugify"


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
  return `${baseSlug}_${ts}-${rand}`;
}
