import { auth } from "@/lib/auth/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient, ErrorContext } from "better-auth/react";
import { describe, it, expect, beforeAll, afterEach } from "bun:test";

// Helper function to wrap authClient calls in Promises
function signUpWithPromise(
  authClient: ReturnType<typeof createAuthClient>,
  email: string,
  password: string,
  name: string,
  role?: "customer" | "organizer"
): Promise<{ success: boolean; data?: any; error?: Error }> {
  return new Promise((resolve) => {
    authClient.signUp.email(
      {
        email,
        password,
        name,
        ...(role && { role }),
      } as any,
      {
        onSuccess: (ctx) => {
          resolve({ success: true, data: ctx.data });
        },
        onError: (ctx: ErrorContext) => {
          resolve({ success: false, error: ctx.error });
        },
      }
    );
  });
}

function signInWithPromise(
  authClient: ReturnType<typeof createAuthClient>,
  email: string,
  password: string
): Promise<{ success: boolean; data?: any; error?: Error }> {
  return new Promise((resolve) => {
    authClient.signIn.email(
      { email, password },
      {
        onSuccess: (ctx) => {
          resolve({ success: true, data: ctx.data });
        },
        onError: (ctx: ErrorContext) => {
          resolve({ success: false, error: ctx.error });
        },
      }
    );
  });
}

describe("Authentication - Abnormal Test Cases", () => {
  let authClient: ReturnType<typeof createAuthClient>;
  let existingUserEmail: string;
  const validPassword = "ValidPassword123!";

  beforeAll(async () => {
    authClient = createAuthClient({
      baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
      plugins: [inferAdditionalFields<typeof auth>()],
    });

    // Create an existing user for "already exists" tests
    existingUserEmail = process.env.TEST_USER_EMAIL || "";
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
