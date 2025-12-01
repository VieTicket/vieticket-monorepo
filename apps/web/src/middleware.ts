import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth/auth";
import { db } from "@vieticket/db/pg/direct";
import { user, Role } from "@vieticket/db/pg/schema";

// Type for role-based endpoint configuration
type PermissionMap = {
  roles: Role[];
  endpoints: string[];
}[];

const permissionMap: PermissionMap = [
  {
    roles: ["admin"],
    endpoints: ["/admin/*"],
  },
  {
    roles: ["organizer", "customer"],
    endpoints: ["/organizer/*", "/inspector/*", "/seat-map/*"],
  },
  {
    roles: ["customer"],
    endpoints: ["/orders/*", "/checkout/*"],
  },
];

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/events/*",
  "/event/*",
  "/auth/*",
  "/api/auth/*",
  "/api/events/*",
  "/error",
  "/error/*", // Add error routes as public
  "/about",
  "/contact",
  "/search",
];

// Routes that require authentication but no specific role
const protectedRoutes = [
  "/profile/*",
  "/orders/*",
  "/checkout/*",
  "/api/checkout/*",
  "/api/profile/*",
  "/api/sign-cloudinary-params",
  "/accept-invitation/*",
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => {
    if (route.endsWith("/*")) {
      return pathname.startsWith(route.slice(0, -2));
    }
    return pathname === route;
  });
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => {
    if (route.endsWith("/*")) {
      return pathname.startsWith(route.slice(0, -2));
    }
    return pathname === route;
  });
}

function getAllowedRoles(pathname: string): Role[] | null {
  for (const { roles, endpoints } of permissionMap) {
    for (const endpoint of endpoints) {
      if (endpoint.endsWith("/*")) {
        if (pathname.startsWith(endpoint.slice(0, -2))) {
          return roles;
        }
      } else if (pathname === endpoint) {
        return roles;
      }
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes that better-auth handles
  if (["/api/auth/"].some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Always allow access to error pages to prevent redirect loops
  if (pathname.startsWith("/error")) {
    return NextResponse.next();
  }

  let response: NextResponse = NextResponse.next();

  try {
    // Get session from better-auth
    const session = await auth.api.getSession({
      query: {
        disableCookieCache: true,
      },
      headers: request.headers,
    });

    // If no session, handle based on route type
    if (!session) {
      // Allow public routes without authentication
      if (isPublicRoute(pathname)) {
        response = NextResponse.next();
      }
      // Redirect to login for protected routes
      else if (isProtectedRoute(pathname) || getAllowedRoles(pathname)) {
        const loginUrl = new URL("/auth/sign-in", request.url);
        loginUrl.searchParams.set("redirectTo", request.url);
        response = NextResponse.redirect(loginUrl);
      }
      // Redirect to login for ALL other routes (protected or role-based)
      else {
        const loginUrl = new URL("/auth/sign-in", request.url);
        loginUrl.searchParams.set("redirectTo", request.url);
        response = NextResponse.redirect(loginUrl);
      }
    } else {
      // User is authenticated - get their role from database
      const userData = await db.query.user.findFirst({
        columns: { role: true, banned: true },
        where: eq(user.id, session.user.id),
        with: {
          organizer: {
            columns: { isActive: true },
          },
        },
      });

      if (!userData) {
        // User exists in session but not in our DB - redirect to error
        response = NextResponse.redirect(
          new URL("/error?message=User not found", request.url)
        );
      }
      // Check if user is banned
      else if (userData.banned) {
        response = NextResponse.redirect(
          new URL("/error?message=Account banned", request.url)
        );
      }
      // Allow /profile/edit for all authenticated users (including inactive organizers)
      else if (pathname === "/profile/edit") {
        response = NextResponse.next();
      }
      // Check if organizer needs to complete profile (but not for /profile/edit)
      else if (
        userData.role === "organizer" &&
        (!userData.organizer || !userData.organizer.isActive) &&
        !isPublicRoute(pathname)
      ) {
        response = NextResponse.redirect(
          new URL(
            "/profile/edit?message=Please complete your profile and wait for admin approval",
            request.url
          )
        );
      }
      // Redirect admins from home page to admin dashboard
      else if (pathname === "/" && userData.role === "admin") {
        response = NextResponse.redirect(new URL("/admin", request.url));
      }
      // Redirect organizers from home page to organizer dashboard
      else if (
        pathname === "/" &&
        userData.role === "organizer" &&
        userData.organizer?.isActive
      ) {
        response = NextResponse.redirect(new URL("/organizer", request.url));
      }
      // Redirect inactive organizers from home page to profile edit
      else if (
        pathname === "/" &&
        userData.role === "organizer" &&
        (!userData.organizer || !userData.organizer.isActive)
      ) {
        response = NextResponse.redirect(new URL("/profile/edit", request.url));
      }
      // For public routes with authenticated users, allow access
      else if (isPublicRoute(pathname)) {
        response = NextResponse.next();
      } else {
        // Check if route requires specific role
        const allowedRoles = getAllowedRoles(pathname);
        if (allowedRoles) {
          if (!allowedRoles.includes(userData.role)) {
            // User doesn't have required role - redirect based on their role
            if (userData.role === "admin") {
              response = NextResponse.redirect(new URL("/admin", request.url));
            } else if (userData.role === "organizer") {
              if (userData.organizer?.isActive) {
                response = NextResponse.redirect(
                  new URL("/organizer", request.url)
                );
              } else {
                response = NextResponse.redirect(
                  new URL("/profile/edit", request.url)
                );
              }
            } else {
              response = NextResponse.redirect(new URL("/", request.url));
            }
          } else if (
            userData.role === "organizer" &&
            allowedRoles.includes("organizer")
          ) {
            // Additional check for organizer routes - must be active
            if (!userData.organizer || !userData.organizer.isActive) {
              response = NextResponse.redirect(
                new URL(
                  "/profile/edit?message=Please complete your profile and wait for admin approval",
                  request.url
                )
              );
            } else {
              response = NextResponse.next();
            }
          } else {
            response = NextResponse.next();
          }
        } else {
          response = NextResponse.next();
        }
      }
    }
  } catch (error) {
    console.error("Middleware error:", error);

    // If there's an error checking auth, redirect to login for protected routes
    if (isProtectedRoute(pathname) || getAllowedRoles(pathname)) {
      const loginUrl = new URL("/auth/sign-in", request.url);
      loginUrl.searchParams.set("redirectTo", request.url);
      response = NextResponse.redirect(loginUrl);
    } else {
      response = NextResponse.next();
    }
  }

  return response;
}

// Specify the paths that the middleware should apply to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - _vercel/speed-insights (Vercel Speed Insights)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|_vercel/speed-insights).*)",
  ],
  runtime: "nodejs",
};
