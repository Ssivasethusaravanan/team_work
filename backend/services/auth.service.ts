import { cookies } from "next/headers";
import { getUserByEmail, insertUser, User } from "../db/d1.repository";
import { SessionService } from "./session.service";

/**
 * AUTH SERVICE: High-level business logic for user authentication.
 * This is the "Backend" heart of your SaaS.
 */
export class AuthService {
  /**
   * ENCRYPT: SIGN A JWT TOKEN
   */
  static async encrypt(payload: any): Promise<string> {
    return await SessionService.encrypt(payload);
  }

  /**
   * DECRYPT: VERIFY A JWT TOKEN
   */
  static async decrypt(input: string): Promise<any> {
    return await SessionService.decrypt(input);
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
    // Persist last login to database
    const { updateLastLogin } = await import("../db/d1.repository");
    await updateLastLogin(user.id);

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

  /**
   * WEB AUTH REGISTER 1: Generate Registration Options
   */
  static async generatePasskeyRegistration(user: User) {
    const { 
      generateRegistrationOptions 
    } = await import("@simplewebauthn/server");
    const { getAuthenticatorsByUserId } = await import("../db/d1.repository");

    const authenticators = await getAuthenticatorsByUserId(user.id);

    const options = await generateRegistrationOptions({
      rpName: "ModelPro SaaS",
      rpID: process.env.NEXT_PUBLIC_RP_ID || "localhost",
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: "none",
      excludeCredentials: authenticators.map(auth => ({
        id: auth.credentialID,
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    });

    // Store challenge in a short-lived cookie for verification
    const cookieStore = await cookies();
    cookieStore.set("registration-challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300, // 5 minutes
    });

    return options;
  }

  /**
   * WEB AUTH REGISTER 2: Verify Registration Response
   */
  static async verifyPasskeyRegistration(user: User, body: any) {
    const { 
      verifyRegistrationResponse 
    } = await import("@simplewebauthn/server");
    const { saveAuthenticator } = await import("../db/d1.repository");
    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get("registration-challenge")?.value;

    if (!expectedChallenge) throw new Error("Registration challenge expired");

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: [
        "https://teamwork.sssspro.com",
        "http://localhost:3000"
      ],
      expectedRPID: process.env.NEXT_PUBLIC_RP_ID || "localhost",
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential, fmt } = verification.registrationInfo;

      await saveAuthenticator({
        credentialID: credential.id,
        userId: user.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        fmt,
        transports: JSON.stringify(credential.transports || []),
      });

      return { success: true };
    }

    return { success: false };
  }

  /**
   * WEB AUTH AUTH 1: Generate Authentication Options
   */
  static async generatePasskeyAuthentication(email: string) {
    const { 
      generateAuthenticationOptions 
    } = await import("@simplewebauthn/server");
    const { getAuthenticatorsByUserId } = await import("../db/d1.repository");

    const user = await getUserByEmail(email);
    if (!user) throw new Error("User not found");

    const authenticators = await getAuthenticatorsByUserId(user.id);

    const options = await generateAuthenticationOptions({
      rpID: process.env.NEXT_PUBLIC_RP_ID || "localhost",
      allowCredentials: authenticators.map(auth => ({
        id: auth.credentialID,
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      userVerification: "preferred",
    });

    // Store challenge in cookie
    const cookieStore = await cookies();
    cookieStore.set("authentication-challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 300,
    });

    return options;
  }

  /**
   * WEB AUTH AUTH 2: Verify Authentication Response
   */
  static async verifyPasskeyAuthentication(email: string, body: any) {
    const { 
      verifyAuthenticationResponse 
    } = await import("@simplewebauthn/server");
    const { 
      getAuthenticatorsByUserId, 
      updateAuthenticatorCounter 
    } = await import("../db/d1.repository");
    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get("authentication-challenge")?.value;

    const user = await getUserByEmail(email);
    if (!user || !expectedChallenge) throw new Error("Invalid request");

    const authenticators = await getAuthenticatorsByUserId(user.id);
    const auth = authenticators.find(a => a.credentialID === body.id);

    if (!auth) throw new Error("Authenticator not found");

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: [
        "https://teamwork.sssspro.com",
        "http://localhost:3000"
      ],
      expectedRPID: process.env.NEXT_PUBLIC_RP_ID || "localhost",
      credential: {
        id: auth.credentialID,
        publicKey: Buffer.from(auth.publicKey, "base64"),
        counter: auth.counter,
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      await updateAuthenticatorCounter(auth.credentialID, verification.authenticationInfo.newCounter);
      await this.setSession(user);
      return { success: true };
    }

    return { success: false };
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
