import crypto from "crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const secret = process.env.AI_KEYS_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function isEncrypted(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Cifra una clave con AES-256-GCM. Si no hay secreto configurado, devuelve el valor tal cual. */
export function encryptSecret(plain: string): string {
  if (!plain || isEncrypted(plain)) return plain;
  const key = getKey();
  if (!key) return plain;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/** Descifra una clave cifrada. Si viene en texto plano la devuelve igual. */
export function decryptSecret(value: string | null | undefined): string {
  if (!value) return "";
  if (!isEncrypted(value)) return value;

  const key = getKey();
  if (!key) return "";

  try {
    const [, , ivB64, tagB64, dataB64] = value.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

/** Devuelve solo los últimos 4 caracteres, nunca la clave completa. */
export function maskSecret(value: string | null | undefined): string {
  const plain = decryptSecret(value);
  return plain ? `****${plain.slice(-4)}` : "****";
}
