import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { 
  generateHandshakeKeys, 
  exportPublicKey, 
  importPublicKey, 
  deriveSharedSecret, 
  exportRawKey 
} from "../../../../lib/crypto";
import { AuthService } from "../../../../backend/services/auth.service";

/**
 * PRO STEALTH HANDSHAKE: Performs ECDH key exchange.
 * No shared secret is ever transmitted over the wire.
 */
export async function POST(request: NextRequest) {
  try {
    const { clientPublicKey } = await request.json() as { clientPublicKey?: string };
    if (!clientPublicKey) return NextResponse.json({ error: "Missing client key" }, { status: 400 });

    // 1. Import Client's Public Key
    const remotePublic = await importPublicKey(clientPublicKey);

    // 2. Generate Server's Handshake Keys
    const serverKeyPair = await generateHandshakeKeys();

    // 3. Derive the Shared Secret
    const sharedKey = await deriveSharedSecret(serverKeyPair.privateKey, remotePublic);

    // 4. Export Raw Secret and Encrypt for Session Storage
    // We store this in an HTTP-only cookie so the server can retrieve it for /api/sh calls.
    const rawSecret = await exportRawKey(sharedKey);
    const encryptedSecret = await AuthService.encrypt({ rawSecret });

    const cookieStore = await cookies();
    cookieStore.set("__sc_secret", encryptedSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    // 5. Return Server's Public Key to Client
    const serverPublicKey = await exportPublicKey(serverKeyPair.publicKey);
    return NextResponse.json({ serverPublicKey });

  } catch (error) {
    console.error("Stealth Handshake Error:", error);
    return NextResponse.json({ error: "Handshake failed" }, { status: 500 });
  }
}
