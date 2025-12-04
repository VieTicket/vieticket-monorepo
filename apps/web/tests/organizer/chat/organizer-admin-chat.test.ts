
import { describe, expect, it, beforeEach, mock } from "bun:test";

// Mock database and external dependencies FIRST
mock.module("@neondatabase/serverless", () => ({
  Pool: class Pool {
    constructor() {}
  },
}));

mock.module("drizzle-orm/neon-serverless", () => ({
  drizzle: () => ({}),
}));

// Mock Stream Chat SDK
const mockStreamChannel = {
  create: mock(() => Promise.resolve()),
};

const mockStreamClient = {
  channel: mock(() => mockStreamChannel),
  upsertUsers: mock(() => Promise.resolve()),
};

mock.module("stream-chat", () => ({
  StreamChat: {
    getInstance: mock(() => mockStreamClient),
  },
}));

// Mock user repository
const mockGetUserById = mock();
const mockDoesUserExist = mock();
mock.module("@vieticket/repos/users", () => ({
  getUserById: mockGetUserById,
  doesUserExist: mockDoesUserExist,
  createUser: mock(),
  updateUser: mock(),
}));

// Mock auth session
const mockGetAuthSession = mock();
mock.module("@/lib/auth/auth", () => ({
  getAuthSession: mockGetAuthSession,
  auth: {},
}));

// Mock Stream token generation
const mockGenerateStreamToken = mock();
mock.module("@/lib/stream-utils", () => ({
  generateStreamToken: mockGenerateStreamToken,
}));

// Mock Next.js headers
mock.module("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
}));

// Set environment variables for tests
process.env.NEXT_PUBLIC_STREAM_API_KEY = "test-api-key";
process.env.STREAM_API_SECRET = "test-api-secret";

// Import after mocks
const { createChatRoom, getStreamToken } = await import(
  "@/lib/actions/chat-actions"
);

