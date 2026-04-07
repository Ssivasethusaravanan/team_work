/**
 * PRO STEALTH CRYPTO: ECDH + AES-256-GCM
 * Session-based key exchange ensures unique, unhackable encryption.
 */

/**
 * 1. GENERATE HANDSHAKE KEYS: Client/Server create a temporary P-256 key pair.
 */
export async function generateHandshakeKeys(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
}

/**
 * 2. EXPORT PUBLIC KEY: Turn CryptoKey into Base64 for transport.
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * 3. IMPORT PUBLIC KEY: Turn Base64 into CryptoKey for derivation.
 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const binary = new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0)));
  return await crypto.subtle.importKey(
    "spki",
    binary,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

/**
 * 4. DERIVE SHARED SECRET: Compute the final 256-bit AES key.
 */
export async function deriveSharedSecret(localPrivate: CryptoKey, remotePublic: CryptoKey): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    { name: "ECDH", public: remotePublic },
    localPrivate,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * 5. ENCRYPT A PAYLOAD
 * Accepts a dynamic CryptoKey (Session Key).
 */
export async function sc_encrypt(payload: any, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const ivBase64 = btoa(String.fromCharCode(...iv));
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  
  return `${ivBase64}.${encryptedBase64}`;
}

/**
 * 6. DECRYPT A PAYLOAD
 */
export async function sc_decrypt(input: string, key: CryptoKey): Promise<any> {
  const [ivBase64, encryptedBase64] = input.split(".");
  if (!ivBase64 || !encryptedBase64) throw new Error("Invalid stealth payload format");

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

/**
 * 7. SESSION KEY UTILS: Raw Import/Export for Server-side cookie storage.
 */
export async function exportRawKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importRawKey(base64: string): Promise<CryptoKey> {
  const binary = new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0)));
  return await crypto.subtle.importKey(
    "raw",
    binary,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}
