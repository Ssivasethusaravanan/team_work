import { NextRequest, NextResponse } from "next/server";
import { sc_decrypt, sc_encrypt } from "../../../lib/crypto";
import { AuthService } from "../../../backend/services/auth.service";

/**
 * STEALTH GATEWAY: Central entry point for all API traffic.
 * Decrypts in-bound requests, routes them to services, and encrypts responses.
 */
export async function POST(request: NextRequest) {
  try {
    const encryptedBody = await request.text();
    const { target, payload } = await sc_decrypt(encryptedBody);

    let result: any;

    // --- Dynamic Routing (Stealth BFF Dispatcher) ---
    switch (target) {
      case "auth/login":
        const { email, password } = payload;
        const user = await AuthService.login(email, password);
        if (user) {
          await AuthService.setSession(user);
          result = { user: { email: user.email, name: user.name } };
        } else {
          return new NextResponse(await sc_encrypt({ error: "Invalid credentials" }), { status: 401 });
        }
        break;

      case "auth/register":
        const newUser = await AuthService.register(payload);
        if (newUser) {
          await AuthService.setSession(newUser);
          result = { user: { email: newUser.email, name: newUser.name } };
        } else {
          return new NextResponse(await sc_encrypt({ error: "Registration failed" }), { status: 400 });
        }
        break;

      case "auth/logout":
        await AuthService.logout();
        result = { success: true };
        break;

      default:
        return new NextResponse(await sc_encrypt({ error: "Action not permitted" }), { status: 404 });
    }

    // --- Return Encrypted Response ---
    const encryptedResponse = await sc_encrypt(result);
    return new NextResponse(encryptedResponse, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("Stealth Gateway Error:", error);
    const errPayload = await sc_encrypt({ error: "Gateway failure" });
    return new NextResponse(errPayload, { status: 500 });
  }
}
