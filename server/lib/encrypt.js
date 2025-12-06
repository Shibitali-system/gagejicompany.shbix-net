// server/lib/encrypt.js
import crypto from "crypto";

/**
 * encrypt(dataString, encryptionKey)
 * - dataString: string (JSON)
 * - encryptionKey: 32-byte string (as in your PHP example)
 *
 * PHP did:
 * $iv = bin2hex(openssl_random_pseudo_bytes(8));
 * $raw = openssl_encrypt($data, 'AES-256-CBC', $encryptionkey, OPENSSL_RAW_DATA, $iv);
 * $encryptedata = $iv . base64_encode($raw);
 *
 * We'll replicate: IV (8 bytes) hex-encoded concatenated with base64(rawEncrypted)
 */
export function encrypt(dataString, encryptionKey) {
  // Ensure encryptionKey is 32 bytes. If shorter/longer you may need to adjust
  const keyBuf = Buffer.from(encryptionKey, "utf8");

  // 8 random bytes for IV to match PHP's bin2hex(openssl_random_pseudo_bytes(8))
  const iv8 = crypto.randomBytes(8); // 8 bytes

  // AES-256-CBC requires 16-byte IV. We'll pad with zeros to 16 bytes (like PHP openssl will expect)
  const iv16 = Buffer.concat([iv8, Buffer.alloc(8, 0)]); // 16 bytes

  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuf, iv16);
  const encrypted = Buffer.concat([cipher.update(dataString, "utf8"), cipher.final()]);

  const encryptedBase64 = encrypted.toString("base64");
  // return iv(hex) + base64(encrypted)
  return iv8.toString("hex") + encryptedBase64;
}
