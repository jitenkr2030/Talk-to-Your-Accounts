/**
 * Error Messaging Service
 * 
 * Provides comprehensive error messages with user guidance for all failure scenarios.
 * Implements contextual error codes, user-friendly messages, and troubleshooting guidance.
 */

// Error codes by category
const ERROR_CODES = {
  // Authentication errors (AUTH_xxx)
  AUTH: {
    INVALID_CREDENTIALS: {
      code: 'AUTH001',
      message: 'Invalid credentials provided',
      userMessage: 'The username or PIN you entered is incorrect. Please try again.',
      troubleshooting: [
        'Check if CAPS LOCK is enabled',
        'Verify you are using the correct PIN',
        'Contact administrator if you forgot your PIN'
      ],
      severity: 'error',
      canRetry: true
    },
    ACCOUNT_LOCKED: {
      code: 'AUTH002',
      message: 'Account has been locked due to multiple failed attempts',
      userMessage: 'Your account has been locked for security. Please wait 30 minutes or contact your administrator.',
      troubleshooting: [
        'Wait 30 minutes for automatic unlock',
        'Contact administrator to unlock immediately',
        'Use a different account if available'
      ],
      severity: 'critical',
      canRetry: false
    },
    SESSION_EXPIRED: {
      code: 'AUTH003',
      message: 'Session has expired',
      userMessage: 'Your session has expired. Please log in again to continue.',
      troubleshooting: [
        'Click the login button to re-authenticate',
        'Ensure you are not using the application in multiple tabs'
      ],
      severity: 'warning',
      canRetry: true
    },
    PERMISSION_DENIED: {
      code: 'AUTH004',
      message: 'User does not have permission for this action',
      userMessage: 'You do not have permission to perform this action. Please contact your administrator for access.',
      troubleshooting: [
        'Check if you need to upgrade your subscription',
        'Contact administrator to request permissions',
        'Try a different account with higher privileges'
      ],
      severity: 'error',
      canRetry: false
    }
  },
  
  // Integration errors (INT_xxx)
  INTEGRATION: {
    CONNECTION_FAILED: {
      code: 'INT001',
      message: 'Failed to connect to the accounting software',
      userMessage: 'Cannot connect to the accounting software. Please check your connection settings.',
      troubleshooting: [
        'Verify the software is running',
        'Check host and port settings',
        'Ensure firewall allows the connection',
        'Try restarting both applications'
      ],
      severity: 'error',
      canRetry: true,
      actionLabel: 'Test Connection'
    },
    AUTHENTICATION_FAILED: {
      code: 'INT002',
      message: 'Authentication with the accounting software failed',
      userMessage: 'Authentication failed. Please check your username and password.',
      troubleshooting: [
        'Verify credentials for the accounting software',
        'Check if the license is valid',
        'Ensure the user has necessary permissions'
      ],
      severity: 'error',
      canRetry: true,
      actionLabel: 'Re-authenticate'
    },
    TIMEOUT: {
      code: 'INT003',
      message: 'Request timed out waiting for response',
      userMessage: 'The request timed out. The accounting software may be busy or unresponsive.',
      troubleshooting: [
        'Wait a few minutes and retry',
        'Check if the accounting software is responding slowly',
        'Reduce the amount of data being synced',
        'Try during off-peak hours'
      ],
      severity: 'warning',
      canRetry: true,
      actionLabel: 'Retry'
    },
    SYNC_FAILED: {
      code: 'INT004',
      message: 'Data synchronization failed',
      userMessage: 'Synchronization failed. Some data may not have been synced.',
      troubleshooting: [
        'Check your internet connection',
        'Verify the accounting software is accessible',
        'Review the sync log for specific errors',
        'Try syncing fewer records'
      ],
      severity: 'error',
      canRetry: true,
      actionLabel: 'Retry Sync'
    },
    OAUTH_FAILED: {
      code: 'INT005',
      message: 'OAuth authentication process failed',
      userMessage: 'Could not complete cloud authentication. Please try again.',
      troubleshooting: [
        'Check your internet connection',
        'Verify your cloud account credentials',
        'Ensure the cloud service is not experiencing downtime',
        'Try again in a few minutes'
      ],
      severity: 'error',
      canRetry: true,
      actionLabel: 'Try Again'
    },
    TOKEN_EXPIRED: {
      code: 'INT006',
      message: 'OAuth access token has expired',
      userMessage: 'Your cloud connection has expired. Please reconnect to continue syncing.',
      troubleshooting: [
        'Click "Reconnect" to refresh your token',
        'Check if your cloud subscription is active',
        'Ensure you have necessary permissions in the cloud account'
      ],
      severity: 'warning',
      canRetry: true,
      actionLabel: 'Reconnect'
    },
    RATE_LIMITED: {
      code: 'INT007',
      message: 'API rate limit exceeded',
      userMessage: 'Too many requests. Please wait a few minutes before trying again.',
      troubleshooting: [
        'Wait 5-10 minutes before retrying',
        'Reduce the frequency of sync operations',
        'Contact support if this persists'
      ],
      severity: 'warning',
      canRetry: true,
      canRetryAfter: 300 // 5 minutes
    },
    DATA_FORMAT_ERROR: {
      code: 'INT008',
      message: 'Received data is in an unexpected format',
      userMessage: 'Received unexpected data from the accounting software.',
      troubleshooting: [
        'Ensure you are using compatible versions',
        'Contact support with error details',
        'Try syncing a smaller dataset'
      ],
      severity: 'error',
      canRetry: false
    }
  },
  
  // Database errors (DB_xxx)
  DATABASE: {
    CONNECTION_FAILED: {
      code: 'DB001',
      message: 'Failed to connect to the database',
      userMessage: 'Cannot access the application database. Please restart the application.',
      troubleshooting: [
        'Restart the application',
        'Check if another instance is running',
        'Ensure the database file is not corrupted',
        'Contact support if the issue persists'
      ],
      severity: 'critical',
      canRetry: false
    },
    QUERY_FAILED: {
      code: 'DB002',
      message: 'Database query failed',
      userMessage: 'A database operation failed. Your data may not have been saved.',
      troubleshooting: [
        'Try the operation again',
        'Restart the application if problems persist',
        'Contact support with error details'
      ],
      severity: 'error',
      canRetry: true,
      actionLabel: 'Retry'
    },
    CONSTRAINT_VIOLATION: {
      code: 'DB003',
      message: 'Database constraint violation',
      userMessage: 'This record cannot be saved because it conflicts with existing data.',
      troubleshooting: [
        'Check if the record already exists',
        'Verify required fields are filled',
        'Contact support if the issue persists'
      ],
      severity: 'error',
      canRetry: false
    },
    DISK_FULL: {
      code: 'DB004',
      message: 'Not enough disk space to complete operation',
      userMessage: 'Your disk is almost full. Please free up space to continue.',
      troubleshooting: [
        'Delete unnecessary files',
        'Clear application cache',
        'Free up at least 100MB of space'
      ],
      severity: 'critical',
      canRetry: false
    }
  },
  
  // Validation errors (VAL_xxx)
  VALIDATION: {
    REQUIRED_FIELD: {
      code: 'VAL001',
      message: 'Required field is missing',
      userMessage: 'Please fill in all required fields.',
      troubleshooting: [
        'Check the form for missing required fields',
        'Fields marked with * are required'
      ],
      severity: 'error',
      canRetry: false
    },
    INVALID_FORMAT: {
      code: 'VAL002',
      message: 'Field has invalid format',
      userMessage: 'One or more fields have invalid values. Please check and try again.',
      troubleshooting: [
        'Verify email addresses are correct',
        'Check number fields for special characters',
        'Ensure dates are in correct format'
      ],
      severity: 'error',
      canRetry: false
    },
    VALUE_TOO_LARGE: {
      code: 'VAL003',
      message: 'Value exceeds maximum allowed',
      userMessage: 'One or more values are too large. Please reduce and try again.',
      troubleshooting: [
        'Check numeric fields for large values',
        'Ensure text fields are within character limits'
      ],
      severity: 'error',
      canRetry: false
    },
    DUPLICATE_ENTRY: {
      code: 'VAL004',
      message: 'Duplicate entry detected',
      userMessage: 'This record already exists. Please use a different value.',
      troubleshooting: [
        'Check for existing records with similar values',
        'Modify the input to make it unique'
      ],
      severity: 'error',
      canRetry: false
    }
  },
  
  // Sync errors (SYN_xxx)
  SYNC: {
    PARTIAL_FAILURE: {
      code: 'SYN001',
      message: 'Some records failed to sync',
      userMessage: 'Some records could not be synced. Please review the errors below.',
      troubleshooting: [
        'Check individual record errors',
        'Correct the problematic records',
        'Retry the failed records'
      ],
      severity: 'warning',
      canRetry: true,
      actionLabel: 'Review Errors'
    },
    CONFLICT: {
      code: 'SYN002',
      message: 'Data conflict detected during sync',
      userMessage: 'Some records were modified in both systems. Please resolve conflicts.',
      troubleshooting: [
        'Review the conflicting records',
        'Choose which version to keep',
        'Manually merge the data if needed'
      ],
      severity: 'error',
      canRetry: false,
      actionLabel: 'Resolve Conflicts'
    },
    BACKUP_FAILED: {
      code: 'SYN003',
      message: 'Failed to create backup before sync',
      userMessage: 'Could not create a backup. Sync is paused to protect your data.',
      troubleshooting: [
        'Ensure you have sufficient disk space',
        'Check write permissions for backup location',
        'Try again after freeing up space'
      ],
      severity: 'critical',
      canRetry: false
    },
    LARGE_DATASET: {
      code: 'SYN004',
      message: 'Dataset is too large for single operation',
      userMessage: 'The data you are trying to sync is large. It will be processed in chunks.',
      troubleshooting: [
        'This is normal for large datasets',
        'Processing will continue in the background',
        'Do not close the application until complete'
      ],
      severity: 'info',
      canRetry: false
    }
  },
  
  // File errors (FILE_xxx)
  FILE: {
    NOT_FOUND: {
      code: 'FILE001',
      message: 'File not found',
      userMessage: 'The requested file could not be found.',
      troubleshooting: [
        'Verify the file path is correct',
        'Check if the file was moved or deleted',
        'Try browsing for the file'
      ],
      severity: 'error',
      canRetry: false
    },
    CORRUPTED: {
      code: 'FILE002',
      message: 'File is corrupted or invalid',
      userMessage: 'The file appears to be corrupted or in an unsupported format.',
      troubleshooting: [
        'Try opening the original file',
        'Ensure the file is not password protected',
        'Contact support with file details'
      ],
      severity: 'error',
      canRetry: false
    },
    PERMISSION_DENIED: {
      code: 'FILE003',
      message: 'Permission denied to access file',
      userMessage: 'You do not have permission to access this file.',
      troubleshooting: [
        'Check file permissions',
        'Try running as administrator',
        'Contact file owner for access'
      ],
      severity: 'error',
      canRetry: false
    },
    EXPORT_FAILED: {
      code: 'FILE004',
      message: 'File export failed',
      userMessage: 'Could not export the file. Please try again.',
      troubleshooting: [
        'Check available disk space',
        'Verify write permissions for the location',
        'Try a different export location'
      ],
      severity: 'error',
      canRetry: true,
      actionLabel: 'Retry Export'
    }
  },
  
  // Network errors (NET_xxx)
  NETWORK: {
    OFFLINE: {
      code: 'NET001',
      message: 'No internet connection',
      userMessage: 'You are offline. Please check your internet connection.',
      troubleshooting: [
        'Check your network cable or WiFi',
        'Verify other websites load correctly',
        'Try disabling VPN if enabled'
      ],
      severity: 'warning',
      canRetry: true,
      actionLabel: 'Check Connection'
    },
    DNS_FAILED: {
      code: 'NET002',
      message: 'Could not resolve server address',
      userMessage: 'Cannot reach the server. Please check your network settings.',
      troubleshooting: [
        'Check if the server URL is correct',
        'Try using the IP address directly',
        'Contact your network administrator'
      ],
      severity: 'error',
      canRetry: true
    },
    SSL_ERROR: {
      code: 'NET003',
      message: 'Secure connection error',
      userMessage: 'Could not establish a secure connection. Please try again.',
      troubleshooting: [
        'Check your system clock is correct',
        'Try disabling VPN if enabled',
        'Contact support if the issue persists'
      ],
      severity: 'error',
      canRetry: true
    }
  },
  
  // General errors (GEN_xxx)
  GENERAL: {
    UNKNOWN: {
      code: 'GEN000',
      message: 'An unknown error occurred',
      userMessage: 'Something went wrong. Please try again or contact support.',
      troubleshooting: [
        'Try the operation again',
        'Restart the application',
        'Check the error log for details',
        'Contact support with error code'
      ],
      severity: 'error',
      canRetry: true,
      actionLabel: 'Retry'
    },
    NOT_IMPLEMENTED: {
      code: 'GEN001',
      message: 'Feature not yet implemented',
      userMessage: 'This feature is coming soon. Thank you for your patience.',
      troubleshooting: [
        'Check for updates regularly',
        'Contact support for expected release date'
      ],
      severity: 'info',
      canRetry: false
    },
    MAINTENANCE: {
      code: 'GEN002',
      message: 'System is under maintenance',
      userMessage: 'The system is temporarily unavailable for maintenance. Please try again later.',
      troubleshooting: [
        'Check back in a few minutes',
        'Follow status page for updates'
      ],
      severity: 'info',
      canRetry: true,
      canRetryAfter: 600 // 10 minutes
    },
    UPGRADE_REQUIRED: {
      code: 'GEN003',
      message: 'Application upgrade required',
      userMessage: 'A newer version is available. Please upgrade to continue.',
      troubleshooting: [
        'Click the upgrade button',
        'Download the latest version from our website',
        'Restart after installation'
      ],
      severity: 'warning',
      canRetry: false,
      actionLabel: 'Upgrade Now'
    }
  }
};

