/**
 * Authentication Service
 * Handles user authentication, session management, and role-based access control
 */

class AuthService {
  constructor(database) {
    this.db = database;
    this.SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    this.MAX_FAILED_ATTEMPTS = 5;
    this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    this.PIN_LENGTH = 4;
  }

  /**
   * Validate user PIN and create session
   * @param {string} username - Username
   * @param {string} pin - PIN number
   * @returns {Object} Authentication result with session data
   */
  async authenticate(username, pin) {
    try {
      // Find user by username
      const user = this.db.prepare(`
        SELECT id, username, pin_hash, pin_salt, role, is_active, failed_attempts, locked_until
        FROM users
        WHERE username = ?
      `).get(username);

      if (!user) {
        return {
          success: false,
          error: 'INVALID_USERNAME',
          message: 'Invalid username'
        };
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
        return {
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: `Account locked. Try again in ${remainingTime} minutes.`
        };
      }

      // Check if account is active
      if (!user.is_active) {
        return {
          success: false,
          error: 'ACCOUNT_INACTIVE',
          message: 'Account is deactivated'
        };
      }

      // Verify PIN using bcrypt
      const bcrypt = require('bcryptjs');
      const isValidPin = bcrypt.compareSync(pin, user.pin_hash);

      if (!isValidPin) {
        // Increment failed attempts
        const failedAttempts = user.failed_attempts + 1;
        let lockUpdate = '';
        
        if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          const lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION).toISOString();
          lockUpdate = `, locked_until = '${lockedUntil}'`;
        }

        this.db.prepare(`
          UPDATE users
          SET failed_attempts = ? ${lockUpdate}
          WHERE id = ?
        `).run(failedAttempts, user.id);

        return {
          success: false,
          error: 'INVALID_PIN',
          message: `Invalid PIN. ${this.MAX_FAILED_ATTEMPTS - failedAttempts} attempts remaining.`
        };
      }

