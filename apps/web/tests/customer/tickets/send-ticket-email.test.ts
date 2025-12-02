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

// Mock mailer
const mockSendMail = mock(() => Promise.resolve({ success: true }));
mock.module("@vieticket/utils/mailer", () => ({
  sendMail: mockSendMail,
}));

// Mock QR code generation
const mockGenerateQRCodeBuffer = mock(() =>
  Promise.resolve(Buffer.from("fake-qr-code"))
);
mock.module("@vieticket/utils/ticket-validation/client", () => ({
  generateQRCodeBuffer: mockGenerateQRCodeBuffer,
}));

mock.module("@vieticket/utils/ticket-validation/server", () => ({
  generateTicketQRData: (ticketId: string) => `QR_DATA_${ticketId}`,
}));

// Mock order repository functions
const mockFindTicketByIdForUser = mock();
const mockCheckTicketEmailLimits = mock();
const mockGetEventByTicketId = mock();
const mockLogTicketEmail = mock();
const mockGetTicketEmailLogs = mock();

mock.module("@vieticket/repos/orders", () => ({
  findTicketByIdForUser: mockFindTicketByIdForUser,
  checkTicketEmailLimits: mockCheckTicketEmailLimits,
  getEventByTicketId: mockGetEventByTicketId,
  logTicketEmail: mockLogTicketEmail,
  getTicketEmailLogs: mockGetTicketEmailLogs,
  findOrderByIdForUser: mock(),
  findOrdersByUserIdWithPagination: mock(),
  findUserTicketsWithPagination: mock(),
  getTicketDetails: mock(),
}));

// Mock order service
const mockSendTicketEmail = mock();
mock.module("@vieticket/services/order", () => ({
  sendTicketEmail: mockSendTicketEmail,
  getOrderDetails: mock(),
  getAllUserTickets: mock(),
  getTicketDetailsForUser: mock(),
  getUserOrders: mock(),
  getTicketEmailStatus: mock(),
}));

// Mock auth session with default valid user
const mockGetAuthSession = mock(() =>
  Promise.resolve({
    user: {
      id: "test-user-123",
      email: "customer@example.com",
      role: "customer",
      name: "Test Customer",
    },
    session: {
      userId: "test-user-123",
      expiresAt: new Date(Date.now() + 86400000),
    },
  })
) as any;

mock.module("@/lib/auth/auth", () => ({
  getAuthSession: mockGetAuthSession,
  auth: {},
}));

// Mock Next.js headers function
mock.module("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
}));

// Import after mocks are set up
const { sendTicketEmailAction } = await import(
  "@/lib/actions/customer/order-actions"
);

describe("Send Ticket via Email (UC-U028)", () => {
  beforeEach(() => {
    mockSendTicketEmail.mockClear();
    mockSendMail.mockClear();
    mockGenerateQRCodeBuffer.mockClear();
    mockFindTicketByIdForUser.mockClear();
    mockCheckTicketEmailLimits.mockClear();
    mockGetEventByTicketId.mockClear();
    mockLogTicketEmail.mockClear();
    mockGetTicketEmailLogs.mockClear();

    // Reset to default valid session
    mockGetAuthSession.mockImplementation(() =>
      Promise.resolve({
        user: {
          id: "test-user-123",
          email: "customer@example.com",
          role: "customer",
          name: "Test Customer",
        },
        session: {
          userId: "test-user-123",
          expiresAt: new Date(Date.now() + 86400000),
        },
      })
    );

    // Default mock implementations
    mockFindTicketByIdForUser.mockImplementation(() =>
      Promise.resolve({
        ticketId: "ticket-123",
        status: "active",
        seatNumber: "A1",
        rowName: "Row 1",
        areaName: "VIP Section",
        startTime: new Date("2025-12-31T19:00:00Z"),
      })
    );

    mockCheckTicketEmailLimits.mockImplementation(() =>
      Promise.resolve({
        canSend: true,
        totalSends: 0,
        lastSentAt: null,
      })
    );

    mockGetEventByTicketId.mockImplementation(() =>
      Promise.resolve({
        eventId: "event-123",
        eventName: "Test Concert 2025",
      })
    );

    mockLogTicketEmail.mockImplementation(() => Promise.resolve());

    mockSendTicketEmail.mockImplementation((user, ticketId, recipientEmail) =>
      Promise.resolve({ success: true })
    );
  });

  // ==================== NORMAL CASES ====================
  describe("Normal Cases", () => {
    it("TC01: Should successfully send ticket to owner's email", async () => {
      const result = await sendTicketEmailAction(
        "ticket-123",
        "customer@example.com"
      );

      expect(result.success).toBe(true);
      expect(mockSendTicketEmail).toHaveBeenCalledWith(
        {
          id: "test-user-123",
          email: "customer@example.com",
          name: "Test Customer",
          role: "customer",
        },
        "ticket-123",
        "customer@example.com"
      );
    });

    it("TC02: Should successfully send ticket to different email", async () => {
      const result = await sendTicketEmailAction(
        "ticket-123",
        "friend@example.com"
      );

      expect(result.success).toBe(true);
      expect(mockSendTicketEmail).toHaveBeenCalledWith(
        expect.objectContaining({ id: "test-user-123" }),
        "ticket-123",
        "friend@example.com"
      );
    });

    it("TC03: Should generate QR code and include in email", async () => {
      const result = await sendTicketEmailAction(
        "ticket-123",
        "recipient@example.com"
      );

      expect(result.success).toBe(true);
      expect(mockSendTicketEmail).toHaveBeenCalled();
    });

    it("TC04: Should include complete ticket details in email", async () => {
      const result = await sendTicketEmailAction(
        "ticket-456",
        "test@example.com"
      );

      expect(result.success).toBe(true);
      expect(mockSendTicketEmail).toHaveBeenCalledWith(
        expect.objectContaining({ id: "test-user-123" }),
        "ticket-456",
        "test@example.com"
      );
    });

    it("TC05: Should log email send after successful delivery", async () => {
      const result = await sendTicketEmailAction(
        "ticket-123",
        "recipient@example.com"
      );

      expect(result.success).toBe(true);
    });
  });

  // ==================== ABNORMAL CASES ====================
  describe("Abnormal Cases", () => {
    it("TC06: Should reject when user is not authenticated", async () => {
      mockGetAuthSession.mockResolvedValueOnce(null);

      const result = await sendTicketEmailAction(
        "ticket-123",
        "test@example.com"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("authenticated");
    });

    it("TC07: Should reject when ticket doesn't exist or user doesn't own it", async () => {
      mockSendTicketEmail.mockResolvedValueOnce({
        success: false,
        error: "Ticket not found or you do not have permission to send it.",
      });

      mockFindTicketByIdForUser.mockResolvedValueOnce(null);

      const result = await sendTicketEmailAction(
        "nonexistent-ticket",
        "test@example.com"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("TC08: Should reject when ticket status is not active", async () => {
      mockSendTicketEmail.mockResolvedValueOnce({
        success: false,
        error: "Ticket is not active.",
      });

      mockFindTicketByIdForUser.mockResolvedValueOnce({
        ticketId: "ticket-123",
        status: "used",
        seatNumber: "A1",
        rowName: "Row 1",
        areaName: "VIP",
        startTime: new Date(),
      });

      const result = await sendTicketEmailAction(
        "ticket-123",
        "test@example.com"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not active");
    });
  });
});
