const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// File paths for data storage
const DATA_DIR = path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  const defaultAdmin = {
    id: uuidv4(),
    username: 'admin',
    email: 'admin@company.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify([defaultAdmin], null, 2));
}

// Helper functions
const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Role definitions with permissions
const ROLE_PERMISSIONS = {
  ADMIN: [
    'user:read', 'user:create', 'user:update', 'user:delete',
    'expense:read', 'expense:create', 'expense:approve', 'expense:delete',
    'budget:read', 'budget:create', 'budget:update', 'budget:delete',
    'vendor:read', 'vendor:create', 'vendor:update', 'vendor:delete',
    'project:read', 'project:create', 'project:update', 'project:delete',
    'gst:read', 'gst:create', 'gst:update', 'gst:delete',
    'report:read', 'report:export',
    'settings:read', 'settings:update'
  ],
  MANAGER: [
    'expense:read', 'expense:create', 'expense:approve',
    'budget:read', 'budget:create', 'budget:update',
    'vendor:read', 'vendor:create', 'vendor:update',
    'project:read', 'project:create', 'project:update',
    'gst:read', 'report:read'
  ],
  ACCOUNTANT: [
    'expense:read', 'expense:create',
    'budget:read', 'budget:create', 'budget:update',
    'vendor:read', 'vendor:create', 'vendor:update',
    'project:read', 'gst:read', 'gst:create', 'gst:update',
    'report:read', 'report:export'
  ],
  EMPLOYEE: [
    'expense:read:own', 'expense:create',
    'project:read:own',
    'report:read:own'
  ],
  VIEWER: [
    'report:read'
  ]
};

class UserService {
  // Authentication
  async authenticate(email, password) {
    const users = readUsers();
    const user = users.find(u => u.email === email && u.isActive);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    writeUsers(users);
    
    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get all users (for admin)
  async getAllUsers() {
    const users = readUsers();
    return users.map(({ passwordHash, ...user }) => user);
  }

  // Get user by ID
  async getUserById(id) {
    const users = readUsers();
    const user = users.find(u => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Create new user
  async createUser(userData) {
    const users = readUsers();
    
    // Check for duplicate email
    if (users.find(u => u.email === userData.email)) {
      throw new Error('Email already exists');
    }
    
    const newUser = {
      id: uuidv4(),
      username: userData.username || userData.email.split('@')[0],
      email: userData.email,
      passwordHash: bcrypt.hashSync(userData.password, 10),
      role: userData.role || 'EMPLOYEE',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    users.push(newUser);
    writeUsers(users);
    
    const { passwordHash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  // Update user
  async updateUser(id, updates) {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // If updating password, hash it
    if (updates.password) {
      updates.passwordHash = bcrypt.hashSync(updates.password, 10);
      delete updates.password;
    }
    
    // If updating email, check for duplicates
    if (updates.email && updates.email !== users[userIndex].email) {
      if (users.find(u => u.email === updates.email)) {
        throw new Error('Email already exists');
      }
    }
    
    users[userIndex] = { ...users[userIndex], ...updates };
    writeUsers(users);
    
    const { passwordHash, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  }

  // Delete (deactivate) user
  async deleteUser(id) {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Soft delete - just set isActive to false
    users[userIndex].isActive = false;
    writeUsers(users);
    
    return { success: true, message: 'User deactivated successfully' };
  }

  // Get permissions for a role
  getPermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }

  // Check if user has permission
  hasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission) || permissions.includes(permission.replace(':own', ':all'));
  }

  // Get all roles
  getRoles() {
    return Object.keys(ROLE_PERMISSIONS).map(role => ({
      name: role,
      permissions: ROLE_PERMISSIONS[role]
    }));
  }

  // Change password
  async changePassword(userId, oldPassword, newPassword) {
    const users = readUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const isValidPassword = bcrypt.compareSync(oldPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }
    
    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    writeUsers(users);
    
    return { success: true, message: 'Password changed successfully' };
  }

  // Reset password (admin function)
  async resetPassword(id, newPassword) {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    users[userIndex].passwordHash = bcrypt.hashSync(newPassword, 10);
    writeUsers(users);
    
    return { success: true, message: 'Password reset successfully' };
  }

  // Activate/Deactivate user
  async setUserStatus(id, isActive) {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    users[userIndex].isActive = isActive;
    writeUsers(users);
    
    return { success: true, message: isActive ? 'User activated' : 'User deactivated' };
  }
}

module.exports = new UserService();
