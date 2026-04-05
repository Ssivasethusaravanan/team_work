import { NextRequest, NextResponse } from "next/server";
import { logout } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  await logout();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303, // See Other to ensure the browser performs a GET on the new URL
  });
}
