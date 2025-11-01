import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // Get locale from various sources
  const headersList = await headers();
  const cookieStore = await cookies();
  
  // Try to get locale from:
  // 1. Headers (for explicit locale switching)
  // 2. Cookies (for persistence)
  // 3. Accept-Language header (browser preference)
  // 4. Default to Vietnamese
  let locale = 
    headersList.get('X-NEXT-INTL-LOCALE') || 
    cookieStore.get('locale')?.value ||
    'vi';

  // Validate locale
  const validLocales = ['en', 'vi'];
  if (!validLocales.includes(locale)) {
    locale = 'vi';
  }

  // Import messages for the locale
  const messages = (await import(`../lib/locales/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});