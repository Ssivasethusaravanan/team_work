import { SignJWT, jwtVerify } from "jose";

// The secret stays on the server, invisible to the client
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_local_dev"
);

/**
 * SESSION SERVICE: Lightweight JWT management for Edge Runtime compatibility.
 */
export class SessionService {
  /**
   * ENCRYPT: SIGN A JWT TOKEN
   */
  static async encrypt(payload: any): Promise<string> {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(secret);
  }

  /**
   * DECRYPT: VERIFY A JWT TOKEN
   */
  static async decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, secret, {
      algorithms: ["HS256"],
    });
    return payload;
  }
}
