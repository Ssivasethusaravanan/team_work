import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET || "secret_key_v1_secure_8822";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  
  const payload = await decrypt(session);
  if (!payload || !payload.user) return null; // Force login if structure is old/invalid
  
  return payload;
}

export async function logout() {
  cookies().set("session", "", { expires: new Date(0), httpOnly: true, path: "/" });
}
