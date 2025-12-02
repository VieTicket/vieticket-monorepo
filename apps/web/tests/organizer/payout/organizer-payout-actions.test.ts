/**
 * Unit Test Cases for Organizer Payout Request Actions
 * Function Code: payout-request-actions.ts
 * Created By: Test Developer
 * Lines of Code (for tested function): ~9
 *
 * Functions under test:
 * - getPayoutRequests(page?: number, limit?: number)
 *
 * Test goals:
 * - Ensure organizer authentication is required
 * - Validate pagination parameters (page, limit → offset)
 * - Ensure service function is called with correct parameters
 * - Validate error handling when user is not logged in
 * - Validate behavior when service throws an error
 *
 * Test Coverage Summary:
 * Normal Cases: 3 test cases (50%)
 * Boundary Cases: 1 test case (17%)
 * Abnormal Cases: 2 test cases (33%)
 * Total: 6 test cases
 */

import { describe, test, expect, beforeEach, afterEach, mock, afterAll } from "bun:test";

// Mock dependencies
const mockGetAuthSession = mock().mockResolvedValue({
  user: {
    id: "organizer-user-id",
    role: "organizer",
    email: "organizer@test.com",
  },
});

const mockHeaders = mock().mockResolvedValue({});

const mockGetPayoutRequestsService = mock().mockResolvedValue({
  data: [
    {
      id: "payout-1",
      eventId: "event-1",
      amount: 1000000,
      status: "pending",
    },
  ],
  totalCount: 1,
  totalPages: 1,
});

// Mock console.error để tránh log lỗi ồn khi test abnormal cases
const originalConsoleError = console.error;
const mockConsoleError = mock();
console.error = mockConsoleError as any;

// Restore console.error sau tất cả test
afterAll(() => {
  console.error = originalConsoleError;
});

// Mock modules BEFORE importing the functions under test
mock.module("@/lib/auth/auth", () => ({
  getAuthSession: mockGetAuthSession,
}));

mock.module("next/headers", () => ({
  headers: mockHeaders,
}));

mock.module("@vieticket/services/payout-request", () => ({
  createPayoutRequestService: mock(),
  updatePayoutRequestService: mock(),
  getPayoutRequestsService: mockGetPayoutRequestsService,
  getPayoutRequestById: mock(),
  cancelPayoutRequestService: mock(),
  getPayoutRequestsForAdmin: mock(),
}));

// Import function under test
import { getPayoutRequests } from "@/lib/actions/organizer/payout-request-actions";

/**
 * =================================================================
 * FUNCTION: getPayoutRequests
 * Lines of Code: ~9
 * Test Requirement: View list payout requests for organizer with pagination
 * =================================================================
 */
