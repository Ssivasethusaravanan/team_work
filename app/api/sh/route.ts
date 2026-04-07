import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sc_decrypt, sc_encrypt, importRawKey } from "../../../lib/crypto";
import { AuthService } from "../../../backend/services/auth.service";

/**
 * STEALTH GATEWAY: Central entry point for all API traffic.
 * Uses dynamic session-based shared secrets for maximum security.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Retrieve the session secret from HTTP-only cookie
    const cookieStore = await cookies();
    const encryptedSecret = cookieStore.get("__sc_secret")?.value;

    if (!encryptedSecret) {
      // Handsake required
      return new NextResponse("Stealth session expired", { status: 401 });
    }

    // 2. Decrypt the secret using Backend Master Key
    const { rawSecret } = await AuthService.decrypt(encryptedSecret);
    const sessionKey = await importRawKey(rawSecret);

    // 3. Decrypt the incoming Stealth Payload
    const encryptedBody = await request.text();
    const { target, payload } = await sc_decrypt(encryptedBody, sessionKey);

    let result: any;

    // --- Dynamic Routing (Stealth BFF Dispatcher) ---
    switch (target) {
      case "auth/login":
        const { email, password } = payload;
        const userFound = await AuthService.login(email, password);
        if (userFound) {
          await AuthService.setSession(userFound);
          result = { user: { email: userFound.email, name: userFound.name } };
        } else {
          const errBody = await sc_encrypt({ error: "Invalid credentials" }, sessionKey);
          return new NextResponse(errBody, { status: 401 });
        }
        break;

      case "auth/register":
        const newUser = await AuthService.register(payload);
        if (newUser) {
          await AuthService.setSession(newUser);
          result = { user: { email: newUser.email, name: newUser.name } };
        } else {
          const errBody = await sc_encrypt({ error: "Registration failed" }, sessionKey);
          return new NextResponse(errBody, { status: 400 });
        }
        break;

      case "auth/logout":
        await AuthService.logout();
        result = { success: true };
        break;

      case "user/me":
        const sessionPayload = await AuthService.getSession();
        if (sessionPayload && sessionPayload.user) {
          result = { user: sessionPayload.user };
        } else {
          const errBody = await sc_encrypt({ error: "Session not found" }, sessionKey);
          return new NextResponse(errBody, { status: 401 });
        }
        break;

      default:
        const errBody = await sc_encrypt({ error: "Action not permitted" }, sessionKey);
        return new NextResponse(errBody, { status: 404 });
    }

    // --- Return Encrypted Response ---
    const encryptedResponse = await sc_encrypt(result, sessionKey);
    return new NextResponse(encryptedResponse, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("Stealth Gateway Error (Pro Mode):", error);
    // Note: We cannot encryption the response if decryption failed without causing an infinite handshake loop
    return new NextResponse("Gateway failure", { status: 500 });
  }
}
