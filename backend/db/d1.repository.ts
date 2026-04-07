import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Define the User interface for our database
 */
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  tenantId: string;
  role: string | null;
  createdAt?: string;
  lastLogin?: string;
}

export interface Authenticator {
  credentialID: string;
  userId: string;
  publicKey: string; // Base64
  counter: number;
  transports?: string; // JSON string
  fmt: string;
}

/**
 * Define the Cloudflare environment interface for type safety.
 */
interface CloudflareEnv {
  DB: D1Database;
}

/**
 * Access the Cloudflare D1 Database binding.
 */
async function getDb() {
  try {
    const { env } = await getCloudflareContext();
    return (env as unknown as CloudflareEnv).DB;
  } catch (e) {
    console.error("Failed to get Cloudflare context. Ensure you are running in a supported environment.", e);
    return null;
  }
}

/**
 * FETCH USER: Find a user by email in Cloudflare D1
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    return await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first<User>();
  } catch (e) {
    console.error("D1 Repository Error (getUserByEmail):", e);
    return null;
  }
}

/**
 * INSERT USER: Create a new user record in Cloudflare D1
 */
export async function insertUser(userData: User): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .prepare(
        "INSERT INTO users (id, name, email, passwordHash, tenantId, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        userData.id,
        userData.name,
        userData.email,
        userData.passwordHash,
        userData.tenantId,
        userData.role || "User",
        userData.createdAt
      )
      .run();
    return true;
  } catch (e) {
    console.error("D1 Repository Error (insertUser):", e);
    return false;
  }
}

/**
 * UPDATE LAST LOGIN: Update the user's last login timestamp
 */
export async function updateLastLogin(id: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const timestamp = new Date().toISOString();
    await db
      .prepare("UPDATE users SET lastLogin = ? WHERE id = ?")
      .bind(timestamp, id)
      .run();
    return true;
  } catch (e) {
    console.error("D1 Repository Error (updateLastLogin):", e);
    return false;
  }
}

/**
 * GET AUTHENTICATORS: Find all authenticators for a user
 */
export async function getAuthenticatorsByUserId(userId: string): Promise<Authenticator[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const results = await db
      .prepare("SELECT * FROM authenticators WHERE userId = ?")
      .bind(userId)
      .all<Authenticator>();
    return results.results || [];
  } catch (e) {
    console.error("D1 Repository Error (getAuthenticators):", e);
    return [];
  }
}

/**
 * SAVE AUTHENTICATOR: Persist a new biometric device
 */
export async function saveAuthenticator(auth: Authenticator): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .prepare(
        "INSERT INTO authenticators (credentialID, userId, publicKey, counter, transports, fmt) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        auth.credentialID,
        auth.userId,
        auth.publicKey,
        auth.counter,
        auth.transports || null,
        auth.fmt
      )
      .run();
    return true;
  } catch (e) {
    console.error("D1 Repository Error (saveAuthenticator):", e);
    return false;
  }
}

/**
 * UPDATE COUNTER: Prevent replay attacks
 */
export async function updateAuthenticatorCounter(credentialID: string, counter: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .prepare("UPDATE authenticators SET counter = ? WHERE credentialID = ?")
      .bind(counter, credentialID)
      .run();
    return true;
  } catch (e) {
    console.error("D1 Repository Error (updateCounter):", e);
    return false;
  }
}
