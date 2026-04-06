import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "../../../../backend/services/auth.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;
    const { email, password } = body;

    // Use Backend Service (Invisible to Client)
    const user = await AuthService.login(email, password);
    
    if (user) {
      await AuthService.setSession(user);

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
