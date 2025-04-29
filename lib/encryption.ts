import { randomBytes, createCipheriv, createDecipheriv } from "crypto"

// Get the encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || randomBytes(32).toString("hex")

// Encrypt data
export async function encrypt(data: string): Promise<string> {
  const iv = randomBytes(16)
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv)

  let encrypted = cipher.update(data, "utf8", "hex")
  encrypted += cipher.final("hex")

  return `${iv.toString("hex")}:${encrypted}`
}

// Decrypt data
export async function decrypt(data: string): Promise<string> {
  const [ivHex, encryptedData] = data.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "hex"), iv)

  let decrypted = decipher.update(encryptedData, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
