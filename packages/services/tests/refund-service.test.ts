import { describe, expect, it, mock, beforeEach } from "bun:test";

mock.module("@vieticket/db/pg", () => ({
  db: {
    transaction: async (fn: any) => fn({}),
  },
}));

// Mock repo dependencies for approveRefund
const mockGetRefundDetail = mock();
const mockUpdateRefundRecord = mock();

mock.module("@vieticket/repos/refunds", () => ({
  getRefundDetail: mockGetRefundDetail,
  updateRefundRecord: mockUpdateRefundRecord,
  markRefundProcessing: mock(() =>
    Promise.resolve({ id: "mock-refund", status: "processing" })
  ),
  findBlockingRefundTickets: mock(() => Promise.resolve([])),
  getExistingRefundsForOrder: mock(() => Promise.resolve([])),
  getOrderRefundContext: mock(() => Promise.resolve(null)),
  getOrderTicketsForRefund: mock(() => Promise.resolve([])),
  insertRefundWithTickets: mock(() => Promise.resolve({})),
  sumRefundAmountsForOrder: mock(() => Promise.resolve(0)),
  updateTicketsStatus: mock(() => Promise.resolve()),
  releaseSeatHoldsForTickets: mock(() => Promise.resolve()),
  // Unused exports in this test suite
  listRefundsForAdmin: mock(() => []),
  listRefundsForCustomer: mock(() => []),
  listRefundsForOrganizer: mock(() => []),
}));

mock.module("@vieticket/repos/orders", () => ({
  updateOrderStatus: mock(() => Promise.resolve()),
}));

mock.module("@vieticket/utils/finance/refund-psp", () => ({
  executeRefundWithPSP: mock(() =>
    Promise.resolve({ success: true, reference: "mock-ref" })
  ),
}));

const { calculateRefundAmount, approveRefund } = await import(
  "../src/refund-service"
);

describe("refund calculator", () => {
  it("calculates 80% for personal refunds >=168h before event start", () => {
    const startTime = new Date("2025-02-10T10:00:00Z");
    const requestedAt = new Date("2025-02-01T10:00:00Z");
    const result = calculateRefundAmount({
      reason: "personal",
      orderTotal: 500000,
      selectedTickets: [{ price: 200000 }, { price: 200000 }],
      startTime,
      requestedAt,
    });
    expect(result.percentageApplied).toBe(80);
    expect(result.amount).toBe(320000);
  });

  it("calculates 60% for personal refunds between 120h and 168h of event start", () => {
    const startTime = new Date("2025-02-10T10:00:00Z");
    const requestedAt = new Date("2025-02-04T10:00:00Z");
    const result = calculateRefundAmount({
      reason: "personal",
      orderTotal: 500000,
      selectedTickets: [{ price: 150000 }],
      startTime,
      requestedAt,
    });
    expect(result.percentageApplied).toBe(60);
    expect(result.amount).toBe(90000);
  });

  it("throws for personal refunds inside 120h window", () => {
    const startTime = new Date("2025-02-10T10:00:00Z");
    const requestedAt = new Date("2025-02-09T10:00:00Z");
    expect(() =>
      calculateRefundAmount({
        reason: "personal",
        orderTotal: 500000,
        selectedTickets: [{ price: 100000 }],
        startTime,
        requestedAt,
      })
    ).toThrow();
  });

  it("uses 90% for postponed events", () => {
    const result = calculateRefundAmount({
      reason: "event_postponed",
      orderTotal: 300000,
      selectedTickets: [],
      requestedAt: new Date(),
    });
    expect(result.percentageApplied).toBe(90);
    expect(result.amount).toBe(270000);
  });
});

describe("approve refund", () => {
  beforeEach(() => {
    mockGetRefundDetail.mockReset();
    mockUpdateRefundRecord.mockReset();
  });

  it("applies admin override with allowed percentages", async () => {
    mockGetRefundDetail.mockResolvedValue({
      refund: {
        id: "r1",
        reason: "personal",
        status: "pending_admin",
        organizerId: "org-1",
        amount: 100000,
        baseAmount: 200000,
        percentageApplied: 50,
        orderId: "o1",
        totalAmount: 200000,
        userId: "u1",
      },
      tickets: [],
    });
    mockUpdateRefundRecord.mockResolvedValue({
      id: "r1",
      amount: 160000,
      percentageApplied: 80,
      status: "approved",
    });

    const result = await approveRefund(
      { id: "admin-1", role: "admin" } as any,
      "r1",
      { percentage: 80, reason: "Escalated override" }
    );

    expect(result?.amount).toBe(160000);
    expect(mockUpdateRefundRecord.mock.calls.length).toBe(1);
  });
});