/**
 * Get error definition by code
 * @param {string} errorCode Error code
 * @returns {Object} Error definition
 */
function getErrorDefinition(errorCode) {
  // Search through all categories
  for (const category of Object.values(ERROR_CODES)) {
    for (const [key, definition] of Object.entries(category)) {
      if (definition.code === errorCode) {
        return definition;
      }
    }
  }
  
  // Return unknown error if not found
  return ERROR_CODES.GENERAL.UNKNOWN;
}

/**
 * Create a formatted error object
 * @param {string} errorCode Error code
 * @param {Object} options Additional options
 * @returns {Object} Formatted error
 */
function createError(errorCode, options = {}) {
  const definition = getErrorDefinition(errorCode);
  
  const error = {
    code: definition.code,
    message: definition.message,
    userMessage: options.userMessage || definition.userMessage,
    troubleshooting: definition.troubleshooting,
    severity: definition.severity,
    canRetry: definition.canRetry,
    canRetryAfter: definition.canRetryAfter || 0,
    actionLabel: definition.actionLabel || 'Retry',
    timestamp: new Date().toISOString(),
    ...options
  };
  
  // Add context if provided
  if (options.context) {
    error.context = options.context;
  }
  
  // Add technical details if in debug mode
  if (options.technicalDetails) {
    error.technicalDetails = options.technicalDetails;
  }
  
  return error;
}

