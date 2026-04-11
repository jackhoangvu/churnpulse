import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "$lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function readKey(): Buffer | null {
  const value = env.tokenEncryptionKey;

  if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
    return null;
  }

  return Buffer.from(value, "hex");
}

export function encryptToken(plaintext: string): string {
  const key = readKey();

  if (!key || !plaintext) {
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}.${authTag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptStoredToken(ciphertext: string | null): string | null {
  if (!ciphertext) {
    return null;
  }

  const key = readKey();
  const parts = ciphertext.split(".");

  if (!key || parts.length !== 3) {
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  if (!ivHex || !authTagHex || !encryptedHex) {
    return ciphertext;
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return ciphertext;
  }
}
