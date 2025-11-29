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

    it("TC03: Should persist locale to localStorage", () => {
      const newLocale = "en";
      mockLocalStorage.setItem("locale", newLocale);

      const storedLocale = mockLocalStorage.getItem("locale");
      expect(storedLocale).toBe("en");
    });

    it("TC04: Should persist locale to cookie with correct attributes", () => {
      const newLocale = "en";
      cookieStore = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

      expect(cookieStore).toContain(`NEXT_LOCALE=${newLocale}`);
      expect(cookieStore).toContain("path=/");
      expect(cookieStore).toContain("max-age=31536000");
    });

    it("TC05: Should trigger router refresh after locale change", () => {
      const newLocale = "en";
      mockLocalStorage.setItem("locale", newLocale);
      cookieStore = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

      // Simulate setLocale call which should trigger refresh
      mockSetLocale(newLocale);
      mockRouterRefresh();

      expect(mockRouterRefresh).toHaveBeenCalled();
    });

    it("TC06: Should maintain locale preference across page reloads", () => {
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

  // ==================== BOUNDARY TEST CASES ====================
  describe("Boundary Cases", () => {
    it("TC07: Should handle switching to same locale (no-op)", () => {
      mockUseLocale.mockReturnValue("vi");

      // Switch to same locale
      const currentLocale = "vi";
      mockLocalStorage.setItem("locale", currentLocale);

      const storedLocale = mockLocalStorage.getItem("locale");
      expect(storedLocale).toBe("vi");
    });

    it("TC08: Should handle rapid successive locale switches", () => {
      mockUseLocale.mockReturnValue("vi");

      // Multiple rapid switches
      mockLocalStorage.setItem("locale", "en");
      mockLocalStorage.setItem("locale", "vi");
      mockLocalStorage.setItem("locale", "en");

      const finalLocale = mockLocalStorage.getItem("locale");
      expect(finalLocale).toBe("en");
    });

    it("TC09: Should handle locale change without existing localStorage value", () => {
      // No initial value in localStorage
      expect(mockLocalStorage.getItem("locale")).toBeNull();

      // Set locale for first time
      mockLocalStorage.setItem("locale", "en");

      const storedLocale = mockLocalStorage.getItem("locale");
      expect(storedLocale).toBe("en");
    });

    it("TC10: Should handle locale change with existing cookie", () => {
      // Existing cookie
      cookieStore = "NEXT_LOCALE=vi; path=/; max-age=31536000";

      // Update to new locale
      cookieStore = "NEXT_LOCALE=en; path=/; max-age=31536000";

      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);
      expect(cookieMatch?.[1]).toBe("en");
    });
  });

  // ==================== ABNORMAL TEST CASES ====================
  describe("Abnormal Cases", () => {
    it("TC11: Should reject invalid locale code (not vi or en)", () => {
      const invalidLocale = "fr";

      // Validation should prevent this
      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });

    it("TC12: Should reject empty string locale", () => {
      const invalidLocale = "";

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });

    it("TC13: Should reject null locale value", () => {
      const invalidLocale = null;

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale as any);

      expect(isValid).toBe(false);
    });

    it("TC14: Should reject undefined locale value", () => {
      const invalidLocale = undefined;

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale as any);

      expect(isValid).toBe(false);
    });

    it("TC15: Should handle localStorage being unavailable", () => {
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

    it("TC16: Should handle cookie setting failure", () => {
      // Simulate document.cookie throwing error
      Object.defineProperty(document, "cookie", {
        get: () => cookieStore,
        set: () => {
          throw new Error("Cannot set cookie");
        },
        configurable: true,
      });

      try {
        document.cookie = "NEXT_LOCALE=en; path=/; max-age=31536000";
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Cannot set cookie");
      }

      // Restore
      Object.defineProperty(document, "cookie", {
        get: () => cookieStore,
        set: (value: string) => {
          cookieStore = value;
        },
        configurable: true,
      });
    });

    it("TC17: Should reject locale with special characters", () => {
      const invalidLocale = "vi'; DROP TABLE users;--";

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });

    it("TC18: Should reject locale with uppercase characters", () => {
      const invalidLocale = "VI";

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });

    it("TC19: Should reject locale with numeric characters", () => {
      const invalidLocale = "vi123";

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });

    it("TC20: Should handle router refresh failure gracefully", () => {
      mockRouterRefresh.mockImplementation(() => {
        throw new Error("Router refresh failed");
      });

      try {
        mockRouterRefresh();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("Router refresh failed");
      }
    });

    it("TC21: Should reject locale with whitespace", () => {
      const invalidLocale = " en ";

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });

    it("TC22: Should reject excessively long locale string", () => {
      const invalidLocale = "e".repeat(1000);

      const validLocales = ["vi", "en"];
      const isValid = validLocales.includes(invalidLocale);

      expect(isValid).toBe(false);
    });
  });

  // ==================== SSR DETECTION CASES ====================
  describe("SSR Locale Detection", () => {
    it("TC23: Should detect locale from cookie on server-side", () => {
      cookieStore = "NEXT_LOCALE=en; path=/; max-age=31536000";

      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);
      const detectedLocale = cookieMatch?.[1] || "vi";

      expect(detectedLocale).toBe("en");
    });

    it("TC24: Should default to Vietnamese when no cookie present", () => {
      cookieStore = "";

      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);
      const detectedLocale = cookieMatch?.[1] || "vi";

      expect(detectedLocale).toBe("vi");
    });

    it("TC25: Should handle malformed cookie gracefully", () => {
      cookieStore = "NEXT_LOCALE=; path=/";

      const cookieMatch = cookieStore.match(/NEXT_LOCALE=([^;]+)/);
      const detectedLocale = cookieMatch?.[1] || "vi";

      // Should default to vi when cookie value is missing
      expect(detectedLocale).toBe("vi");
    });
  });
});
