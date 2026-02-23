const crypto = require('crypto');

class BudgetService {
  constructor() {
    this.db = null;
  }

  setDatabase(database) {
    this.db = database;
  }

  // Initialize budget tables
  initializeTables(db) {
    this.db = db;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        amount REAL NOT NULL,
        period_type TEXT NOT NULL DEFAULT 'monthly',
        start_date TEXT NOT NULL,
        end_date TEXT,
        is_active INTEGER DEFAULT 1,
        alert_threshold REAL DEFAULT 80,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES expense_categories(id)
      );

      CREATE TABLE IF NOT EXISTS budget_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_id INTEGER NOT NULL,
        department_id INTEGER,
        amount REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (budget_id) REFERENCES budgets(id),
        FOREIGN KEY (department_id) REFERENCES parties(id)
      );

      CREATE TABLE IF NOT EXISTS budget_variance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_id INTEGER NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        planned_amount REAL NOT NULL,
        actual_amount REAL DEFAULT 0,
        variance_amount REAL DEFAULT 0,
        variance_percent REAL DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (budget_id) REFERENCES budgets(id)
      );
    `);
  }

  // Get all budgets
  async getAllBudgets(db, filters = {}) {
    let query = `
      SELECT b.*, 
             ec.name as category_name,
             (SELECT COALESCE(SUM(amount), 0) FROM budget_allocations WHERE budget_id = b.id) as allocated_amount
      FROM budgets b
      LEFT JOIN expense_categories ec ON b.category_id = ec.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.is_active !== undefined) {
      query += ' AND b.is_active = ?';
      params.push(filters.is_active);
    }
    
    if (filters.category_id) {
      query += ' AND b.category_id = ?';
      params.push(filters.category_id);
    }
    
    if (filters.period_type) {
      query += ' AND b.period_type = ?';
      params.push(filters.period_type);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    return db.prepare(query).all(...params);
  }

  // Get budget by ID
  async getBudgetById(db, budgetId) {
    const budget = db.prepare(`
      SELECT b.*, ec.name as category_name
      FROM budgets b
      LEFT JOIN expense_categories ec ON b.category_id = ec.id
      WHERE b.id = ?
    `).get(budgetId);
    
    if (budget) {
      budget.allocations = db.prepare(`
        SELECT ba.*, p.name as department_name
        FROM budget_allocations ba
        LEFT JOIN parties p ON ba.department_id = p.id
        WHERE ba.budget_id = ?
      `).all(budgetId);
      
      budget.variances = db.prepare(`
        SELECT * FROM budget_variance 
        WHERE budget_id = ?
        ORDER BY period_start DESC
      `).all(budgetId);
    }
    
    return budget;
  }

  // Create new budget
  async createBudget(db, budgetData) {
    const { name, category_id, amount, period_type, start_date, end_date, alert_threshold, allocations } = budgetData;
    
    const result = db.prepare(`
      INSERT INTO budgets (name, category_id, amount, period_type, start_date, end_date, alert_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      category_id || null,
      amount,
      period_type || 'monthly',
      start_date,
      end_date || null,
      alert_threshold || 80
    );
    
    const budgetId = result.lastInsertRowid;
    
    // Add allocations if provided
    if (allocations && allocations.length > 0) {
      const insertAllocation = db.prepare(`
        INSERT INTO budget_allocations (budget_id, department_id, amount)
        VALUES (?, ?, ?)
      `);
      
      for (const allocation of allocations) {
        insertAllocation.run(budgetId, allocation.department_id || null, allocation.amount);
      }
    }
    
    // Create initial variance record
    const periodStart = this.getPeriodStart(start_date, period_type || 'monthly');
    const periodEnd = this.getPeriodEnd(start_date, period_type || 'monthly');
    
    db.prepare(`
      INSERT INTO budget_variance (budget_id, period_start, period_end, planned_amount)
      VALUES (?, ?, ?, ?)
    `).run(budgetId, periodStart, periodEnd, amount);
    
    return { id: budgetId, ...budgetData };
  }

  // Update budget
  async updateBudget(db, budgetId, budgetData) {
    const { name, category_id, amount, period_type, start_date, end_date, is_active, alert_threshold } = budgetData;
    
    db.prepare(`
      UPDATE budgets 
      SET name = ?, category_id = ?, amount = ?, period_type = ?, 
          start_date = ?, end_date = ?, is_active = ?, alert_threshold = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      category_id || null,
      amount,
      period_type,
      start_date,
      end_date,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      alert_threshold || 80,
      budgetId
    );
    
    return { id: budgetId, ...budgetData };
  }

  // Delete budget
  async deleteBudget(db, budgetId) {
    db.prepare('DELETE FROM budget_allocations WHERE budget_id = ?').run(budgetId);
    db.prepare('DELETE FROM budget_variance WHERE budget_id = ?').run(budgetId);
    db.prepare('DELETE FROM budgets WHERE id = ?').run(budgetId);
    return { success: true };
  }

  // Get budget summary with actual vs planned
  async getBudgetSummary(db, filters = {}) {
    const budgets = await this.getAllBudgets(db, { is_active: 1, ...filters });
    
    const summary = {
      total_budgeted: 0,
      total_spent: 0,
      total_remaining: 0,
      budgets: []
    };
    
    for (const budget of budgets) {
      const actualSpent = this.calculateActualSpend(db, budget);
      const remaining = budget.amount - actualSpent;
      const percentUsed = (actualSpent / budget.amount) * 100;
      
      summary.total_budgeted += budget.amount;
      summary.total_spent += actualSpent;
      summary.total_remaining += remaining;
      
      summary.budgets.push({
        ...budget,
        actual_spent: actualSpent,
        remaining: remaining,
        percent_used: percentUsed,
        is_over_budget: actualSpent > budget.amount,
        is_over_alert: percentUsed >= budget.alert_threshold
      });
    }
    
    return summary;
  }

  // Calculate actual spending for a budget
  calculateActualSpend(db, budget) {
    let query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by date range
    if (budget.period_type === 'monthly') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      query += ' AND date >= ? AND date <= ?';
      params.push(startOfMonth, endOfMonth);
    } else if (budget.period_type === 'quarterly') {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      const endOfQuarter = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
      
      query += ' AND date >= ? AND date <= ?';
      params.push(startOfQuarter, endOfQuarter);
    } else if (budget.period_type === 'yearly') {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      
      query += ' AND date >= ? AND date <= ?';
      params.push(startOfYear, endOfYear);
    }
    
    // Filter by category if set
    if (budget.category_id) {
      query += ' AND category_id = ?';
      params.push(budget.category_id);
    }
    
    return db.prepare(query).get(...params).total;
  }

  // Update budget variance (call periodically)
  async updateBudgetVariance(db, budgetId) {
    const budget = await this.getBudgetById(db, budgetId);
    if (!budget) return null;
    
    const actualSpent = this.calculateActualSpend(db, budget);
    const varianceAmount = budget.amount - actualSpent;
    const variancePercent = ((budget.amount - actualSpent) / budget.amount) * 100;
    
    // Update current period variance
    const now = new Date();
    const periodStart = this.getPeriodStart(budget.start_date, budget.period_type);
    const periodEnd = this.getPeriodEnd(budget.start_date, budget.period_type);
    
    const existing = db.prepare(`
      SELECT id FROM budget_variance 
      WHERE budget_id = ? AND period_start = ? AND period_end = ?
    `).get(budgetId, periodStart, periodEnd);
    
    if (existing) {
      db.prepare(`
        UPDATE budget_variance 
        SET actual_amount = ?, variance_amount = ?, variance_percent = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(actualSpent, varianceAmount, variancePercent, existing.id);
    } else {
      db.prepare(`
        INSERT INTO budget_variance (budget_id, period_start, period_end, planned_amount, actual_amount, variance_amount, variance_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(budgetId, periodStart, periodEnd, budget.amount, actualSpent, varianceAmount, variancePercent);
    }
    
    return { actual_spent: actualSpent, variance_amount: varianceAmount, variance_percent: variancePercent };
  }

  // Get alerts for budgets over threshold
  async getBudgetAlerts(db) {
    const budgets = await this.getAllBudgets(db, { is_active: 1 });
    const alerts = [];
    
    for (const budget of budgets) {
      const actualSpent = this.calculateActualSpend(db, budget);
      const percentUsed = (actualSpent / budget.amount) * 100;
      
      if (percentUsed >= 100) {
        alerts.push({
          type: 'over_budget',
          severity: 'critical',
          budget_id: budget.id,
          budget_name: budget.name,
          budgeted: budget.amount,
          spent: actualSpent,
          over_by: actualSpent - budget.amount,
          message: `Budget "${budget.name}" has been exceeded by ₹${(actualSpent - budget.amount).toLocaleString()}`
        });
      } else if (percentUsed >= budget.alert_threshold) {
        alerts.push({
          type: 'threshold_warning',
          severity: 'warning',
          budget_id: budget.id,
          budget_name: budget.name,
          budgeted: budget.amount,
          spent: actualSpent,
          percent_used: percentUsed,
          message: `Budget "${budget.name}" is at ${percentUsed.toFixed(1)}% (threshold: ${budget.alert_threshold}%)`
        });
      }
    }
    
    return alerts;
  }

  // Get period helpers
  getPeriodStart(date, periodType) {
    const d = new Date(date);
    if (periodType === 'monthly') {
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    } else if (periodType === 'quarterly') {
      const quarter = Math.floor(d.getMonth() / 3);
      return new Date(d.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
    } else if (periodType === 'yearly') {
      return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
    }
    return date;
  }

  getPeriodEnd(date, periodType) {
    const d = new Date(date);
    if (periodType === 'monthly') {
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (periodType === 'quarterly') {
      const quarter = Math.floor(d.getMonth() / 3);
      return new Date(d.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
    } else if (periodType === 'yearly') {
      return new Date(d.getFullYear(), 11, 31).toISOString().split('T')[0];
    }
    return date;
  }

  // Export budgets
  async exportBudgets(db, filters = {}) {
    const budgets = await this.getBudgetSummary(db, filters);
    return budgets;
  }
}

module.exports = new BudgetService();
