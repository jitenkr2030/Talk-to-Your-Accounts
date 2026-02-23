import { useState, useEffect, useCallback } from 'react';

const useUser = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await window.api.users.login(email, password);
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await window.api.users.logout();
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
    } catch (err) {
      setError(err.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get all users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await window.api.users.getAll();
      setUsers(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get user by ID
  const fetchUserById = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await window.api.users.getById(id);
      return user;
    } catch (err) {
      setError(err.message || 'Failed to fetch user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create user
  const createUser = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await window.api.users.create(userData);
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (err) {
      setError(err.message || 'Failed to create user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user
  const updateUser = useCallback(async (id, updates) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedUser = await window.api.users.update(id, updates);
      setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
      
      // Update current user if it's the same user
      if (currentUser && currentUser.id === id) {
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
      
      return updatedUser;
    } catch (err) {
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Delete (deactivate) user
  const deleteUser = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.api.users.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get roles
  const fetchRoles = useCallback(async () => {
    try {
      const data = await window.api.users.getRoles();
      setRoles(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch roles');
      throw err;
    }
  }, []);

  // Get permissions for a role
  const fetchPermissions = useCallback(async (role) => {
    try {
      return await window.api.users.getPermissions(role);
    } catch (err) {
      setError(err.message || 'Failed to fetch permissions');
      throw err;
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (userId, oldPassword, newPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.users.changePassword(userId, oldPassword, newPassword);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to change password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset password (admin)
  const resetPassword = useCallback(async (id, newPassword) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.users.resetPassword(id, newPassword);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set user status (activate/deactivate)
  const setUserStatus = useCallback(async (id, isActive) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.users.setStatus(id, isActive);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive } : u));
      return result;
    } catch (err) {
      setError(err.message || 'Failed to set user status');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if user has permission
  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false;
    
    const rolePermissions = {
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
    
    const permissions = rolePermissions[currentUser.role] || [];
    
    // Check exact permission
    if (permissions.includes(permission)) return true;
    
    // Check if user has "all" version of the permission
    const parts = permission.split(':');
    if (parts.length >= 2) {
      const allPermission = parts.slice(0, -1).join(':') + ':all';
      if (permissions.includes(allPermission)) return true;
    }
    
    // Admin has all permissions
    if (currentUser.role === 'ADMIN') return true;
    
    return false;
  }, [currentUser]);

  // Check if user can access a module
  const canAccessModule = useCallback((module) => {
    if (!currentUser) return false;
    
    const modulePermissions = {
      dashboard: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE', 'VIEWER'],
      transactions: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
      expenses: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE'],
      budgets: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
      vendors: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
      projects: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE'],
      inventory: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
      gst: ['ADMIN', 'ACCOUNTANT'],
      reports: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER'],
      banking: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
      settings: ['ADMIN'],
      users: ['ADMIN']
    };
    
    const allowedRoles = modulePermissions[module] || [];
    return allowedRoles.includes(currentUser.role);
  }, [currentUser]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    currentUser,
    users,
    roles,
    isLoading,
    error,
    
    // Auth functions
    login,
    logout,
    
    // User CRUD
    fetchUsers,
    fetchUserById,
    createUser,
    updateUser,
    deleteUser,
    
    // Roles & Permissions
    fetchRoles,
    fetchPermissions,
    hasPermission,
    canAccessModule,
    
    // Password management
    changePassword,
    resetPassword,
    
    // User status
    setUserStatus,
    
    // Helpers
    clearError,
    
    // Computed
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'ADMIN',
    isManager: currentUser?.role === 'MANAGER',
    isAccountant: currentUser?.role === 'ACCOUNTANT',
    isEmployee: currentUser?.role === 'EMPLOYEE',
    isViewer: currentUser?.role === 'VIEWER'
  };
};

export default useUser;
