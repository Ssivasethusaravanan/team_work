import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail, hashPassword } from "../../../../lib/db";
import { encrypt } from "../../../../lib/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const { name, email, password } = body;

    // Simple validation (Consider using Zod for more robust validation)
    if (!name || !email || !password || password.length < 8) {
      return NextResponse.json(
        { message: "Invalid input. Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await createUser({
      name,
      email,
      passwordHash,
      tenantId: `tenant_${Math.random().toString(36).substring(7)}`,
      role: "User"
    });

    if (!user) {
      return NextResponse.json(
        { message: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create session
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

    const cookieStore = await cookies();
    cookieStore.set("session", session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return NextResponse.json({ 
      message: "Registration successful", 
      user: { email: user.email, name: user.name } 
    });

  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
