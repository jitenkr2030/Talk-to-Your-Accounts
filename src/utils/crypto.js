/**
 * Crypto Service
 * 
 * Provides encryption and decryption utilities for sensitive data storage.
 * Uses AES-256-CBC encryption with secure key derivation.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Configuration
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16; // For GCM mode
const KEY_LENGTH = 32;

/**
 * Generate a new encryption key
 * @returns {string} Hex-encoded 256-bit key
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Generate a random initialization vector
 * @returns {Buffer} 16-byte IV
 */
function generateIV() {
  return crypto.randomBytes(IV_LENGTH);
}

/**
 * Create encryption key from password using PBKDF2
 * @param {string} password Password to derive key from
 * @param {Buffer} salt Salt for key derivation
 * @returns {Buffer} 256-bit key
 */
function deriveKeyFromPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt plaintext using AES-256-CBC
 * @param {string} plaintext Text to encrypt
 * @param {string} key Hex-encoded encryption key (optional, uses env key)
 * @returns {Object} Encrypted data with IV
 */
function encrypt(plaintext, key = null) {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty');
  }
  
  // Get encryption key
  const encryptionKey = key || getEncryptionKey();
  
  // Generate random IV
  const iv = generateIV();
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  
  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    content: encrypted,
    iv: iv.toString('hex'),
    algorithm: ALGORITHM
  };
}

/**
 * Decrypt ciphertext using AES-256-CBC
 * @param {string} encryptedText Hex-encoded encrypted text
 * @param {string} ivHex Hex-encoded initialization vector
 * @param {string} key Hex-encoded encryption key (optional, uses env key)
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedText, ivHex, key = null) {
  if (!encryptedText || !ivHex) {
    throw new Error('Encrypted text and IV are required');
  }
  
  // Get encryption key
  const encryptionKey = key || getEncryptionKey();
  
  // Create decipher
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  
  // Decrypt
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt object to storage
 * @param {Object} obj Object to encrypt
 * @param {string} key Encryption key
 * @returns {Object} Encrypted object with IV
 */
function encryptObject(obj, key = null) {
  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString, key);
}

/**
 * Decrypt object from storage
 * @param {string} encryptedText Encrypted text
 * @param {string} ivHex Initialization vector
 * @param {string} key Encryption key
 * @returns {Object} Decrypted object
 */
function decryptObject(encryptedText, ivHex, key = null) {
  const jsonString = decrypt(encryptedText, ivHex, key);
  return JSON.parse(jsonString);
}

/**
 * Hash data using SHA-256 (for non-reversible storage)
 * @param {string} data Data to hash
 * @returns {string} Hex-encoded hash
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate secure random token
 * @param {number} length Token length in bytes
 * @returns {string} Hex-encoded random token
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create HMAC signature
 * @param {string} data Data to sign
 * @param {string} key Signature key
 * @returns {string} Hex-encoded signature
 */
function createHMAC(data, key = null) {
  const signatureKey = key || getEncryptionKey();
  return crypto.createHmac('sha256', signatureKey).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data Data to verify
 * @param {string} signature Expected signature
 * @param {string} key Signature key
 * @returns {boolean} True if signature is valid
 */
function verifyHMAC(data, signature, key = null) {
  const expectedSignature = createHMAC(data, key);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Get encryption key from environment or file
 * @returns {string} Hex-encoded encryption key
 */
function getEncryptionKey() {
  // Try environment variable first
  let key = process.env.ENCRYPTION_KEY;
  
  if (key) {
    // Validate key length
    if (key.length !== 64) {
      console.warn('[Crypto] ENCRYPTION_KEY is not 64 characters (256 bits). Regenerating.');
      key = null;
    }
  }
  
  // Fall back to file-based key
  if (!key) {
    const keyPath = path.resolve(__dirname, '../../data/encryption.key');
    
    try {
      if (fs.existsSync(keyPath)) {
        key = fs.readFileSync(keyPath, 'utf8').trim();
      }
    } catch (err) {
      console.error('[Crypto] Failed to read key file:', err.message);
    }
  }
  
  // Generate new key if none exists
  if (!key) {
    console.log('[Crypto] Generating new encryption key');
    key = generateKey();
    
    try {
      const keyDir = path.dirname(keyPath);
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
      }
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
      console.log('[Crypto] Encryption key saved to:', keyPath);
    } catch (err) {
      console.error('[Crypto] Failed to save key file:', err.message);
    }
  }
  
  return key;
}

/**
 * Initialize crypto service with explicit key
 * @param {string} key Hex-encoded encryption key
 */
function initializeWithKey(key) {
  if (key.length !== 64) {
    throw new Error('Key must be 64 hex characters (256 bits)');
  }
  process.env.ENCRYPTION_KEY = key;
}

/**
 * Encrypt sensitive OAuth token data
 * @param {Object} tokenData Token data object
 * @returns {Object} Encrypted token data
 */
function encryptTokenData(tokenData) {
  const accessResult = encrypt(tokenData.accessToken);
  const refreshResult = tokenData.refreshToken 
    ? encrypt(tokenData.refreshToken)
    : { content: null, iv: null };
  
  return {
    accessToken: accessResult.content,
    accessTokenIv: accessResult.iv,
    refreshToken: refreshResult.content,
    refreshTokenIv: refreshResult.iv,
    realmId: tokenData.realmId || null,
    tenantId: tokenData.tenantId || null,
    organizationId: tokenData.organizationId || null,
    expiresAt: tokenData.expiresAt || null
  };
}

/**
 * Decrypt sensitive OAuth token data
 * @param {Object} encryptedData Encrypted token data
 * @returns {Object} Decrypted token data
 */
function decryptTokenData(encryptedData) {
  const accessToken = decrypt(encryptedData.accessToken, encryptedData.accessTokenIv);
  const refreshToken = encryptedData.refreshToken 
    ? decrypt(encryptedData.refreshToken, encryptedData.refreshTokenIv)
    : null;
  
  return {
    accessToken,
    refreshToken,
    realmId: encryptedData.realmId,
    tenantId: encryptedData.tenantId,
    organizationId: encryptedData.organizationId,
    expiresAt: encryptedData.expiresAt
  };
}

// Export all utilities
module.exports = {
  // Core functions
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hash,
  generateToken,
  createHMAC,
  verifyHMAC,
  
  // Key management
  generateKey,
  getEncryptionKey,
  initializeWithKey,
  
  // Token-specific helpers
  encryptTokenData,
  decryptTokenData,
  
  // Constants
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH
};