describe("Function: getPayoutRequests (Organizer View Payout Requests)", () => {
  beforeEach(async () => {
    console.log("Testing getPayoutRequests...");
    mockGetAuthSession.mockClear();
    mockHeaders.mockClear();
    mockGetPayoutRequestsService.mockClear();
    mockConsoleError.mockClear();

    // Reset default behavior
    mockGetAuthSession.mockResolvedValue({
      user: {
        id: "organizer-user-id",
        role: "organizer",
        email: "organizer@test.com",
      },
    });
    mockGetPayoutRequestsService.mockResolvedValue({
      data: [
        {
          id: "payout-1",
          eventId: "event-1",
          amount: 1000000,
          status: "pending",
        },
      ],
      totalCount: 1,
      totalPages: 1,
    });

    await Promise.resolve();
  });

  afterEach(async () => {
    await Promise.resolve();
  });

  /**
   * -----------------------------------------------------------------
   * Normal Cases
   * -----------------------------------------------------------------
   */
  describe("Normal Cases", () => {
    test("TC01: Get payout requests with valid organizer session (Normal)", async () => {
      // Condition: Valid organizer session, default page & limit
      const page = 1;
      const limit = 10;

      const result = await getPayoutRequests(page, limit);

      // Confirmation: Should return service result and call service with correct params
      expect(result).toBeDefined();
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0].id).toBe("payout-1");

      expect(mockGetAuthSession).toHaveBeenCalled();
      expect(mockGetPayoutRequestsService).toHaveBeenCalledWith(
        "organizer-user-id",
        expect.objectContaining({
          offset: 0,
          limit: 10,
        })
      );
      console.log("✅ PASSED: Payout requests retrieved successfully with default pagination");
    });

    test("TC02: Get payout requests with custom page and limit (Normal)", async () => {
      // Condition: page = 2, limit = 5 => offset should be 5
      const page = 2;
      const limit = 5;

      const result = await getPayoutRequests(page, limit);

      // Confirmation: Should calculate correct offset
      expect(result).toBeDefined();
      expect(mockGetPayoutRequestsService).toHaveBeenCalledWith(
        "organizer-user-id",
        expect.objectContaining({
          offset: 5,
          limit,
        })
      );
      console.log("✅ PASSED: Custom pagination offset calculated correctly");
    });

    test("TC03: Get payout requests with single item per page (Normal)", async () => {
      // Condition: page = 1, limit = 1
      const page = 1;
      const limit = 1;

      const result = await getPayoutRequests(page, limit);

      // Confirmation: Should call service with offset=0 and limit=1
      expect(result).toBeDefined();
      expect(mockGetPayoutRequestsService).toHaveBeenCalledWith(
        "organizer-user-id",
        expect.objectContaining({
          offset: 0,
          limit: 1,
        })
      );
      console.log("✅ PASSED: Single-item page handled correctly");
    });
  });

  /**
   * -----------------------------------------------------------------
   * Boundary Cases
   * -----------------------------------------------------------------
   */
  describe("Boundary Cases", () => {
    test("TC04: Get payout requests with default parameters (Boundary)", async () => {
      // Condition: Call function without page & limit => should use defaults (page=1, limit=10)
      const result = await getPayoutRequests();

      // Confirmation: Should call service with offset=0 and limit=10
      expect(result).toBeDefined();
      expect(mockGetPayoutRequestsService).toHaveBeenCalledWith(
        "organizer-user-id",
        expect.objectContaining({
          offset: 0,
          limit: 10,
        })
      );
      console.log("✅ PASSED: Default parameters handled correctly");
    });
  });

  /**
   * -----------------------------------------------------------------
   * Abnormal Cases
   * -----------------------------------------------------------------
   */
  describe("Abnormal Cases", () => {
    test("TC05: Get payout requests without session (Abnormal)", async () => {
      // Condition: No user session
      mockGetAuthSession.mockResolvedValueOnce({ user: null });

      // Confirmation: Should throw unauthorized error
      await expect(getPayoutRequests(1, 10)).rejects.toThrow(
        "Unauthorized: Please log in"
      );
      expect(mockGetPayoutRequestsService).not.toHaveBeenCalled();
      console.log("❌ FAILED as expected: Unauthenticated organizer cannot view payouts");
    });

    test("TC06: Service function throws error (Abnormal)", async () => {
      // Condition: Service layer throws error
      mockGetPayoutRequestsService.mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      // Confirmation: Should propagate service error
      await expect(getPayoutRequests(1, 10)).rejects.toThrow(
        "Database connection failed"
      );
      console.log("❌ FAILED as expected: Service error propagated correctly");
    });
  });
});

/**
 * =================================================================
 * TEST SUMMARY
 * =================================================================
 * Total Test Cases: 6
 * - Normal Cases: 3 test cases (50%)
 * - Boundary Cases: 1 test case (17%)
 * - Abnormal Cases: 2 test cases (33%)
 *
 * Function Tested:
 * 1. getPayoutRequests: 6 test cases
 *
 * Test Coverage: Authentication, pagination, error handling
 * Lines of Code Coverage: ~9 lines in payout-request-actions.ts
 * =================================================================
 */


