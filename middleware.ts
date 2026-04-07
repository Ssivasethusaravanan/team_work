import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "./backend/services/session.service";

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  // 1. PROTECT DASHBOARD: Redirect to login if no valid session
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    try {
      // Use Session Service for verification (Edge compatible)
      await SessionService.decrypt(session);
      return NextResponse.next();
    } catch (e) {
      // Invalid session -> clear it and go to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session");
      return response;
    }
  }

  // 2. PROTECT AUTH FLOW: Redirect to dashboard if already logged in
  if (pathname.startsWith("/login") && session) {
    try {
      await SessionService.decrypt(session);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch (e) {
      // Invalid session -> allow login page to show
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
