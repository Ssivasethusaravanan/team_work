/**
 * STEALTH CRYPTO: AES-256-GCM Implementation
 * Securely masks JSON payloads from DevTools inspection.
 */

// In production, this should matched against a server-only environment variable.
const SC_KEY_STR = "STEALTH_SECURE_PAYLOAD_KEY_32_CH"; // Must be 32 chars for AES-256

/**
 * Derives a CryptoKey from the shared secret string.
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SC_KEY_STR);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a JSON payload into a Base64 string.
 */
export async function sc_encrypt(payload: any): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Combine IV + Encrypted Data for easy transport
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  
  return `${ivBase64}.${encryptedBase64}`;
}

/**
 * Decrypts a Base64 string back into a JSON payload.
 */
export async function sc_decrypt(input: string): Promise<any> {
  const [ivBase64, encryptedBase64] = input.split(".");
  if (!ivBase64 || !encryptedBase64) throw new Error("Invalid stealth payload format");

  const key = await getCryptoKey();
  const iv = new Uint8Array(atob(ivBase64).split("").map((c) => c.charCodeAt(0)));
  const encryptedData = new Uint8Array(atob(encryptedBase64).split("").map((c) => c.charCodeAt(0)));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted));
}
