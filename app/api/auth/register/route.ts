import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "../../../../backend/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const { name, email, password } = body;

    // Validation
    if (!name || !email || !password || password.length < 8) {
      return NextResponse.json(
        { message: "Invalid input. Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Hash password using Backend logic
    const passwordHash = await AuthService.hashPassword(password);

    // Register user in Backend D1
    const user = await AuthService.register({
      name,
      email,
      passwordHash,
      tenantId: `tenant_${Math.random().toString(36).substring(7)}`,
      role: "User"
    });

    if (!user) {
      return NextResponse.json(
        { message: "Failed to create user or user already exists" },
        { status: 500 }
      );
    }

    // Set Secure Session Cookie
    await AuthService.setSession(user);

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