      // Generate session token
      const sessionToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION).toISOString();

      // Create session
      this.db.prepare(`
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES (?, ?, ?)
      `).run(user.id, sessionToken, expiresAt);

      // Reset failed attempts and update last login
      this.db.prepare(`
        UPDATE users
        SET failed_attempts = 0, locked_until = NULL, last_login = ?
        WHERE id = ?
      `).run(new Date().toISOString(), user.id);

      // Get user permissions
      const permissions = this.getUserPermissions(user.role);

      // Log successful authentication
      this.logAuditAction(user.id, 'LOGIN', 'user_session', null, { sessionToken: sessionToken.substring(0, 8) + '...' });

      return {
        success: true,
        session: {
          token: sessionToken,
          userId: user.id,
          username: user.username,
          role: user.role,
          permissions,
          expiresAt
        }
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'AUTH_ERROR',
        message: 'Authentication failed. Please try again.'
      };
    }
  }

  /**
   * Validate existing session
   * @param {string} sessionToken - Session token
   * @returns {Object} Session validation result
   */
  async validateSession(sessionToken) {
    try {
      const session = this.db.prepare(`
        SELECT us.*, u.username, u.role, u.is_active
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.session_token = ?
      `).get(sessionToken);

      if (!session) {
        return { valid: false, error: 'SESSION_NOT_FOUND' };
      }

      // Check if session expired
      if (new Date(session.expires_at) < new Date()) {
        this.invalidateSession(sessionToken);
        return { valid: false, error: 'SESSION_EXPIRED' };
      }

      // Check if user is still active
      if (!session.is_active) {
        this.invalidateSession(sessionToken);
        return { valid: false, error: 'USER_INACTIVE' };
      }

      // Update last activity
      this.db.prepare(`
        UPDATE user_sessions
        SET last_activity = ?
        WHERE session_token = ?
      `).run(new Date().toISOString(), sessionToken);

      // Get fresh permissions
      const permissions = this.getUserPermissions(session.role);

      return {
        valid: true,
        session: {
          userId: session.user_id,
          username: session.username,
          role: session.role,
          permissions,
          expiresAt: session.expires_at
        }
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, error: 'VALIDATION_ERROR' };
    }
  }

  /**
   * Invalidate session (logout)
   * @param {string} sessionToken - Session token
   * @returns {boolean} Success status
   */
  async invalidateSession(sessionToken) {
    try {
      const session = this.db.prepare(`
        SELECT user_id FROM user_sessions WHERE session_token = ?
      `).get(sessionToken);

      if (session) {
        this.logAuditAction(session.user_id, 'LOGOUT', 'user_session', null, {});
      }

      this.db.prepare(`DELETE FROM user_sessions WHERE session_token = ?`).run(sessionToken);
      return true;
    } catch (error) {
      console.error('Session invalidation error:', error);
      return false;
    }
  }

  /**
   * Log out all sessions for a user
   * @param {number} userId - User ID
   */
  async logoutAllSessions(userId) {
    try {
      this.db.prepare(`DELETE FROM user_sessions WHERE user_id = ?`).run(userId);
      return true;
    } catch (error) {
      console.error('Logout all sessions error:', error);
      return false;
    }
  }

  /**
   * Get user permissions based on role
   * @param {string} role - User role
   * @returns {Object} Permissions object
   */
  getUserPermissions(role) {
    const permissions = this.db.prepare(`
      SELECT permission, can_read, can_write, can_delete, can_verify, can_export, can_configure
      FROM role_permissions
      WHERE role = ?
    `).all(role);

    const permissionMap = {};
    permissions.forEach(p => {
      permissionMap[p.permission] = {
        read: Boolean(p.can_read),
        write: Boolean(p.can_write),
        delete: Boolean(p.can_delete),
        verify: Boolean(p.can_verify),
        export: Boolean(p.can_export),
        configure: Boolean(p.can_configure)
      };
    });

    return permissionMap;
  }

  /**
   * Check if user has specific permission
   * @param {string} sessionToken - Session token
   * @param {string} permission - Permission to check
   * @param {string} action - Action type (read, write, delete, verify, export, configure)
   * @returns {boolean} Permission status
   */
  async checkPermission(sessionToken, permission, action = 'read') {
    const session = await this.validateSession(sessionToken);
    if (!session.valid) return false;

    const rolePermissions = session.session.permissions[permission];
    if (!rolePermissions) return false;

    return rolePermissions[action] || false;
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Object} Creation result
   */
  async createUser(userData) {
    try {
      const { username, pin, role = 'editor' } = userData;

      // Validate username
      if (!username || username.length < 3) {
        return { success: false, error: 'INVALID_USERNAME', message: 'Username must be at least 3 characters' };
      }

      // Validate PIN
      if (!pin || pin.length !== this.PIN_LENGTH || !/^\d+$/.test(pin)) {
        return { success: false, error: 'INVALID_PIN', message: `PIN must be ${this.PIN_LENGTH} digits` };
      }

      // Check if username exists
      const existingUser = this.db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
      if (existingUser) {
        return { success: false, error: 'USERNAME_EXISTS', message: 'Username already exists' };
      }

      // Hash PIN
      const bcrypt = require('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const pinHash = bcrypt.hashSync(pin, salt);

      // Insert user
      const result = this.db.prepare(`
        INSERT INTO users (username, pin_hash, pin_salt, role)
        VALUES (?, ?, ?, ?)
      `).run(username, pinHash, salt, role);

      this.logAuditAction(null, 'CREATE_USER', 'users', result.lastInsertRowid, { username, role });

      return {
        success: true,
        userId: result.lastInsertRowid,
        message: 'User created successfully'
      };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'CREATE_ERROR', message: 'Failed to create user' };
    }
  }

  /**
   * Update user PIN
   * @param {number} userId - User ID
   * @param {string} currentPin - Current PIN
   * @param {string} newPin - New PIN
   * @returns {Object} Update result
   */
  async updatePin(userId, currentPin, newPin) {
    try {
      const user = this.db.prepare(`SELECT pin_hash, pin_salt FROM users WHERE id = ?`).get(userId);
      if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
      }

      const bcrypt = require('bcryptjs');
      if (!bcrypt.compareSync(currentPin, user.pin_hash)) {
        return { success: false, error: 'INVALID_CURRENT_PIN' };
      }

      if (!/^\d+$/.test(newPin) || newPin.length !== this.PIN_LENGTH) {
        return { success: false, error: 'INVALID_NEW_PIN' };
      }

      const newSalt = bcrypt.genSaltSync(10);
      const newHash = bcrypt.hashSync(newPin, newSalt);

      this.db.prepare(`
        UPDATE users SET pin_hash = ?, pin_salt = ?, updated_at = ?
        WHERE id = ?
      `).run(newHash, newSalt, new Date().toISOString(), userId);

      this.logAuditAction(userId, 'UPDATE_PIN', 'users', userId, {});

      return { success: true, message: 'PIN updated successfully' };
    } catch (error) {
      console.error('Update PIN error:', error);
      return { success: false, error: 'UPDATE_ERROR' };
    }
  }

  /**
   * Get all users
   * @returns {Array} List of users
   */
  getAllUsers() {
    return this.db.prepare(`
      SELECT id, username, role, is_active, failed_attempts, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
  }

  /**
   * Update user status
   * @param {number} userId - User ID
   * @param {boolean} isActive - Active status
   * @returns {Object} Update result
   */
  async updateUserStatus(userId, isActive) {
    try {
      this.db.prepare(`UPDATE users SET is_active = ? WHERE id = ?`).run(isActive ? 1 : 0, userId);
      this.logAuditAction(userId, 'UPDATE_STATUS', 'users', userId, { is_active: isActive });
      return { success: true };
    } catch (error) {
      console.error('Update user status error:', error);
      return { success: false, error: 'UPDATE_ERROR' };
    }
  }

  /**
   * Delete user
   * @param {number} userId - User ID
   * @returns {Object} Deletion result
   */
  async deleteUser(userId) {
    try {
      // Prevent deleting last admin
      const adminCount = this.db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`).get();
      const user = this.db.prepare(`SELECT role FROM users WHERE id = ?`).get(userId);

      if (user.role === 'admin' && adminCount.count <= 1) {
        return { success: false, error: 'CANNOT_DELETE_LAST_ADMIN' };
      }

      this.db.prepare(`DELETE FROM user_sessions WHERE user_id = ?`).run(userId);
      this.db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
      
      this.logAuditAction(null, 'DELETE_USER', 'users', userId, {});
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, error: 'DELETE_ERROR' };
    }
  }

  /**
   * Clean up expired sessions
   * @returns {number} Number of sessions cleaned
   */
  cleanupExpiredSessions() {
    const result = this.db.prepare(`
      DELETE FROM user_sessions WHERE expires_at < ?
    `).run(new Date().toISOString());
    return result.changes;
  }

  /**
   * Log audit action
   * @param {number} userId - User ID (can be null for system actions)
   * @param {string} action - Action type
   * @param {string} entityType - Entity type
   * @param {number} entityId - Entity ID
   * @param {Object} details - Action details
   */
  logAuditAction(userId, action, entityType, entityId, details) {
    try {
      this.db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(details)
      );
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  /**
   * Get audit logs
   * @param {Object} filters - Filter options
   * @returns {Array} Audit logs
   */
  getAuditLogs(filters = {}) {
    let query = `
      SELECT al.*, u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.userId) {
      query += ' AND al.user_id = ?';
      params.push(filters.userId);
    }

    if (filters.action) {
      query += ' AND al.action = ?';
      params.push(filters.action);
    }

    if (filters.entityType) {
      query += ' AND al.entity_type = ?';
      params.push(filters.entityType);
    }

    if (filters.startDate) {
      query += ' AND al.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND al.created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(filters.limit || 100);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Generate secure random token
   * @returns {string} Random token
   */
  generateSecureToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Reset user PIN (admin function)
   * @param {number} adminUserId - Admin user ID
   * @param {number} targetUserId - Target user ID
   * @param {string} newPin - New PIN
   * @returns {Object} Reset result
   */
  async resetPin(adminUserId, targetUserId, newPin) {
    try {
      if (!/^\d+$/.test(newPin) || newPin.length !== this.PIN_LENGTH) {
        return { success: false, error: 'INVALID_PIN' };
      }

      const bcrypt = require('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const pinHash = bcrypt.hashSync(newPin, salt);

      this.db.prepare(`
        UPDATE users SET pin_hash = ?, pin_salt = ?, updated_at = ?
        WHERE id = ?
      `).run(pinHash, salt, new Date().toISOString(), targetUserId);

      this.logAuditAction(adminUserId, 'RESET_PIN', 'users', targetUserId, {});
      return { success: true, message: 'PIN reset successfully' };
    } catch (error) {
      console.error('Reset PIN error:', error);
      return { success: false, error: 'RESET_ERROR' };
    }
  }

  /**
   * Get role statistics
   * @returns {Object} Role distribution
   */
  getRoleStats() {
    return this.db.prepare(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `).all();
  }

  /**
   * Get active sessions count
   * @returns {number} Active sessions
   */
  getActiveSessionCount() {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE expires_at > ?
    `).get(new Date().toISOString());
    return result.count;
  }
}

module.exports = AuthService;
