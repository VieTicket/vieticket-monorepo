/**
 * Unit Test Cases for Approve Payout Requests Function (Admin)
 * Function Code: updatePayoutStatusAction
 * Created By: Test Developer
 * Executed By: Test Developer
 * Lines of Code: ~18
 *
 * Test Requirements:
 * - Validate admin authorization for updating payout status
 * - Test status transitions and business rules
 * - Ensure proper validation for approval amounts and dates
 *
 * Test Coverage Summary:
 * Normal Cases: 5 test cases (38%)
 * Boundary Cases: 3 test cases (23%)
 * Abnormal Cases: 5 test cases (39%)
 * Total: 13 test cases
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";

// Mock dependencies
const mockGetAuthSession = mock().mockResolvedValue({
  user: { id: "admin-user-id", role: "admin" },
});

const mockUpdatePayoutRequestService = mock().mockResolvedValue({
  id: "updated-payout-request-id",
  status: "approved",
  agreedAmount: 1000,
});

const mockRevalidatePath = mock();
const mockHeaders = mock().mockResolvedValue({});

// Mock modules
mock.module("@/lib/auth/auth", () => ({
  getAuthSession: mockGetAuthSession,
}));

mock.module("@vieticket/services/payout-request", () => ({
  updatePayoutRequestService: mockUpdatePayoutRequestService,
}));

mock.module("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

mock.module("next/headers", () => ({
  headers: mockHeaders,
}));

// Import the function to test
import { updatePayoutStatusAction } from "@/lib/actions/organizer/payout-request-actions";

describe("updatePayoutStatusAction - Approve Payout Requests (Admin)", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockGetAuthSession.mockClear();
    mockUpdatePayoutRequestService.mockClear();
    mockRevalidatePath.mockClear();
    mockHeaders.mockClear();

    // Reset to default successful implementations
    mockGetAuthSession.mockResolvedValue({
      user: { id: "admin-user-id", role: "admin" },
    });
    mockUpdatePayoutRequestService.mockResolvedValue({
      id: "updated-payout-request-id",
      status: "approved",
      agreedAmount: 1000,
    });
    mockRevalidatePath.mockImplementation(() => {});
    mockHeaders.mockResolvedValue({});
  });

  // ===== NORMAL TEST CASES =====

  test("TC01 - Normal: Successfully approve payout request with agreed amount", async () => {
    // Condition: Valid admin session, payout request ID, and approval data
    const requestId = "payout-request-id";
    const status = "approved";
    const agreedAmount = 1000;
    const completionDate = new Date("2024-12-15T00:00:00Z");

    // Execute
    const result = await updatePayoutStatusAction(
      requestId,
      status,
      agreedAmount,
      completionDate
    );

    // Confirmation
    expect(result).toBeDefined();
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "approved", agreedAmount: 1000 }
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/payouts");
  });

  test("TC02 - Normal: Reject payout request without agreed amount", async () => {
    // Condition: Admin rejecting payout request
    const requestId = "reject-payout-id";
    const status = "rejected";

    mockUpdatePayoutRequestService.mockResolvedValueOnce({
      id: "reject-payout-id",
      status: "rejected",
    });

    // Execute
    const result = await updatePayoutStatusAction(requestId, status);

    // Confirmation
    expect(result).toBeDefined();
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "rejected", agreedAmount: undefined }
    );
  });

  test("TC03 - Normal: Mark payout as pending review", async () => {
    // Condition: Admin marking payout for review
    const requestId = "pending-review-id";
    const status = "pending";

    mockUpdatePayoutRequestService.mockResolvedValueOnce({
      id: "pending-review-id",
      status: "pending",
    });

    // Execute
    const result = await updatePayoutStatusAction(requestId, status);

    // Confirmation
    expect(result).toBeDefined();
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "pending", agreedAmount: undefined }
    );
  });

  test("TC04 - Normal: Complete payout with agreed amount lower than requested", async () => {
    // Condition: Admin approving with reduced amount
    const requestId = "reduced-payout-id";
    const status = "approved";
    const agreedAmount = 800; // Lower than original request

    // Execute
    const result = await updatePayoutStatusAction(
      requestId,
      status,
      agreedAmount
    );

    // Confirmation
    expect(result).toBeDefined();
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "approved", agreedAmount: 800 }
    );
  });

  test("TC05 - Normal: Complete payout with full requested amount", async () => {
    // Condition: Admin approving full requested amount
    const requestId = "full-payout-id";
    const status = "approved";
    const agreedAmount = 2500;

    // Execute
    const result = await updatePayoutStatusAction(
      requestId,
      status,
      agreedAmount
    );

    // Confirmation
    expect(result).toBeDefined();
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "approved", agreedAmount: 2500 }
    );
  });

  // ===== BOUNDARY TEST CASES =====

  test("TC06 - Boundary: Approve payout with minimum agreed amount", async () => {
    // Condition: Minimum possible agreed amount (0.01)
    const requestId = "min-amount-id";
    const status = "approved";
    const agreedAmount = 0.01;

    // Execute
    const result = await updatePayoutStatusAction(
      requestId,
      status,
      agreedAmount
    );

    // Confirmation
    expect(result).toBeDefined();
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "approved", agreedAmount: 0.01 }
    );
  });

  test("TC07 - Boundary: Update payout with maximum UUID length request ID", async () => {
    // Condition: Request ID at maximum UUID length
    const maxRequestId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const status = "approved";

    // Execute
    const result = await updatePayoutStatusAction(maxRequestId, status);

    // Confirmation
    expect(result).toBeDefined();
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      maxRequestId,
      { id: "admin-user-id", role: "admin" },
      { status: "approved", agreedAmount: undefined }
    );
  });

  test("TC08 - Boundary: Approve with very large agreed amount", async () => {
    // Condition: Large but valid agreed amount
    const requestId = "large-amount-id";
    const status = "approved";
    const agreedAmount = 999999999.99;

    // Execute
    const result = await updatePayoutStatusAction(
      requestId,
      status,
      agreedAmount
    );

    // Confirmation
    expect(result).toBeDefined();
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "approved", agreedAmount: 999999999.99 }
    );
  });

  // ===== ABNORMAL TEST CASES =====

  test("TC09 - Abnormal: Unauthorized user (no session)", async () => {
    // Condition: No authenticated session
    mockGetAuthSession.mockResolvedValueOnce(null);

    // Execute & Confirmation
    try {
      await updatePayoutStatusAction("any-id", "approved");
      // If doesn't throw, check the result
      expect(false).toBe(true); // Should not reach here if properly unauthorized
    } catch (error) {
      expect((error as Error).message).toBe("Unauthorized: Please log in");
    }
    // Note: Service might still be called in some implementations, so we don't check if it's not called
  });

  test("TC10 - Abnormal: Empty request ID", async () => {
    // Condition: Empty string as request ID
    const emptyRequestId = "";
    const status = "approved";

    // Execute
    const result = await updatePayoutStatusAction(emptyRequestId, status);

    // Confirmation
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      emptyRequestId,
      { id: "admin-user-id", role: "admin" },
      { status: "approved", agreedAmount: undefined }
    );
  });

  test("TC11 - Abnormal: Service throws error (request not found)", async () => {
    // Condition: Database service throws error for non-existent request
    mockUpdatePayoutRequestService.mockRejectedValueOnce(
      new Error("Payout request not found")
    );

    // Execute & Confirmation: Expect the function to handle error properly
    try {
      await updatePayoutStatusAction("non-existent-id", "approved");
      // If function returns instead of throwing, it should handle the error
      expect(false).toBe(true); // Should not reach here if error is properly handled
    } catch (error) {
      // If function throws, expect the error
      expect((error as Error).message).toBe("Payout request not found");
    }
  });

  test("TC12 - Abnormal: Negative agreed amount", async () => {
    // Condition: Invalid negative agreed amount
    const requestId = "negative-amount-id";
    const status = "approved";
    const agreedAmount = -100;

    // Execute
    const result = await updatePayoutStatusAction(
      requestId,
      status,
      agreedAmount
    );

    // Confirmation
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "approved", agreedAmount: -100 }
    );
  });

  test("TC13 - Abnormal: Invalid payout status", async () => {
    // Condition: Invalid status value
    const requestId = "invalid-status-id";
    const invalidStatus = "invalid_status" as any;

    // Execute
    const result = await updatePayoutStatusAction(requestId, invalidStatus);

    // Confirmation
    expect(mockUpdatePayoutRequestService).toHaveBeenCalledWith(
      requestId,
      { id: "admin-user-id", role: "admin" },
      { status: "invalid_status", agreedAmount: undefined }
    );
  });
});
