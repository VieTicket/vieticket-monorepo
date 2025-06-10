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

  if (pathname.startsWith("/organizer") && !data) {
    if (role === "customer") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }
  if (pathname.startsWith("/admin") && !data) {
    if (role === "customer") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (role === "organizer") {
      return NextResponse.redirect(new URL("/organizer", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/organizer/:path*", "/admin/:path*"],
};
