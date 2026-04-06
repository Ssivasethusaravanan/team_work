import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "../../../../backend/services/auth.service";

export async function POST(request: NextRequest) {
  await AuthService.logout();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303, // See Other to ensure the browser performs a GET on the new URL
  });
}