describe("Organizer-Admin Chat (UC-CHAT-001)", () => {
  beforeEach(() => {
    mockGetAuthSession.mockClear();
    mockGetUserById.mockClear();
    mockDoesUserExist.mockClear();
    mockGenerateStreamToken.mockClear();
    mockStreamClient.channel.mockClear();
    mockStreamClient.upsertUsers.mockClear();
    mockStreamChannel.create.mockClear();

    // Default valid organizer session
    mockGetAuthSession.mockResolvedValue({
      user: {
        id: "org-user-123",
        email: "organizer@example.com",
        role: "organizer",
        name: "Test Organizer",
        image: "https://example.com/avatar.jpg",
      },
      session: {
        userId: "org-user-123",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    mockGenerateStreamToken.mockResolvedValue("mock-stream-token-123");
  });

  // ==================== NORMAL TEST CASES ====================
  describe("Normal Cases", () => {
    it("TC01: Should successfully create chat room when organizer initiates chat with admin", async () => {
      const channelId = await createChatRoom("admin");

      expect(channelId).toBeDefined();
      expect(channelId).toBe("admin-org-user-123"); // Sorted alphabetically
      expect(mockStreamClient.upsertUsers).toHaveBeenCalledWith([
        {
          id: "org-user-123",
          name: "Test Organizer",
          image: "https://example.com/avatar.jpg",
        },
        {
          id: "admin",
          name: "Admin",
          role: "admin",
        },
      ]);
      expect(mockStreamClient.channel).toHaveBeenCalledWith(
        "messaging",
        "admin-org-user-123",
        {
          members: ["org-user-123", "admin"],
          created_by_id: "org-user-123",
        }
      );
      expect(mockStreamChannel.create).toHaveBeenCalled();
    });

    it("TC02: Should successfully create chat room when admin initiates chat with organizer", async () => {
      mockGetAuthSession.mockResolvedValue({
        user: {
          id: "admin-001",
          email: "admin@vieticket.com",
          role: "admin",
          name: "Admin User",
          image: "https://example.com/admin.jpg",
        },
        session: {
          userId: "admin-001",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      mockGetUserById.mockResolvedValue({
        id: "org-user-456",
        name: "Target Organizer",
        email: "target@example.com",
        role: "organizer",
        image: "https://example.com/target.jpg",
      });

      const channelId = await createChatRoom("org-user-456");

      expect(channelId).toBe("admin-org-user-456"); // Admin uses 'admin' as ID
      expect(mockGetUserById).toHaveBeenCalledWith("org-user-456");
      expect(mockStreamClient.upsertUsers).toHaveBeenCalled();
      expect(mockStreamChannel.create).toHaveBeenCalled();
    });

    it("TC03: Should generate correct Stream token for organizer", async () => {
      const token = await getStreamToken();

      expect(token).toBe("mock-stream-token-123");
      expect(mockGenerateStreamToken).toHaveBeenCalledWith({
        id: "org-user-123",
        email: "organizer@example.com",
        role: "organizer",
        name: "Test Organizer",
        image: "https://example.com/avatar.jpg",
      });
    });

    it("TC04: Should generate correct Stream token for admin user", async () => {
      mockGetAuthSession.mockResolvedValue({
        user: {
          id: "admin-001",
          email: "admin@vieticket.com",
          role: "admin",
          name: "Admin User",
        },
        session: {
          userId: "admin-001",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const token = await getStreamToken();

      expect(token).toBe("mock-stream-token-123");
      expect(mockGenerateStreamToken).toHaveBeenCalledWith({
        id: "admin", // Admin should use 'admin' as Stream ID
        email: "admin@vieticket.com",
        role: "admin",
        name: "Admin User",
      });
    });

    it("TC05: Should create consistent channel ID regardless of who initiates", async () => {
      // First: Organizer creates chat with admin
      const channelId1 = await createChatRoom("admin");

      // Reset mocks
      mockStreamClient.channel.mockClear();
      mockStreamChannel.create.mockClear();

      // Second: Simulate admin creating chat with same organizer
      mockGetAuthSession.mockResolvedValue({
        user: {
          id: "admin-001",
          email: "admin@vieticket.com",
          role: "admin",
          name: "Admin User",
        },
        session: {
          userId: "admin-001",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      mockGetUserById.mockResolvedValue({
        id: "org-user-123",
        name: "Test Organizer",
        email: "organizer@example.com",
        role: "organizer",
      });

      const channelId2 = await createChatRoom("org-user-123");

      // Both should produce the same channel ID
      expect(channelId1).toBe(channelId2);
      expect(channelId1).toBe("admin-org-user-123");
    });

    it("TC06: Should successfully upsert users with complete information including images", async () => {
      mockGetAuthSession.mockResolvedValue({
        user: {
          id: "org-full-info",
          email: "full@example.com",
          role: "organizer",
          name: "Full Info Organizer",
          image: "https://example.com/full.jpg",
        },
        session: {
          userId: "org-full-info",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      await createChatRoom("admin");

      expect(mockStreamClient.upsertUsers).toHaveBeenCalledWith([
        {
          id: "org-full-info",
          name: "Full Info Organizer",
          image: "https://example.com/full.jpg",
        },
        {
          id: "admin",
          name: "Admin",
          role: "admin",
        },
      ]);
      expect(mockStreamChannel.create).toHaveBeenCalled();
    });

    it("TC07: Should handle organizer with Vietnamese name and characters", async () => {
      mockGetAuthSession.mockResolvedValue({
        user: {
          id: "org-vn-123",
          email: "nguyen@example.com",
          role: "organizer",
          name: "Nguyễn Văn A",
          image: "https://example.com/nguyen.jpg",
        },
        session: {
          userId: "org-vn-123",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const channelId = await createChatRoom("admin");

      expect(channelId).toBe("admin-org-vn-123");
      expect(mockStreamClient.upsertUsers).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "org-vn-123",
            name: "Nguyễn Văn A",
          }),
        ])
      );
      expect(mockStreamChannel.create).toHaveBeenCalled();
    });
  });

  // ==================== BOUNDARY TEST CASES ====================
  describe("Boundary Cases", () => {
    it("TC08: Should handle user without profile image", async () => {
      mockGetAuthSession.mockResolvedValue({
        user: {
          id: "org-no-img",
          email: "noimage@example.com",
          role: "organizer",
          name: "No Image User",
          image: null,
        },
        session: {
          userId: "org-no-img",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const channelId = await createChatRoom("admin");

      expect(channelId).toBe("admin-org-no-img");
      expect(mockStreamClient.upsertUsers).toHaveBeenCalledWith([
        {
          id: "org-no-img",
          name: "No Image User",
          image: undefined,
        },
        {
          id: "admin",
          name: "Admin",
          role: "admin",
        },
      ]);
      expect(mockStreamChannel.create).toHaveBeenCalled();
    });
  });

  // ==================== ABNORMAL TEST CASES ====================
  describe("Abnormal Cases", () => {
    it("TC09: Should throw error when user is not authenticated", async () => {
      mockGetAuthSession.mockResolvedValue(null);

      await expect(createChatRoom("admin")).rejects.toThrow("Unauthenticated");
      expect(mockStreamClient.channel).not.toHaveBeenCalled();
    });

    it("TC10: Should throw error when recipient user does not exist in database", async () => {
      mockGetUserById.mockResolvedValue(null);

      await expect(createChatRoom("non-existent-user")).rejects.toThrow(
        "Recipient user does not exist"
      );
      expect(mockStreamClient.channel).not.toHaveBeenCalled();
    });
  });
});
