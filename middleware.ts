import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Using the same secret key as lib/auth.ts
const secretKey = process.env.JWT_SECRET || "secret_key_v1_secure_8822";
const key = new TextEncoder().encode(secretKey);

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  // 1. If trying to access dashboard without a session -> /login
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    try {
      await jwtVerify(session, key);
      return NextResponse.next();
    } catch (e) {
      // Invalid session -> clear it and go to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session");
      return response;
    }
  }

  // 2. If trying to access login with a valid session -> /dashboard
  if (pathname.startsWith("/login") && session) {
    try {
      await jwtVerify(session, key);
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
