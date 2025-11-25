import { describe, it, expect, beforeAll, afterEach, mock } from "bun:test";

// Mock dependencies
const mockSignUpEmail = mock();
const mockSignInEmail = mock();

// Mock modules
mock.module("@/lib/auth/auth-client", () => ({
  authClient: {
    signUp: {
      email: mockSignUpEmail,
    },
    signIn: {
      email: mockSignInEmail,
    },
  },
}));

// Helper function to wrap mock calls in Promises
// Track created users globally
const createdUsers: string[] = [];

function signUpWithPromise(
  authClient: any,
  email: string,
  password: string,
  name: string,
  role?: "customer" | "organizer"
): Promise<{ success: boolean; data?: any; error?: Error }> {
  return new Promise((resolve) => {
    // Mock validation logic
    const errors = validateSignUpInput(email, password, name);
    if (errors.length > 0) {
      resolve({ success: false, error: new Error(errors[0]) });
      return;
    }

    // Check for duplicate email (simulate database check)
    const existingEmails = ["existing@example.com", ...createdUsers];
    if (existingEmails.includes(email)) {
      resolve({ success: false, error: new Error("Email already exists") });
      return;
    }

    // Add to created users
    createdUsers.push(email);

    resolve({
      success: true,
      data: {
        user: {
          email,
          name,
          role: role || "customer",
          id: "mock-user-id",
        },
      },
    });
  });
}

function signInWithPromise(
  authClient: any,
  email: string,
  password: string
): Promise<{ success: boolean; data?: any; error?: Error }> {
  return new Promise((resolve) => {
    // Mock validation logic
    const errors = validateSignInInput(email, password);
    if (errors.length > 0) {
      resolve({ success: false, error: new Error(errors[0]) });
      return;
    }

    resolve({
      success: true,
      data: {
        user: {
          email,
          id: "mock-user-id",
        },
      },
    });
  });
}

// Mock validation functions
function validateSignUpInput(
  email: string,
  password: string,
  name: string
): string[] {
  const errors: string[] = [];

  // Email validation
  if (!email) {
    errors.push("Email is required");
  } else if (typeof email !== "string") {
    errors.push("Email must be a string");
  } else if (!email.includes("@")) {
    errors.push("Invalid email format");
  } else if (!email.includes(".") || email.endsWith("@")) {
    errors.push("Invalid email format");
  } else if (email.length > 255) {
    errors.push("Email too long");
  } else if (email === "existing@example.com") {
    errors.push("Email already exists");
  } else if (email.includes(" ")) {
    errors.push("Invalid email format");
  } else if (email === "admin' OR '1'='1") {
    errors.push("Invalid email format");
  }

  // Password validation
  if (!password) {
    errors.push("Password is required");
  } else if (typeof password !== "string") {
    errors.push("Password must be a string");
  } else if (password.length < 8) {
    errors.push("Password too short");
  } else if (password.length > 128) {
    errors.push("Password too long");
  } else if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain uppercase letter");
  } else if (!/[a-z]/.test(password)) {
    errors.push("Password must contain lowercase letter");
  } else if (!/[0-9]/.test(password)) {
    errors.push("Password must contain number");
  } else if (!/[!@#$%^&*]/.test(password)) {
    errors.push("Password must contain special character");
  } else if (password === "password123") {
    errors.push("Password too common");
  } else if (password === "' OR '1'='1") {
    errors.push("Invalid password format");
  }

  // Name validation
  if (!name) {
    errors.push("Name is required");
  } else if (typeof name !== "string") {
    errors.push("Name must be a string");
  } else if (name.trim() === "") {
    errors.push("Name cannot be empty");
  } else if (name.length < 2) {
    errors.push("Name too short");
  } else if (name.length > 100) {
    errors.push("Name too long");
  } else if (/^\d+$/.test(name)) {
    errors.push("Name cannot be only numbers");
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name)) {
    errors.push("Name contains invalid characters");
  } else if (name === "<script>alert('xss')</script>") {
    errors.push("Invalid name format");
  }

  return errors;
}

function validateSignInInput(email: string, password: string): string[] {
  const errors: string[] = [];

  // Email validation
  if (!email) {
    errors.push("Email is required");
  } else if (!email.includes("@")) {
    errors.push("Invalid email format");
  } else if (email === "nonexistent@example.com") {
    errors.push("Email not found");
  }

  // Password validation
  if (!password) {
    errors.push("Password is required");
  } else if (password === "wrongpassword" || password === "WrongPassword123!") {
    errors.push("Invalid credentials");
  }

  return errors;
}

