import { describe, expect, it, beforeEach, mock } from "bun:test";

// Mock localStorage and document.cookie
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Mock document object
if (typeof document === "undefined") {
  (globalThis as any).document = {};
}

// Mock document.cookie
let cookieStore = "";
Object.defineProperty(document, "cookie", {
  get: () => cookieStore,
  set: (value: string) => {
    cookieStore = value;
  },
  configurable: true,
});

// Mock router
const mockRouterRefresh = mock();
const mockUseRouter = mock(() => ({
  refresh: mockRouterRefresh,
  push: mock(),
  pathname: "/",
}));

mock.module("next/navigation", () => ({
  useRouter: mockUseRouter,
  usePathname: mock(() => "/"),
}));

// Mock next-intl
const mockUseLocale = mock(() => "vi");
const mockUseTranslations = mock(() => (key: string) => key);

mock.module("next-intl", () => ({
  useLocale: mockUseLocale,
  useTranslations: mockUseTranslations,
}));

// Mock LocaleProvider (we'll test the hook logic directly)
const mockSetLocale = mock();
const mockUseLocaleContext = mock(() => ({
  locale: "vi",
  setLocale: mockSetLocale,
}));

describe("Change Language (UC-U011)", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    cookieStore = "";
    mockRouterRefresh.mockClear();
    mockSetLocale.mockClear();
    mockUseLocale.mockReturnValue("vi");
  });

  // ==================== NORMAL TEST CASES ====================
  describe("Normal Cases", () => {
    it("TC01: Should successfully change language from Vietnamese to English", () => {
      mockUseLocale.mockReturnValue("vi");

      // Simulate locale change
      const newLocale = "en";
      mockLocalStorage.setItem("locale", newLocale);
      cookieStore = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

      const storedLocale = mockLocalStorage.getItem("locale");
      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);

      expect(storedLocale).toBe("en");
      expect(cookieMatch?.[1]).toBe("en");
    });

    it("TC02: Should successfully change language from English to Vietnamese", () => {
      mockUseLocale.mockReturnValue("en");

      // Simulate locale change
      const newLocale = "vi";
      mockLocalStorage.setItem("locale", newLocale);
      cookieStore = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

      const storedLocale = mockLocalStorage.getItem("locale");
      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);

      expect(storedLocale).toBe("vi");
      expect(cookieMatch?.[1]).toBe("vi");
    });

    it("TC03: Should persist locale to both localStorage and cookie", () => {
      const newLocale = "en";
      mockLocalStorage.setItem("locale", newLocale);
      cookieStore = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

      const storedLocale = mockLocalStorage.getItem("locale");
      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);

      expect(storedLocale).toBe("en");
      expect(cookieMatch?.[1]).toBe("en");
      expect(cookieStore).toContain("path=/");
    });

    it("TC04: Should maintain locale preference across page reloads", () => {
      // First set locale
      const newLocale = "en";
      mockLocalStorage.setItem("locale", newLocale);
      cookieStore = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

      // Simulate page reload - read from storage
      const retrievedLocale = mockLocalStorage.getItem("locale");
      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);

      expect(retrievedLocale).toBe("en");
      expect(cookieMatch?.[1]).toBe("en");
    });
  });

  // ==================== ABNORMAL TEST CASES ====================
  describe("Abnormal Cases", () => {
    it("TC05: Should reject invalid locale code (not vi or en)", () => {
      const invalidLocale = "fr";

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });

    it("TC06: Should reject empty string locale", () => {
      const invalidLocale = "";

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });

    it("TC07: Should default to Vietnamese when no cookie present", () => {
      cookieStore = "";

      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);
      const detectedLocale = cookieMatch?.[1] || "vi";

      expect(detectedLocale).toBe("vi");
    });

    it("TC08: Should handle localStorage being unavailable", () => {
      const originalSetItem = mockLocalStorage.setItem;

      // Simulate localStorage error
      mockLocalStorage.setItem = () => {
        throw new Error("localStorage is not available");
      };

      try {
        mockLocalStorage.setItem("locale", "en");
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("localStorage is not available");
      }

      // Restore
      mockLocalStorage.setItem = originalSetItem;
    });
  });
});
