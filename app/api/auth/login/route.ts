import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encrypt } from "../../../../lib/auth";
import { getUserByEmail, verifyPassword } from "../../../../lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Fetch user from simulated DB
    const user = await getUserByEmail(email);
    
    // Verify user exists and password is correct
    if (user && (await verifyPassword(password, user.passwordHash))) {
      const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      const session = await encrypt({ 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role
        }, 
        expires 
      });

      cookies().set("session", session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      return NextResponse.json({ 
        message: "Login successful", 
        user: { email: user.email, name: user.name } 
      });
    }

    // Security practice: Don't reveal if the email was found or not
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
