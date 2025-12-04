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

    it("TC05: Should block banned user from viewing profile", async () => {
      const bannedUser = {
        id: "banned-user-123",
        name: "Banned User",
        email: "banned@example.com",
        dateOfBirth: "1990-01-01",
        gender: "Male",
        phone: "0912345678",
        image: null,
        banned: true,
        banReason: "Fraudulent activity detected",
      };

      mockFindFirst.mockResolvedValue(bannedUser);

      const result = await getProfileAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Access denied");
    });

    it("TC06: Should block fraud user with banReason", async () => {
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

      expect(result.success).toBe(false);
      expect(result.error).toContain("Access denied");
    });

    it("TC07: Should block banned organizer from accessing system", async () => {
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

      expect(result.success).toBe(false);
      expect(result.error).toContain("Access denied");
    });
  });

