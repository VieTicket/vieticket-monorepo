// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth/auth";

export async function middleware(req: NextRequest) {
  const data = await auth.api.getSession({
    query: {
      disableCookieCache: true,
    },
    headers: req.headers,
  });

  const pathname = req.nextUrl.pathname;
  const role = (data?.user as { role?: string })?.role;

  // Handle admin routes
  if (pathname.startsWith("/admin")) {
    // If not authenticated, redirect to login
    if (!data) {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }
    
    // If not admin role, redirect to not-found page
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/not-found", req.url));
    }
  }

  // Handle organizer routes
  if (pathname.startsWith("/organizer")) {
    // If not authenticated, redirect to login
    if (!data) {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }
    
    // If customer role, redirect to home
    if (role === "customer") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    
    // If admin role, redirect to admin dashboard
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/organizer/:path*", "/admin/:path*"],
};

