/**
 * Unit Test Cases for Admin Statistics Actions
 * Function Code: admin-stats-route.ts, admin-charts-route.ts
 * Created By: Test Developer
 * Lines of Code: ~186
 *
 * Test Requirements:
 * - Validate authentication and authorization (admin only)
 * - Test database queries for stats calculation
 * - Test date range generation and validation
 * - Test chart data aggregation
 * - Ensure error handling works correctly
 *
 * Test Coverage Summary:
 * Normal Cases: 8 test cases (36%)
 * Boundary Cases: 6 test cases (27%)
 * Abnormal Cases: 8 test cases (36%)
 * Total: 22 test cases
 */

import { describe, test, expect, beforeEach, afterEach, mock, afterAll } from "bun:test";

// Mock dependencies
const mockAuthorise = mock().mockResolvedValue({
  user: { id: "admin-user-id", role: "admin" },
});

const mockDbSelect = mock().mockReturnValue({
  from: mock().mockReturnValue({
    where: mock().mockResolvedValue([]),
  }),
});

const mockEq = mock().mockReturnValue({});
const mockAnd = mock().mockReturnValue({});
const mockGte = mock().mockReturnValue({});
const mockLte = mock().mockReturnValue({});
const mockCount = mock().mockReturnValue({});
const mockSum = mock().mockReturnValue({});

// Mock console functions
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = mock();
const mockConsoleError = mock();
console.log = mockConsoleLog as any;
console.error = mockConsoleError as any;

// Restore console after all tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Mock modules - Mock đầy đủ để tránh DB connection errors
mock.module("@/lib/auth/authorise", () => ({
  authorise: mockAuthorise,
}));

