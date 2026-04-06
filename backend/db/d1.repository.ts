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
