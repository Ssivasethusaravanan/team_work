import { sc_decrypt, sc_encrypt } from "./crypto";

/**
 * STEALTH API CLIENT: Transparently encrypts all requests to /api/sh.
 */
export const api = {
  /**
   * Performs a secure POST request.
   * @param target Internal action (e.g., 'auth/login')
   * @param body Payload to encrypt
   */
  async post(target: string, body: any) {
    // 1. Prepare Stealth Payload
    const encryptedBody = await sc_encrypt({
      target,
      payload: body,
      timestamp: Date.now(),
    });

    // 2. Transmit to Gateway
    const response = await fetch("/api/sh", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: encryptedBody,
    });

    if (!response.ok) {
      throw new Error(`Stealth response error: ${response.status}`);
    }

    // 3. Receive and Decrypt
    const encryptedResult = await response.text();
    const result = await sc_decrypt(encryptedResult);

    return result;
  },

  async get(target: string) {
    // For GETs, we still use the gateway but with query params or encrypted headers
    // but typically sensitive GETs are also POSTed in a BFF to mask the action.
    return this.post(target, {});
  }
};
