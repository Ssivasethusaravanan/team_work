import { getCloudflareContext } from "@opennextjs/cloudflare";

const encoder = new TextEncoder();

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  tenantId: string;
  role: string | null;
  createdAt: string;
}

/**
 * Access the Cloudflare D1 Database binding.
 */
async function getDb() {
  try {
    const { env } = await getCloudflareContext();
    return env.DB;
  } catch (e) {
    console.error("Failed to get Cloudflare context. Ensure you are running in a supported environment.", e);
    return null;
  }
}

// --- Security Helpers ---

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
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

  return `${toHex(salt)}:${toHex(derivedBits)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = fromHex(saltHex);
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

  return toHex(derivedBits) === hashHex;
}

// --- Database Operations (D1 Powered) ---

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first<User>();
    
    return result || null;
  } catch (e) {
    console.error("D1 Query Error (getUserByEmail):", e);
    return null;
  }
}

export async function createUser(data: Omit<User, "id" | "createdAt">): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  const id = crypto.randomUUID();
  const newUser: User = {
    ...data,
    id,
    createdAt: new Date().toISOString()
  };

  try {
    await db
      .prepare(
        "INSERT INTO users (id, name, email, passwordHash, tenantId, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        newUser.id,
        newUser.name,
        newUser.email,
        newUser.passwordHash,
        newUser.tenantId,
        newUser.role || "User",
        newUser.createdAt
      )
      .run();
    
    return newUser;
  } catch (e) {
    console.error("D1 Query Error (createUser):", e);
    return null;
  }
}