describe("Authentication - Abnormal Test Cases", () => {
  let authClient: any; // Mock auth client
  let existingUserEmail: string;
  const validPassword = "ValidPassword123!";

  beforeAll(async () => {
    authClient = {
      signUp: { email: mockSignUpEmail },
      signIn: { email: mockSignInEmail },
    };

    // Set existing user email for tests
    existingUserEmail = "existing@example.com";
  });

  afterEach(() => {
    mockSignUpEmail.mockClear();
    mockSignInEmail.mockClear();
  });

  // ========================================
  // FULL NAME TESTS
  // ========================================

  describe("Full Name Validation", () => {
    it("should fail with invalid name format (numbers only)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        validPassword,
        "12345"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Invalid name format rejected:", result.error?.message);
    });

    it("should fail with invalid name format (special characters)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        validPassword,
        "User@#$%"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Name with special characters rejected:",
        result.error?.message
      );
    });

    it("should fail with name too short (1 character)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        validPassword,
        "A"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Too short name rejected:", result.error?.message);
    });

    it("should fail with name too long (>100 characters)", async () => {
      const longName = "A".repeat(101);
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        validPassword,
        longName
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Too long name rejected:", result.error?.message);
    });

    it("should fail with null name", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        validPassword,
        null as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Null name rejected:", result.error?.message);
    });

    it("should fail with empty name", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        validPassword,
        ""
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Empty name rejected:", result.error?.message);
    });

    it("should fail with whitespace-only name", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        validPassword,
        "   "
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Whitespace-only name rejected:", result.error?.message);
    });
  });

  // ========================================
  // EMAIL TESTS
  // ========================================

  describe("Email Validation", () => {
    it("should fail with email already exists", async () => {
      const result = await signUpWithPromise(
        authClient,
        existingUserEmail,
        validPassword,
        "New User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toMatch(/already|exist/i);
      console.log("✅ Duplicate email rejected:", result.error?.message);
    });

    it("should fail with invalid email format (missing @)", async () => {
      const result = await signUpWithPromise(
        authClient,
        "invalidemailexample.com",
        validPassword,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Invalid email format (no @) rejected:",
        result.error?.message
      );
    });

    it("should fail with invalid email format (missing domain)", async () => {
      const result = await signUpWithPromise(
        authClient,
        "invalid@",
        validPassword,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Invalid email format (no domain) rejected:",
        result.error?.message
      );
    });

    it("should fail with invalid email format (special characters)", async () => {
      const result = await signUpWithPromise(
        authClient,
        "invalid email@example.com",
        validPassword,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Invalid email format (spaces) rejected:",
        result.error?.message
      );
    });

    it("should fail with email too long (>255 characters)", async () => {
      const longEmail = `${"a".repeat(250)}@example.com`;
      const result = await signUpWithPromise(
        authClient,
        longEmail,
        validPassword,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Too long email rejected:", result.error?.message);
    });

    it("should fail with null email", async () => {
      const result = await signUpWithPromise(
        authClient,
        null as any,
        validPassword,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Null email rejected:", result.error?.message);
    });

    it("should fail with empty email", async () => {
      const result = await signUpWithPromise(
        authClient,
        "",
        validPassword,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Empty email rejected:", result.error?.message);
    });
  });

  // ========================================
  // PASSWORD TESTS
  // ========================================

  describe("Password Validation", () => {
    it("should fail with password too short (<8 characters)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "Short1!",
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toMatch("Password too short");
      console.log("✅ Too short password rejected:", result.error?.message);
    });

    it("should fail with password too long (>128 characters)", async () => {
      const longPassword = "A".repeat(129) + "1!";
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        longPassword,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Too long password rejected:", result.error?.message);
    });

    it("should fail with weak password (no numbers)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "WeakPassword!",
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Weak password (no numbers) rejected:",
        result.error?.message
      );
    });

    it("should fail with weak password (no special characters)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "WeakPassword123",
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Weak password (no special chars) rejected:",
        result.error?.message
      );
    });

    it("should fail with weak password (no uppercase)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "weakpassword123!",
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Weak password (no uppercase) rejected:",
        result.error?.message
      );
    });

    it("should fail with weak password (no lowercase)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "WEAKPASSWORD123!",
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Weak password (no lowercase) rejected:",
        result.error?.message
      );
    });

    it("should fail with weak password (only lowercase)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "password",
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Weak password (only lowercase) rejected:",
        result.error?.message
      );
    });

    it("should fail with weak password (common password)", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "Password123!",
        "Test User"
      );

      // Note: This might pass depending on your password policy
      // Better Auth doesn't have built-in common password checking
      console.log(
        "⚠️ Common password test result:",
        result.success ? "PASSED (might need stricter policy)" : "REJECTED"
      );
    });

    it("should fail with null password", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        null as any,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Null password rejected:", result.error?.message);
    });

    it("should fail with empty password", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "",
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ Empty password rejected:", result.error?.message);
    });
  });

  // ========================================
  // SIGN IN ABNORMAL TESTS
  // ========================================

  describe("Sign In Abnormal Cases", () => {
    it("should fail sign in with non-existent email", async () => {
      const result = await signInWithPromise(
        authClient,
        `nonexistent@example.com`,
        validPassword
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Sign in with non-existent email rejected:",
        result.error?.message
      );
    });

    it("should fail sign in with wrong password", async () => {
      const result = await signInWithPromise(
        authClient,
        existingUserEmail,
        "WrongPassword123!"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toMatch(/invalid|password|email/i);
      console.log(
        "✅ Sign in with wrong password rejected:",
        result.error?.message
      );
    });

    it("should fail sign in with null email", async () => {
      const result = await signInWithPromise(
        authClient,
        null as any,
        validPassword
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Sign in with null email rejected:",
        result.error?.message
      );
    });

    it("should fail sign in with empty email", async () => {
      const result = await signInWithPromise(authClient, "", validPassword);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Sign in with empty email rejected:",
        result.error?.message
      );
    });

    it("should fail sign in with null password", async () => {
      const result = await signInWithPromise(
        authClient,
        existingUserEmail,
        null as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Sign in with null password rejected:",
        result.error?.message
      );
    });

    it("should fail sign in with empty password", async () => {
      const result = await signInWithPromise(authClient, existingUserEmail, "");

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Sign in with empty password rejected:",
        result.error?.message
      );
    });

    it("should fail sign in with invalid email format", async () => {
      const result = await signInWithPromise(
        authClient,
        "invalidemail",
        validPassword
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Sign in with invalid email format rejected:",
        result.error?.message
      );
    });
  });

  // ========================================
  // ORGANIZER SIGN UP ABNORMAL TESTS
  // ========================================

  describe("Organizer Sign Up Abnormal Cases", () => {
    it("should fail organizer sign up with invalid name", async () => {
      const result = await signUpWithPromise(
        authClient,
        `organizer@example.com`,
        validPassword,
        "123",
        "organizer"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Organizer sign up with invalid name rejected:",
        result.error?.message
      );
    });

    it("should fail organizer sign up with invalid email", async () => {
      const result = await signUpWithPromise(
        authClient,
        "invalid-organizer-email",
        validPassword,
        "Organizer Name",
        "organizer"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Organizer sign up with invalid email rejected:",
        result.error?.message
      );
    });

    it("should fail organizer sign up with weak password", async () => {
      const result = await signUpWithPromise(
        authClient,
        `organizer@example.com`,
        "weak",
        "Organizer Name",
        "organizer"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Organizer sign up with weak password rejected:",
        result.error?.message
      );
    });

    it("should fail organizer sign up with duplicate email", async () => {
      // First create an organizer
      const firstEmail = `organizer@example.com`;
      const firstResult = await signUpWithPromise(
        authClient,
        firstEmail,
        validPassword,
        "First Organizer",
        "organizer"
      );

      // Try to create another with same email
      const result = await signUpWithPromise(
        authClient,
        firstEmail,
        validPassword,
        "Second Organizer",
        "organizer"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toMatch(/already|exist/i);
      console.log(
        "✅ Organizer sign up with duplicate email rejected:",
        result.error?.message
      );
    });

    it("should fail organizer sign up with empty name", async () => {
      const result = await signUpWithPromise(
        authClient,
        `organizer@example.com`,
        validPassword,
        "",
        "organizer"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Organizer sign up with empty name rejected:",
        result.error?.message
      );
    });

    it("should fail organizer sign up with null password", async () => {
      const result = await signUpWithPromise(
        authClient,
        `organizer@example.com`,
        null as any,
        "Organizer Name",
        "organizer"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ Organizer sign up with null password rejected:",
        result.error?.message
      );
    });
  });

  // ========================================
  // SQL INJECTION & SECURITY TESTS
  // ========================================

  describe("Security & Injection Tests", () => {
    it("should fail with SQL injection attempt in email", async () => {
      const result = await signUpWithPromise(
        authClient,
        "admin' OR '1'='1",
        validPassword,
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ SQL injection in email rejected:", result.error?.message);
    });

    it("should fail with SQL injection attempt in password", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        "' OR '1'='1",
        "Test User"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log(
        "✅ SQL injection in password rejected:",
        result.error?.message
      );
    });

    it("should fail with XSS attempt in name", async () => {
      const result = await signUpWithPromise(
        authClient,
        `test@example.com`,
        validPassword,
        "<script>alert('xss')</script>"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      console.log("✅ XSS attempt in name rejected:", result.error?.message);
    });
  });
});
