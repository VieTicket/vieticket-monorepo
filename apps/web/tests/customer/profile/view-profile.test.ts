/**
 * ================================================================
 * TEST FILE: View Customer Profile (UC-U026)
 * ================================================================
 * Purpose: Test user profile viewing functionality
 * Function: getProfileAction
 * File: apps/web/src/lib/actions/profile-actions.ts
 * 
 * Business Rules:
 * - Only authenticated users can view their profile
 * - Customer profiles show basic information (name, email, dateOfBirth, gender, phone, image)
 * - Organizer profiles show additional business details (organizer name, website, address, foundedDate, organizerType)
 * - Profile data must be retrieved from database
 * - Support Vietnamese Unicode characters
 * - BANNED users should NOT be able to access profile (SECURITY)
 * - Age requirement: 18+ (LEGAL COMPLIANCE)
 * 
 * Test Coverage:
 * - Normal Cases: 4 test cases
 * - Boundary Cases: 5 test cases  
 * - Abnormal Cases: 12 test cases (includes 4 BUG detection tests)
 * - Total: 21 test cases
 * 
 * 🐛 BUG DETECTION:
 * - TC18-20: Will FAIL - Exposes critical security bugs with banned users
 * - TC21: Will PASS - But highlights legal compliance issue (under-18 access)
 * ================================================================
 */

import { describe, expect, it, beforeEach, mock } from "bun:test";

// Mock database and external dependencies
mock.module("@neondatabase/serverless", () => ({
  Pool: class Pool {
    constructor() {}
  },
}));

mock.module("drizzle-orm/neon-serverless", () => ({
  drizzle: () => ({}),
}));

// Mock auth session
const mockGetSession = mock(() =>
  Promise.resolve({
    user: {
      id: "test-user-123",
      email: "test@example.com",
      role: "customer",
      name: "Test User",
    },
  })
) as any;

mock.module("@/lib/auth/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

// Mock Next.js headers
mock.module("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
}));

// Mock database query
const mockFindFirst = mock();
const mockDb = {
  query: {
    user: {
      findFirst: mockFindFirst,
    },
    organizers: {
      findFirst: mock(),
    },
  },
};

mock.module("@vieticket/db/pg", () => ({
  db: mockDb,
}));

mock.module("@vieticket/db/pg/schema", () => ({
  GENDER_VALUES: ["male", "female", "other"] as const,
  organizers: {},
  user: {},
}));

// Import after mocks
const { getProfileAction } = await import("@/lib/actions/profile-actions");

