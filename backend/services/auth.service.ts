import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getUserByEmail, insertUser, User } from "../db/d1.repository";

// The secret stays on the server, invisible to the client
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_local_dev"
);

/**
 * AUTH SERVICE: High-level business logic for user authentication.
 * This is the "Backend" heart of your SaaS.
 */
export class AuthService {
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

  /**
   * HASH PASSWORD: USES WEB CRYPTO PBKDF2 (100,000 ITERATIONS)
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256
    );

    return `${this.toHex(salt)}:${this.toHex(derivedBits)}`;
  }

  /**
   * VERIFY PASSWORD: COMPARES PASSWORD TO STORED HASH (SECURE TIMING)
   */
  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, hashHex] = storedHash.split(":");
    if (!saltHex || !hashHex) return false;

    const salt = this.fromHex(saltHex);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256
    );

    return this.toHex(derivedBits) === hashHex;
  }

  /**
   * REGSITER: CREATE A NEW USER AND CLOUD-D1 ACCOUNT
   */
  static async register(userData: Omit<User, "id" | "createdAt">): Promise<User | null> {
    const id = crypto.randomUUID();
    const newUser: User = { 
      ...userData, 
      id, 
      createdAt: new Date().toISOString() 
    };

    const success = await insertUser(newUser);
    return success ? newUser : null;
  }

  /**
   * LOGIN: VERIFY CREDENTIALS AND RETURN THE USER
   */
  static async login(email: string, pass: string): Promise<User | null> {
    const user = await getUserByEmail(email);
    if (!user) return null;

    const isValid = await this.verifyPassword(pass, user.passwordHash);
    return isValid ? user : null;
  }

  /**
   * SESSION MANAGEMENT (HTTP-ONLY COOKIES)
   */
  static async setSession(user: User) {
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const session = await this.encrypt({ 
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
  }

  static async getSession(): Promise<any> {
    const session = (await cookies()).get("session")?.value;
    if (!session) return null;
    return await this.decrypt(session);
  }

  static async logout() {
    (await cookies()).set("session", "", { expires: new Date(0) });
  }

  // --- Helpers ---
  private static toHex(buffer: ArrayBuffer | Uint8Array): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private static fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}