/**
 * Wrap a standard error with user-friendly messaging
 * @param {Error} error Original error
 * @param {string} category Error category
 * @param {string} errorKey Error key within category
 * @param {Object} options Additional options
 * @returns {Object} Formatted error
 */
function wrapError(error, category, errorKey, options = {}) {
  const categoryErrors = ERROR_CODES[category] || ERROR_CODES.GENERAL;
  const errorDefinition = categoryErrors[errorKey] || categoryErrors.UNKNOWN || ERROR_CODES.GENERAL.UNKNOWN;
  
  return createError(errorDefinition.code, {
    ...options,
    originalMessage: error.message,
    originalStack: error.stack,
    technicalDetails: {
      originalError: error.message,
      stack: error.stack,
      ...options.technicalDetails
    }
  });
}

/**
 * Get user-friendly message for API error
 * @param {Object} apiResponse API response
 * @returns {Object} Formatted error
 */
function handleApiError(apiResponse) {
  if (apiResponse.success !== false) {
    return null;
  }
  
  const errorCode = apiResponse.errorCode || apiResponse.code || 'GEN000';
  return createError(errorCode, {
    userMessage: apiResponse.message || apiResponse.error,
    context: apiResponse.context,
    technicalDetails: apiResponse
  });
}

/**
 * Get severity icon
 * @param {string} severity Error severity
 * @returns {string} Icon class
 */