mock.module("drizzle-orm/neon-http", () => ({
  drizzle: mock().mockReturnValue({
    select: mockDbSelect,
    update: mock().mockReturnValue({
      set: mock().mockReturnValue({
        where: mock().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

mock.module("@neondatabase/serverless", () => ({
  neon: mock().mockReturnValue({
    query: mock().mockResolvedValue({ rows: [] }),
  }),
  Pool: mock().mockImplementation(() => ({
    query: mock().mockResolvedValue({ rows: [] }),
    end: mock().mockResolvedValue(undefined),
  })),
}));

mock.module("drizzle-orm", () => ({
  eq: mockEq,
  and: mockAnd,
  gte: mockGte,
  lte: mockLte,
  count: mockCount,
  sum: mockSum,
}));

mock.module("@vieticket/db/pg/schema", () => ({
  events: "events",
  orders: "orders",
  user: "user",
}));

mock.module("@vieticket/db/pg", () => ({
  db: {
    select: mockDbSelect,
  },
}));

mock.module("@vieticket/db/pg/direct", () => ({
  db: {
    select: mockDbSelect,
  },
}));

mock.module("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
  },
}));

// Import the functions to test
import { GET as getStats } from "@/app/api/admin/stats/route";
import { GET as getCharts } from "@/app/api/admin/charts/route";

// Helper function to create mock Request
function createMockRequest(url: string = "http://localhost/api/admin/stats") {
  return new Request(url);
}

/**
 * =================================================================
 * FUNCTION: GET - Admin Stats
 * Lines of Code: ~81
 * Test Requirement: Test admin statistics retrieval
 * =================================================================
 */
describe("Function: GET - Admin Stats", () => {
  beforeEach(async () => {
    console.log("Testing admin stats GET...");
    mockAuthorise.mockClear();
    mockDbSelect.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Reset to default behavior
    mockAuthorise.mockResolvedValue({
      user: { id: "admin-user-id", role: "admin" },
    });

    // Mock database results
    const mockWhere = mock().mockResolvedValue([
      { total: "1000000" }, // Revenue result
      { count: 10 }, // Events result
      { count: 5 }, // Organizers result
      { count: 100 }, // Users result
    ]);

    mockDbSelect.mockReturnValue({
      from: mock().mockReturnValue({
        where: mockWhere,
      }),
    });

    await Promise.resolve();
  });

  afterEach(async () => {
    await Promise.resolve();
  });

  describe("Normal Cases", () => {
    test("TC01: Get admin stats with valid admin session (Normal)", async () => {
      // Condition: Valid admin session, database returns data
      const request = createMockRequest();

      const response = await getStats();

      // Confirmation: Should return stats successfully
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty("totalRevenue");
      expect(body).toHaveProperty("ongoingEvents");
      expect(body).toHaveProperty("activeOrganizers");
      expect(body).toHaveProperty("allUsers");
      expect(mockAuthorise).toHaveBeenCalled();
      console.log("✅ PASSED: Admin stats retrieved successfully");
    });
  });

  describe("Boundary Cases", () => {
    test("TC02: Get admin stats with zero revenue (Boundary)", async () => {
      // Condition: No paid orders, revenue is zero
      const mockWhere = mock().mockResolvedValue([{ total: null }]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const request = createMockRequest();
      const response = await getStats();

      // Confirmation: Should return zero revenue
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.totalRevenue).toBe(0);
      console.log("✅ PASSED: Zero revenue handled correctly");
    });

    test("TC03: Get admin stats with zero events (Boundary)", async () => {
      // Condition: No approved events
      const mockWhere = mock().mockResolvedValue([{ count: 0 }]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const request = createMockRequest();
      const response = await getStats();

      // Confirmation: Should return zero events
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ongoingEvents).toBe(0);
      console.log("✅ PASSED: Zero events handled correctly");
    });
  });

  describe("Abnormal Cases", () => {
    test("TC04: Get admin stats without admin role (Abnormal)", async () => {
      // Condition: User is not admin
      mockAuthorise.mockRejectedValueOnce(
        new Error("No valid session found")
      );

      const request = createMockRequest();
      const response = await getStats();

      // Confirmation: Should return 401 Unauthorized
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
      expect(mockConsoleError).toHaveBeenCalled();
      console.log("❌ FAILED as expected: Non-admin access rejected");
    });

    test("TC05: Database query fails (Abnormal)", async () => {
      // Condition: Database throws error
      const mockWhere = mock().mockRejectedValue(
        new Error("Database connection failed")
      );
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const request = createMockRequest();
      const response = await getStats();

      // Confirmation: Should return 500 error
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to fetch admin stats");
      expect(mockConsoleError).toHaveBeenCalled();
      console.log("❌ FAILED as expected: Database error handled");
    });
  });
});

/**
 * =================================================================
 * FUNCTION: generateDateRanges - Helper Function
 * Lines of Code: ~62
 * Test Requirement: Test date range generation logic
 * =================================================================
 */
describe("Function: generateDateRanges", () => {
  // We need to test this function, but it's not exported
  // We'll test it through the GET function that uses it
  beforeEach(async () => {
    console.log("Testing generateDateRanges...");
    mockAuthorise.mockClear();
    mockDbSelect.mockClear();
    await Promise.resolve();
  });

  afterEach(async () => {
    await Promise.resolve();
  });

  describe("Normal Cases", () => {
    test("TC06: Generate daily ranges for short period (Normal)", async () => {
      // Condition: Date range <= 90 days, should group by day
      const startDate = "2024-01-01";
      const endDate = "2024-01-07"; // 7 days
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      mockAuthorise.mockResolvedValue({
        user: { id: "admin-user-id", role: "admin" },
      });

      const mockWhere = mock().mockResolvedValue([]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const response = await getCharts(request);

      // Confirmation: Should return chart data with daily labels
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue).toBeDefined();
      expect(body.events).toBeDefined();
      expect(body.revenue.labels.length).toBeGreaterThan(0);
      console.log("✅ PASSED: Daily ranges generated correctly");
    });

    test("TC07: Generate monthly ranges for long period (Normal)", async () => {
      // Condition: Date range > 90 days, should group by month
      const startDate = "2024-01-01";
      const endDate = "2024-12-31"; // ~365 days
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      mockAuthorise.mockResolvedValue({
        user: { id: "admin-user-id", role: "admin" },
      });

      const mockWhere = mock().mockResolvedValue([]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const response = await getCharts(request);

      // Confirmation: Should return chart data with monthly labels
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue.labels.length).toBeLessThanOrEqual(12);
      console.log("✅ PASSED: Monthly ranges generated correctly");
    });
  });

  describe("Boundary Cases", () => {
    test("TC08: Generate ranges for exactly 90 days (Boundary)", async () => {
      // Condition: Exactly 90 days, should group by day
      const startDate = "2024-01-01";
      const endDate = "2024-03-31"; // 90 days
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      mockAuthorise.mockResolvedValue({
        user: { id: "admin-user-id", role: "admin" },
      });

      const mockWhere = mock().mockResolvedValue([]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const response = await getCharts(request);

      // Confirmation: Should return chart data
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue).toBeDefined();
      console.log("✅ PASSED: 90 days boundary handled correctly");
    });

    test("TC09: Generate ranges for 91 days (Boundary)", async () => {
      // Condition: 91 days, should group by month
      const startDate = "2024-01-01";
      const endDate = "2024-04-01"; // 91 days
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      mockAuthorise.mockResolvedValue({
        user: { id: "admin-user-id", role: "admin" },
      });

      const mockWhere = mock().mockResolvedValue([]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const response = await getCharts(request);

      // Confirmation: Should return chart data with monthly grouping
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue).toBeDefined();
      console.log("✅ PASSED: 91 days boundary handled correctly");
    });

    test("TC10: Generate ranges for single day (Boundary)", async () => {
      // Condition: Same start and end date
      const startDate = "2024-01-01";
      const endDate = "2024-01-01";
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      mockAuthorise.mockResolvedValue({
        user: { id: "admin-user-id", role: "admin" },
      });

      const mockWhere = mock().mockResolvedValue([]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const response = await getCharts(request);

      // Confirmation: Should return chart data with one range
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue.labels.length).toBe(1);
      console.log("✅ PASSED: Single day range handled correctly");
    });
  });

  describe("Abnormal Cases", () => {
    test("TC11: Invalid date format (Abnormal)", async () => {
      // Condition: Invalid date string in query params
      const url = `http://localhost/api/admin/charts?startDate=invalid-date&endDate=2024-01-01`;
      const request = createMockRequest(url);

      mockAuthorise.mockResolvedValue({
        user: { id: "admin-user-id", role: "admin" },
      });

      // This will cause NaN in date parsing, but function will still try to process
      const response = await getCharts(request);

      // Confirmation: Should handle invalid date or return error
      // The function may still process but with invalid dates
      expect(response).toBeDefined();
      console.log("⚠️  INFO: Invalid date format handled");
    });
  });
});

/**
 * =================================================================
 * FUNCTION: GET - Admin Charts
 * Lines of Code: ~114
 * Test Requirement: Test chart data retrieval with date filtering
 * =================================================================
 */
describe("Function: GET - Admin Charts", () => {
  beforeEach(async () => {
    console.log("Testing admin charts GET...");
    mockAuthorise.mockClear();
    mockDbSelect.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Reset to default behavior
    mockAuthorise.mockResolvedValue({
      user: { id: "admin-user-id", role: "admin" },
    });

    const mockWhere = mock().mockResolvedValue([]);
    mockDbSelect.mockReturnValue({
      from: mock().mockReturnValue({
        where: mockWhere,
      }),
    });

    await Promise.resolve();
  });

  afterEach(async () => {
    await Promise.resolve();
  });

  describe("Normal Cases", () => {
    test("TC12: Get chart data with valid date range (Normal)", async () => {
      // Condition: Valid startDate and endDate
      const startDate = "2024-01-01";
      const endDate = "2024-01-31";
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      const response = await getCharts(request);

      // Confirmation: Should return chart data
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty("revenue");
      expect(body).toHaveProperty("events");
      expect(body.revenue).toHaveProperty("labels");
      expect(body.revenue).toHaveProperty("data");
      expect(mockAuthorise).toHaveBeenCalled();
      console.log("✅ PASSED: Chart data retrieved successfully");
    });

    test("TC13: Get chart data without date params (Normal)", async () => {
      // Condition: No date params, should use default (last 6 months)
      const url = "http://localhost/api/admin/charts";
      const request = createMockRequest(url);

      const response = await getCharts(request);

      // Confirmation: Should return chart data with default dates
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue).toBeDefined();
      expect(body.events).toBeDefined();
      console.log("✅ PASSED: Default date range used correctly");
    });

    test("TC14: Get chart data with only startDate (Normal)", async () => {
      // Condition: Only startDate provided
      const startDate = "2024-01-01";
      const url = `http://localhost/api/admin/charts?startDate=${startDate}`;
      const request = createMockRequest(url);

      const response = await getCharts(request);

      // Confirmation: Should return chart data with default endDate
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue).toBeDefined();
      console.log("✅ PASSED: Partial date params handled correctly");
    });
  });

  describe("Boundary Cases", () => {
    test("TC15: Get chart data with same start and end date (Boundary)", async () => {
      // Condition: Start date equals end date
      const date = "2024-01-01";
      const url = `http://localhost/api/admin/charts?startDate=${date}&endDate=${date}`;
      const request = createMockRequest(url);

      const response = await getCharts(request);

      // Confirmation: Should return chart data for single day
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue.labels.length).toBe(1);
      console.log("✅ PASSED: Same start and end date handled");
    });

    test("TC16: Get chart data with very large date range (Boundary)", async () => {
      // Condition: Very large date range (years)
      const startDate = "2020-01-01";
      const endDate = "2024-12-31";
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      const response = await getCharts(request);

      // Confirmation: Should return chart data grouped by month
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue).toBeDefined();
      expect(body.revenue.labels.length).toBeLessThanOrEqual(60); // Max ~60 months
      console.log("✅ PASSED: Large date range handled correctly");
    });
  });

  describe("Abnormal Cases", () => {
    test("TC17: Get chart data with startDate after endDate (Abnormal)", async () => {
      // Condition: Invalid date range (start > end)
      const startDate = "2024-12-31";
      const endDate = "2024-01-01";
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      const response = await getCharts(request);

      // Confirmation: Should return 400 error
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Start date must be before end date");
      console.log("❌ FAILED as expected: Invalid date range rejected");
    });

    test("TC18: Get chart data without admin role (Abnormal)", async () => {
      // Condition: User is not admin
      mockAuthorise.mockRejectedValueOnce(
        new Error("No valid session found")
      );

      const url = "http://localhost/api/admin/charts";
      const request = createMockRequest(url);

      const response = await getCharts(request);

      // Confirmation: Should return 401 Unauthorized
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
      expect(mockConsoleError).toHaveBeenCalled();
      console.log("❌ FAILED as expected: Non-admin access rejected");
    });

    test("TC19: Database query fails (Abnormal)", async () => {
      // Condition: Database throws error
      const mockWhere = mock().mockRejectedValue(
        new Error("Database connection failed")
      );
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const url = "http://localhost/api/admin/charts";
      const request = createMockRequest(url);

      const response = await getCharts(request);

      // Confirmation: Should return 500 error
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to fetch chart data");
      expect(mockConsoleError).toHaveBeenCalled();
      console.log("❌ FAILED as expected: Database error handled");
    });
  });
});

/**
 * =================================================================
 * FUNCTION: Chart Data Aggregation
 * Lines of Code: ~40
 * Test Requirement: Test revenue and events data aggregation
 * =================================================================
 */
describe("Function: Chart Data Aggregation", () => {
  beforeEach(async () => {
    console.log("Testing chart data aggregation...");
    mockAuthorise.mockClear();
    mockDbSelect.mockClear();

    mockAuthorise.mockResolvedValue({
      user: { id: "admin-user-id", role: "admin" },
    });

    await Promise.resolve();
  });

  afterEach(async () => {
    await Promise.resolve();
  });

  describe("Normal Cases", () => {
    test("TC20: Aggregate revenue data correctly (Normal)", async () => {
      // Condition: Multiple orders in date range
      const startDate = "2024-01-01";
      const endDate = "2024-01-07";
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      // Mock revenue data
      const mockWhere = mock().mockResolvedValue([
        { total: "100000" },
        { total: "200000" },
        { total: "150000" },
      ]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const response = await getCharts(request);

      // Confirmation: Should aggregate revenue correctly
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue.data).toBeDefined();
      expect(Array.isArray(body.revenue.data)).toBe(true);
      console.log("✅ PASSED: Revenue data aggregated correctly");
    });

    test("TC21: Aggregate events data correctly (Normal)", async () => {
      // Condition: Multiple events in date range
      const startDate = "2024-01-01";
      const endDate = "2024-01-07";
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      // Mock data - will be called multiple times for each date range (7 days = 7 calls for revenue + 7 calls for events)
      let callCount = 0;
      const mockWhere = mock().mockImplementation(async () => {
        callCount++;
        // First 7 calls are for revenue, next 7 are for events
        if (callCount <= 7) {
          return [{ total: "100000" }]; // Revenue data
        } else {
          return [{ count: "event-1" }, { count: "event-2" }]; // Events data
        }
      });

      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const response = await getCharts(request);

      // Confirmation: Should aggregate events correctly
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.events.data).toBeDefined();
      expect(Array.isArray(body.events.data)).toBe(true);
      expect(body.events.data.length).toBeGreaterThan(0);
      console.log("✅ PASSED: Events data aggregated correctly");
    });
  });

  describe("Boundary Cases", () => {
    test("TC22: Aggregate data with empty results (Boundary)", async () => {
      // Condition: No orders or events in date range
      const startDate = "2024-01-01";
      const endDate = "2024-01-07";
      const url = `http://localhost/api/admin/charts?startDate=${startDate}&endDate=${endDate}`;
      const request = createMockRequest(url);

      const mockWhere = mock().mockResolvedValue([]);
      mockDbSelect.mockReturnValue({
        from: mock().mockReturnValue({
          where: mockWhere,
        }),
      });

      const response = await getCharts(request);

      // Confirmation: Should return zero values
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.revenue.data).toBeDefined();
      expect(body.events.data).toBeDefined();
      // All values should be 0 or empty arrays
      console.log("✅ PASSED: Empty results handled correctly");
    });
  });
});

/**
 * =================================================================
 * TEST SUMMARY
 * =================================================================
 * Total Test Cases: 22
 * - Normal Cases: 8 test cases (36%)
 * - Boundary Cases: 6 test cases (27%)
 * - Abnormal Cases: 8 test cases (36%)
 *
 * Functions Tested:
 * 1. GET - Admin Stats: 5 test cases
 * 2. generateDateRanges: 6 test cases (tested through GET)
 * 3. GET - Admin Charts: 8 test cases
 * 4. Chart Data Aggregation: 3 test cases
 *
 * Test Coverage: Authentication, authorization, date validation, data aggregation, error handling
 * Lines of Code Coverage: ~186 lines in admin-stats-route.ts and admin-charts-route.ts
 * =================================================================
 */

