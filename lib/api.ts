import { 
  generateHandshakeKeys, 
  exportPublicKey, 
  importPublicKey, 
  deriveSharedSecret, 
  sc_encrypt, 
  sc_decrypt 
} from "./crypto";

/**
 * STEALTH API CLIENT: Transparently encrypts all requests.
 * Uses ECDH session-based key exchange for unbreakable security.
 */

let sessionKey: CryptoKey | null = null;

/**
 * AUTOMATIC HANDSHAKE: Negotiates a unique key for this browser session.
 */
async function ensureSessionKey(): Promise<CryptoKey> {
  if (sessionKey) return sessionKey;

  // 1. Generate Handshake Keys
  const clientKeyPair = await generateHandshakeKeys();
  const clientPublicKey = await exportPublicKey(clientKeyPair.publicKey);

  // 2. Transmit Public Key to Server
  const response = await fetch("/api/sh/handshake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientPublicKey }),
  });

  if (!response.ok) throw new Error("Stealth handshake failed");

  // 3. Receive Server's Public Key
  const { serverPublicKey } = (await response.json()) as { serverPublicKey: string };
  const remotePublic = await importPublicKey(serverPublicKey);

  // 4. Derive the Shared Secret
  sessionKey = await deriveSharedSecret(clientKeyPair.privateKey, remotePublic);
  return sessionKey;
}

export const api = {
  /**
   * Performs a secure POST request.
   */
  async post(target: string, body: any) {
    // A. Ensure we have an active session key
    const key = await ensureSessionKey();

    // B. Prepare Stealth Payload
    const encryptedBody = await sc_encrypt({
      target,
      payload: body,
      timestamp: Date.now(),
    }, key);

    // C. Transmit to Gateway
    const response = await fetch("/api/sh", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: encryptedBody,
    });

    if (response.status === 401) {
      // Session expired or handshake needed again
      sessionKey = null;
      throw new Error("Stealth session expired");
    }

    if (!response.ok) {
      throw new Error(`Stealth response error: ${response.status}`);
    }

    // D. Receive and Decrypt
    const encryptedResult = await response.text();
    const result = await sc_decrypt(encryptedResult, key);

    return result;
  },

  async get(target: string) {
    return this.post(target, {});
  }
};
