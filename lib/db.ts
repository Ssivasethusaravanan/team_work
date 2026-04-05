const encoder = new TextEncoder();

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  tenantId: string;
  role: string;
  createdAt: string;
}

// Global state workaround for hot reloading
const globalUsers = global as any;
if (!globalUsers.users) {
  globalUsers.users = new Map<string, User>();
}
const users: Map<string, User> = globalUsers.users;

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

// --- Database Operations ---

export async function getUserByEmail(email: string): Promise<User | null> {
  // If no users exist, seed the default admin
  if (users.size === 0 && email === "user@example.com") {
    const passwordHash = await hashPassword("password123");
    await createUser({
      email: "user@example.com",
      name: "Saravanan",
      passwordHash,
      tenantId: "100",
      role: "Enterprise Admin"
    });
  }
  return users.get(email) || null;
}

export async function createUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
  const id = Math.random().toString(36).substring(7);
  const newUser: User = {
    ...data,
    id,
    createdAt: new Date().toISOString()
  };
  users.set(newUser.email, newUser);
  return newUser;
}
