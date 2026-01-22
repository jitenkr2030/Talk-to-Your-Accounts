import * as crypto from 'crypto';
import { getConfig } from '../config';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encryption service for securing sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */
export class EncryptionService {
  private key: Buffer;
  private config: ReturnType<typeof getConfig>;

  constructor(configOverride?: { encryption: { key: string; ivLength: number } }) {
    this.config = getConfig();
    const encryptionConfig = configOverride?.encryption || this.config.encryption;
    
    // Derive a proper 32-byte key from the provided key
    this.key = crypto.scryptSync(encryptionConfig.key, 'ttya-salt', 32);
  }

  /**
   * Encrypt plaintext data
   * @param plaintext - Data to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    const iv = crypto.randomBytes(this.config.encryption.ivLength);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + Auth Tag + Encrypted Data
    return Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');
  }

  /**
   * Decrypt encrypted data
   * @param encryptedData - Base64 encoded encrypted data
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) {
      throw new Error('Encrypted data cannot be empty');
    }

    try {
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract IV, Auth Tag, and Encrypted Data
      const iv = combined.subarray(0, this.config.encryption.ivLength);
      const authTag = combined.subarray(
        this.config.encryption.ivLength,
        this.config.encryption.ivLength + TAG_LENGTH
      );
      const encrypted = combined.subarray(this.config.encryption.ivLength + TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: Invalid or corrupted data');
    }
  }

  /**
   * Hash data using SHA-256
   * @param data - Data to hash
   * @returns Hex-encoded hash
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a secure random token
   * @param length - Token length in bytes
   * @returns Hex-encoded random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure API key
   * @returns Formatted API key
   */
  generateApiKey(): string {
    const prefix = 'ttya';
    const key = crypto.randomBytes(24).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.key)
      .update(key)
      .digest('base64url');
    
    return `${prefix}_${key}.${signature}`;
  }

  /**
   * Verify an API key
   * @param apiKey - API key to verify
   * @returns Whether the key is valid
   */
  verifyApiKey(apiKey: string): boolean {
    try {
      const parts = apiKey.split('_')[1]?.split('.');
      if (!parts || parts.length !== 2) {
        return false;
      }

      const [key, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', this.key)
        .update(key)
        .digest('base64url');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Encrypt an object (JSON stringify then encrypt)
   * @param obj - Object to encrypt
   * @returns Encrypted string
   */
  encryptObject(obj: Record<string, unknown>): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt to an object
   * @param encryptedData - Encrypted string
   * @returns Decrypted object
   */
  decryptObject<T>(encryptedData: string): T {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted) as T;
  }
}

// Singleton instance for application-wide use
let encryptionServiceInstance: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}

export { ALGORITHM, SALT_LENGTH, TAG_LENGTH };
