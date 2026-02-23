/**
 * Crypto Module Index
 * 
 * Exports all crypto utilities for the application.
 */

const cryptoService = require('./crypto');

// Initialize crypto service with key from environment
if (process.env.ENCRYPTION_KEY) {
  cryptoService.initializeWithKey(process.env.ENCRYPTION_KEY);
}

module.exports = cryptoService;
