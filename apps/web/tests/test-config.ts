/**
 * VieTicket Unit Test Configuration
 *
 * This file provides configuration and instructions for running
 * the comprehensive unit test suite for VieTicket authentication
 * and event viewing functionality.
 *
 * Test Structure:
 * - Authentication Tests: /tests/auth/
 * - Customer Event Tests: /tests/customer/events/
 * - Common Utilities: /tests/common/
 *
 * Total Test Coverage: 162 test cases
 * - Sign In: 27 test cases
 * - Sign Up Customer: 30 test cases
 * - Sign Up Organizer: 31 test cases
 * - Logout: 20 test cases
 * - Reset Password: 27 test cases
 * - View Events: 29 test cases
 * - View Event Details: 28 test cases
 */

export const testConfig = {
  // Test environment configuration
  environment: {
    NODE_ENV: "test",
    DATABASE_URL:
      "postgresql://test_user:test_pass@localhost:5432/vieticket_test",
    JWT_SECRET: "test-jwt-secret",
    EMAIL_SERVICE_MOCK: true,
  },

  // Test categories and their file locations
  testSuites: {
    authentication: {
      signIn: "tests/auth/sign-in-action.test.ts",
      signUpCustomer: "tests/auth/sign-up-customer-action.test.ts",
      signUpOrganizer: "tests/auth/sign-up-organizer-action.test.ts",
      logout: "tests/auth/logout-action.test.ts",
      resetPassword: "tests/auth/reset-password-action.test.ts",
    },
    events: {
      viewEvents: "tests/customer/events/view-events-action.test.ts",
      viewEventDetails:
        "tests/customer/events/view-event-details-action.test.ts",
    },
  },

  // Coverage requirements
  coverage: {
    lines: 80,
    functions: 85,
    branches: 75,
    statements: 80,
  },

  // Test data and mock configurations
  mocks: {
    authService: {
      validTokens: ["test-token-123", "valid-session-token"],
      validUsers: [
        {
          id: "user-1",
          email: "customer@test.com",
          role: "customer",
          emailVerified: true,
        },
        {
          id: "user-2",
          email: "organizer@test.com",
          role: "organizer",
          emailVerified: true,
        },
      ],
    },
    eventService: {
      sampleEvents: [
        {
          id: "event-1",
          name: "Test Concert",
          slug: "test-concert",
          approvalStatus: "approved",
          type: "concert",
        },
      ],
    },
  },
};

// Helper functions for test setup
export function setupTestEnvironment() {
  // Set environment variables for testing
  Object.entries(testConfig.environment).forEach(([key, value]) => {
    process.env[key] = String(value);
  });
}

export function cleanupTestEnvironment() {
  // Clean up test data and reset mocks
  console.log("Cleaning up test environment...");
}

// Test runner configuration for bun
export const bunTestConfig = {
  testNamePattern: "**/tests/**/*.test.ts",
  verbose: true,
  coverage: true,
  coverageThreshold: testConfig.coverage,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testEnvironment: "node",
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

// Instructions for running tests
export const runInstructions = `
Running VieTicket Unit Tests
============================

Prerequisites:
1. Install dependencies: bun install
2. Set up test database
3. Configure environment variables

Running All Tests:
bun test

Running Specific Test Suites:
bun test tests/auth/                    # All authentication tests
bun test tests/customer/                # All customer-related tests
bun test tests/auth/sign-in-action.test.ts    # Specific test file

Running with Coverage:
bun test --coverage

Running in Watch Mode:
bun test --watch

Test Categories:
================

Authentication Tests (135 test cases):
- Sign In: Email/password validation, OAuth, session management
- Sign Up Customer: Registration validation, email verification
- Sign Up Organizer: Profile creation, image upload, role assignment
- Logout: Session termination, cleanup, redirection
- Reset Password: Token validation, secure password update

Event Tests (57 test cases):
- View Events: Listing, filtering, search, pagination
- View Event Details: Detail retrieval, availability, recommendations

Guidelines for Adding New Tests:
=================================

1. Follow the established naming convention: functionName-action.test.ts
2. Use the test case structure: TC##: Description (Category)
3. Include normal, boundary, and abnormal test cases
4. Maintain ~35% normal, ~25% boundary, ~40% abnormal distribution
5. Add comprehensive error handling tests
6. Mock external dependencies appropriately
7. Include performance and security test cases where relevant

Test Coverage Goals:
===================
- Lines: 80%+ coverage of action functions
- Functions: 85%+ coverage of public methods
- Branches: 75%+ coverage of conditional logic
- Statements: 80%+ coverage of executable code

Expected Results:
================
All tests should pass in development environment.
Any failing tests indicate potential issues in:
- Input validation logic
- Error handling mechanisms
- Business rule compliance
- Security implementations
`;

export default testConfig;
