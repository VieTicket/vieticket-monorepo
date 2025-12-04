/**
 * Unit Test Cases for Admin Payout Request Actions
 * Function Code: payout-request-actions.ts
 * Created By: Test Developer
 * Lines of Code (for tested function): ~20
 *
 * Test Requirements:
 * - Validate authentication (admin session required)
 * - Validate pagination parameters (page, limit -> offset)
 * - Ensure service function is called with correct parameters
 * - Test filtering by payout status
 * - Test error handling for unauthorized user and service failures
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
    id: "admin-user-id",
    role: "admin",
    email: "admin@test.com",
  },
});

const mockHeaders = mock().mockResolvedValue({});

const mockGetPayoutRequestsForAdmin = mock().mockResolvedValue({
  data: [
    {
      id: "payout-1",
      status: "pending",
      agreedAmount: 1000000,
    },
  ],
  totalCount: 1,
  totalPages: 1,
});

// Mock console.error to avoid noisy logs in expected error tests
const originalConsoleError = console.error;
const mockConsoleError = mock();
console.error = mockConsoleError as any;

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
  getPayoutRequestsService: mock(),
  getPayoutRequestById: mock(),
  cancelPayoutRequestService: mock(),
  getPayoutRequestsForAdmin: mockGetPayoutRequestsForAdmin,
}));

// Import function under test
import { getAdminPayoutRequestsAction } from "@/lib/actions/organizer/payout-request-actions";
import { PayoutStatus } from "@vieticket/db/pg/schema";

/**
 * =================================================================
 * FUNCTION: getAdminPayoutRequestsAction
 * Lines of Code: ~20
 * Test Requirement: View list payout requests for admin with pagination & filtering
 * =================================================================
 */
describe("Function: getAdminPayoutRequestsAction", () => {
  beforeEach(async () => {
    console.log("Testing getAdminPayoutRequestsAction...");
    mockGetAuthSession.mockClear();
    mockHeaders.mockClear();
    mockGetPayoutRequestsForAdmin.mockClear();
    mockConsoleError.mockClear();

    // Reset default behavior
    mockGetAuthSession.mockResolvedValue({
      user: {
        id: "admin-user-id",
        role: "admin",
        email: "admin@test.com",
      },
    });
    mockGetPayoutRequestsForAdmin.mockResolvedValue({
      data: [
        {
          id: "payout-1",
          status: "pending",
          agreedAmount: 1000000,
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

  describe("Normal Cases", () => {
    test("TC01: Get payout requests with valid admin session (Normal)", async () => {
      // Condition: Valid admin session, default page & limit, no status filter
      const result = await getAdminPayoutRequestsAction(1, 10);

      // Confirmation: Should return success with data and correct pagination
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data.totalCount).toBe(1);
      expect(result.data.totalPages).toBe(1);
      expect(mockGetAuthSession).toHaveBeenCalled();
      expect(mockGetPayoutRequestsForAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ id: "admin-user-id" }),
        expect.objectContaining({ offset: 0, limit: 10 })
      );
    });

    test("TC02: Get payout requests with status filter (Normal)", async () => {
      // Condition: Valid admin session with status filter
      const status: PayoutStatus = "pending" as PayoutStatus;

      const result = await getAdminPayoutRequestsAction(1, 10, status);

      // Confirmation: Should pass status to service layer
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockGetPayoutRequestsForAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ id: "admin-user-id" }),
        expect.objectContaining({ status })
      );
    });

    test("TC03: Get payout requests with custom page and limit (Normal)", async () => {
      // Condition: page = 2, limit = 5 => offset should be 5
      const page = 2;
      const limit = 5;

      const result = await getAdminPayoutRequestsAction(page, limit);

      // Confirmation: Should calculate correct offset
      expect(result.success).toBe(true);
      expect(mockGetPayoutRequestsForAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ id: "admin-user-id" }),
        expect.objectContaining({ offset: 5, limit })
      );
    });
  });

  describe("Boundary Cases", () => {
    test("TC04: Get payout requests with default parameters (Boundary)", async () => {
      // Condition: Call function without page & limit => should use defaults (page=1, limit=10)
      const result = await getAdminPayoutRequestsAction();

      // Confirmation: Should call service with offset=0 and limit=10
      expect(result.success).toBe(true);
      expect(mockGetPayoutRequestsForAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ id: "admin-user-id" }),
        expect.objectContaining({ offset: 0, limit: 10 })
      );
    });
  });

  describe("Abnormal Cases", () => {
    test("TC05: Get payout requests without session (Abnormal)", async () => {
      // Condition: No user session
      mockGetAuthSession.mockResolvedValueOnce({ user: null });

      const result = await getAdminPayoutRequestsAction(1, 10);

      // Confirmation: Should return error and not call service
      expect(result.success).toBe(false);
      expect(result.message).toBe("Unauthorized: Please log in");
      expect(mockGetPayoutRequestsForAdmin).not.toHaveBeenCalled();
    });

    test("TC06: Service function throws error (Abnormal)", async () => {
      // Condition: Service layer throws error
      mockGetPayoutRequestsForAdmin.mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const result = await getAdminPayoutRequestsAction(1, 10);

      // Confirmation: Should handle error and log it
      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to fetch payout requests");
      expect(mockConsoleError).toHaveBeenCalled();
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
 * 1. getAdminPayoutRequestsAction: 6 test cases
 *
 * Test Coverage: Authentication, pagination, status filtering, error handling
 * Lines of Code Coverage: ~20 lines in payout-request-actions.ts
 * =================================================================
 */