function getSeverityIcon(severity) {
  const icons = {
    critical: '🚨',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[severity] || icons.info;
}

/**
 * Get severity color class
 * @param {string} severity Error severity
 * @returns {string} CSS class
 */
function getSeverityClass(severity) {
  const classes = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };
  return classes[severity] || classes.info;
}

/**
 * Format error for display
 * @param {Object} error Error object
 * @returns {Object} Formatted for display
 */
function formatForDisplay(error) {
  return {
    code: error.code,
    icon: getSeverityIcon(error.severity),
    severityClass: getSeverityClass(error.severity),
    title: error.userMessage,
    troubleshooting: error.troubleshooting,
    canRetry: error.canRetry,
    canRetryAfter: error.canRetryAfter,
    actionLabel: error.actionLabel,
    timestamp: error.timestamp,
    context: error.context
  };
}

/**
 * Log error to console with formatting
 * @param {Object} error Error object
 * @param {string} level Log level
 */
function logError(error, level = 'error') {
  const logData = {
    code: error.code,
    message: error.message,
    severity: error.severity,
    timestamp: error.timestamp,
    context: error.context
  };
  
  if (error.technicalDetails && process.env.NODE_ENV === 'development') {
    logData.technicalDetails = error.technicalDetails;
  }
  
  console[level]('[Error]', JSON.stringify(logData, null, 2));
}