describe("View Profile (UC-U026)", () => {
  beforeEach(() => {
    mockGetSession.mockClear();
    mockFindFirst.mockClear();
    mockDb.query.organizers.findFirst.mockClear();

    // Reset to default customer session
    mockGetSession.mockImplementation(() =>
      Promise.resolve({
        user: {
          id: "test-user-123",
          email: "test@example.com",
          role: "customer",
          name: "Test User",
        },
      })
    );
  });

  // ==================== NORMAL TEST CASES ====================
  describe("Normal Cases", () => {
    it("TC01: Should successfully retrieve customer profile with basic information", async () => {
      const mockUserData = {
        id: "test-user-123",
        name: "John Doe",
        email: "john@example.com",
        dateOfBirth: "1990-05-15",
        gender: "Male",
        phone: "0912345678",
        image: "https://res.cloudinary.com/demo/avatar.jpg",
        banned: false,
        banReason: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("John Doe");
      expect(result.data?.email).toBe("john@example.com");
      expect(result.data?.phone).toBe("0912345678");
      expect(result.data?.gender).toBe("Male");
      expect(result.data?.organizer).toBeNull();
    });

    it("TC02: Should successfully retrieve organizer profile with business details", async () => {
      mockGetSession.mockImplementation(() =>
        Promise.resolve({
          user: {
            id: "organizer-123",
            email: "organizer@example.com",
            role: "organizer",
            name: "Event Company",
          },
        })
      );

      const mockUserData = {
        id: "organizer-123",
        name: "Jane Smith",
        email: "organizer@example.com",
        dateOfBirth: "1985-08-20",
        gender: "Female",
        phone: "0987654321",
        image: "https://res.cloudinary.com/demo/organizer.jpg",
        banned: false,
        banReason: null,
      };

      const mockOrganizerData = {
        id: "organizer-123",
        name: "Event Company Ltd",
        website: "https://eventcompany.com",
        address: "123 Main Street, Hanoi",
        foundedDate: new Date("2010-01-01"),
        organizerType: "company",
        isActive: true,
        rejectionReason: null,
        rejectionSeen: null,
        rejectedAt: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);
      mockDb.query.organizers.findFirst.mockResolvedValue(mockOrganizerData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Jane Smith");
      expect(result.data?.organizer?.name).toBe("Event Company Ltd");
      expect(result.data?.organizer?.website).toBe("https://eventcompany.com");
      expect(result.data?.organizer?.address).toBe("123 Main Street, Hanoi");
    });

    it("TC03: Should handle profile with Vietnamese Unicode characters", async () => {
      const mockUserData = {
        id: "test-user-123",
        name: "Nguyễn Văn Ảnh",
        email: "nguyen@example.com",
        dateOfBirth: "1995-03-10",
        gender: "Male",
        phone: "0901234567",
        image: null,
        banned: false,
        banReason: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Nguyễn Văn Ảnh");
      expect(result.data?.email).toBe("nguyen@example.com");
    });

    it("TC04: Should retrieve profile with all optional fields populated", async () => {
      const mockUserData = {
        id: "test-user-123",
        name: "Complete User",
        email: "complete@example.com",
        dateOfBirth: "1992-12-25",
        gender: "Other",
        phone: "0923456789",
        image: "https://res.cloudinary.com/demo/complete.jpg",
        banned: false,
        banReason: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.dateOfBirth).toBe("1992-12-25");
      expect(result.data?.gender).toBe("Other");
      expect(result.data?.phone).toBe("0923456789");
      expect(result.data?.image).toBeTruthy();
    });
  });

  // ==================== BOUNDARY TEST CASES ====================
  describe("Boundary Cases", () => {
    it("TC05: Should handle profile with minimal required fields only", async () => {
      const mockUserData = {
        id: "test-user-123",
        name: "Minimal User",
        email: "minimal@example.com",
        dateOfBirth: null,
        gender: null,
        phone: null,
        image: null,
        banned: false,
        banReason: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Minimal User");
      expect(result.data?.dateOfBirth).toBeNull();
      expect(result.data?.gender).toBeNull();
      expect(result.data?.phone).toBeNull();
    });

    it("TC06: Should handle organizer without optional organizer fields", async () => {
      mockGetSession.mockImplementation(() =>
        Promise.resolve({
          user: {
            id: "organizer-456",
            email: "basic@organizer.com",
            role: "organizer",
            name: "Basic Organizer",
          },
        })
      );

      const mockUserData = {
        id: "organizer-456",
        name: "Basic Organizer",
        email: "basic@organizer.com",
        dateOfBirth: null,
        gender: null,
        phone: null,
        image: null,
        banned: false,
        banReason: null,
      };

      const mockOrganizerData = {
        id: "organizer-456",
        name: "Basic Event Co",
        website: null,
        address: null,
        foundedDate: null,
        organizerType: null,
        isActive: false,
        rejectionReason: null,
        rejectionSeen: null,
        rejectedAt: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);
      mockDb.query.organizers.findFirst.mockResolvedValue(mockOrganizerData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.organizer?.name).toBe("Basic Event Co");
      expect(result.data?.organizer?.website).toBeNull();
      expect(result.data?.organizer?.address).toBeNull();
    });

    it("TC07: Should handle name at maximum length (255 characters)", async () => {
      const longName = "A".repeat(255);
      const mockUserData = {
        id: "test-user-123",
        name: longName,
        email: "long@example.com",
        dateOfBirth: null,
        gender: null,
        phone: null,
        image: null,
        banned: false,
        banReason: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(longName);
      expect(result.data?.name.length).toBe(255);
    });

    it("TC08: Should handle oldest valid birth date (1900-01-01)", async () => {
      const mockUserData = {
        id: "test-user-123",
        name: "Old User",
        email: "old@example.com",
        dateOfBirth: "1900-01-01",
        gender: "Male",
        phone: null,
        image: null,
        banned: false,
        banReason: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.dateOfBirth).toBe("1900-01-01");
    });

    it("TC09: Should handle minimum age birth date (18 years old)", async () => {
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      const dateString = eighteenYearsAgo.toISOString().split('T')[0];

      const mockUserData = {
        id: "test-user-123",
        name: "Young User",
        email: "young@example.com",
        dateOfBirth: dateString,
        gender: "Female",
        phone: null,
        image: null,
        banned: false,
        banReason: null,
      };

      mockFindFirst.mockResolvedValue(mockUserData);

      const result = await getProfileAction();

      expect(result.success).toBe(true);
      expect(result.data?.dateOfBirth).toBe(dateString);
    });
  });

  // ==================== ABNORMAL TEST CASES ====================
  describe("Abnormal Cases", () => {
    it("TC10: Should return error when user is not authenticated (no session)", async () => {
      mockGetSession.mockResolvedValue(null as any);

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthenticated");
    });

    it("TC11: Should return error when session has no user object", async () => {
      mockGetSession.mockResolvedValue({ user: null } as any);

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthenticated");
    });

    it("TC12: Should return error when user profile does not exist", async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("User not found");
    });

    it("TC13: Should handle database connection failure", async () => {
      mockFindFirst.mockRejectedValue(new Error("Database connection failed"));

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database connection failed");
    });

    it("TC14: Should handle service timeout error", async () => {
      mockFindFirst.mockRejectedValue(new Error("Query timeout"));

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("timeout");
    });

    it("TC15: Should handle corrupted session data (null user ID)", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          id: null,
          email: "test@example.com",
          role: "customer",
          name: "Test",
        },
      } as any);

      mockFindFirst.mockResolvedValue(null);

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("TC16: Should handle empty user ID in session", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          id: "",
          email: "test@example.com",
          role: "customer",
          name: "Test",
        },
      } as any);

      mockFindFirst.mockResolvedValue(null);

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("User not found");
    });

    it("TC17: Should handle unexpected service error", async () => {
      mockFindFirst.mockRejectedValue(new Error("Unexpected database error"));

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("TC18: 🐛 BUG - Banned user should NOT be able to view profile (CRITICAL)", async () => {
      // Real-world: Ticketmaster, Eventbrite block banned users completely
      const bannedUser = {
        id: "banned-user-123",
        name: "Banned User",
        email: "banned@example.com",
        dateOfBirth: "1990-01-01",
        gender: "Male",
        phone: "0912345678",
        image: null,
        banned: true, // ❌ USER IS BANNED
        banReason: "Fraudulent activity detected",
      };

      mockFindFirst.mockResolvedValue(bannedUser);

      const result = await getProfileAction();

      // ❌ CURRENT BUG: Returns success for banned user
      // ✅ EXPECTED: Should return error
      console.log("🐛 BUG DETECTED - Banned user got access:", result.success);
      expect(result.success).toBe(false); // Will FAIL - exposes the bug
      expect(result.error).toContain("banned");
    });

    it("TC19: 🐛 BUG - Fraud user with banReason should be blocked (CRITICAL)", async () => {
      const fraudUser = {
        id: "fraud-user-123",
        name: "Fraud User",
        email: "fraud@example.com",
        dateOfBirth: "1985-01-01",
        gender: "Female",
        phone: null,
        image: null,
        banned: true,
        banReason: "Multiple chargebacks and payment fraud",
      };

      mockFindFirst.mockResolvedValue(fraudUser);

      const result = await getProfileAction();

      // ❌ BUG: Fraud user can access profile
      console.log("🐛 BUG - Fraud user banReason:", fraudUser.banReason);
      expect(result.success).toBe(false); // Will FAIL
      expect(result.error).toContain("fraud");
    });

    it("TC20: 🐛 BUG - Banned organizer should NOT access system (SECURITY)", async () => {
      mockGetSession.mockImplementation(() =>
        Promise.resolve({
          user: {
            id: "banned-org-123",
            email: "banned@organizer.com",
            role: "organizer",
            name: "Banned Organizer",
          },
        })
      );

      const bannedOrganizerUser = {
        id: "banned-org-123",
        name: "Banned Event Co",
        email: "banned@organizer.com",
        dateOfBirth: null,
        gender: null,
        phone: null,
        image: null,
        banned: true,
        banReason: "Fake events and ticket scams",
      };

      const organizerData = {
        id: "banned-org-123",
        name: "Scam Events Ltd",
        website: null,
        address: null,
        foundedDate: null,
        organizerType: null,
        isActive: false,
        rejectionReason: "Fraudulent business practices",
        rejectionSeen: null,
        rejectedAt: new Date("2024-01-15"),
      };

      mockFindFirst.mockResolvedValue(bannedOrganizerUser);
      mockDb.query.organizers.findFirst.mockResolvedValue(organizerData);

      const result = await getProfileAction();

      // ❌ CRITICAL BUG: Banned organizer can still access
      console.log("🐛 BUG - Banned organizer accessed system");
      expect(result.success).toBe(false); // Will FAIL
      expect(result.error).toContain("banned");
    });

    it("TC21: ⚠️ WARNING - Under-18 user can access (LEGAL RISK)", async () => {
      const today = new Date();
      const under18Date = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
      const dateString = under18Date.toISOString().split('T')[0];

      const under18User = {
        id: "underage-user",
        name: "Young User",
        email: "young@example.com",
        dateOfBirth: dateString, // Only 17 years old!
        gender: "Male",
        phone: "0901234567",
        image: null,
        banned: false,
        banReason: null,
      };

      mockFindFirst.mockResolvedValue(under18User);

      const result = await getProfileAction();

      // ⚠️ WARNING: Under-18 access allowed (legal requirement: 18+)
      console.log("⚠️  Under-18 user (age 17) accessed profile - Legal risk!");
      
      // For now, this passes but it's a legal compliance issue
      expect(result.success).toBe(true);
      if (result.data?.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(result.data.dateOfBirth).getFullYear();
        console.log("⚠️  User age:", age, "- Should require 18+");
      }
    });
  });
});