/**
 * Create retry handler
 * @param {Function} retryFn Function to retry
 * @param {Object} error Error from previous attempt
 * @returns {Function} Retry handler
 */
function createRetryHandler(retryFn, error) {
  if (!error.canRetry) {
    return null;
  }
  
  return async () => {
    if (error.canRetryAfter) {
      await new Promise(resolve => setTimeout(resolve, error.canRetryAfter * 1000));
    }
    return retryFn();
  };
}

/**
 * Get all error codes for documentation
 * @returns {Array} List of all error codes
 */
function getAllErrorCodes() {
  const codes = [];
  
  for (const [categoryName, category] of Object.entries(ERROR_CODES)) {
    for (const [key, definition] of Object.entries(category)) {
      codes.push({
        code: definition.code,
        category: categoryName,
        key,
        message: definition.message,
        severity: definition.severity
      });
    }
  }
  
  return codes;
}

/**
 * Validate error code exists
 * @param {string} errorCode Error code to validate
 * @returns {boolean} Is valid
 */
function isValidErrorCode(errorCode) {
  for (const category of Object.values(ERROR_CODES)) {
    for (const definition of Object.values(category)) {
      if (definition.code === errorCode) {
        return true;
      }
    }
  }
  return false;
}

module.exports = {
  ERROR_CODES,
  getErrorDefinition,
  createError,
  wrapError,
  handleApiError,
  getSeverityIcon,
  getSeverityClass,
  formatForDisplay,
  logError,
  createRetryHandler,
  getAllErrorCodes,
  isValidErrorCode
};
