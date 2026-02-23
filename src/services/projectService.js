const crypto = require('crypto');

class ProjectService {
  constructor() {
    this.db = null;
  }

  setDatabase(database) {
    this.db = database;
  }

  // Initialize project tables
  initializeTables(db) {
    this.db = db;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        description TEXT,
        client_id INTEGER,
        start_date TEXT,
        end_date TEXT,
        deadline TEXT,
        status TEXT DEFAULT 'planning',
        budget_amount REAL DEFAULT 0,
        billing_type TEXT DEFAULT 'fixed',
        hourly_rate REAL DEFAULT 0,
        total_estimated_hours REAL DEFAULT 0,
        actual_cost REAL DEFAULT 0,
        revenue REAL DEFAULT 0,
        profit REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES parties(id)
      );

      CREATE TABLE IF NOT EXISTS project_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        assigned_to INTEGER,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        estimated_hours REAL DEFAULT 0,
        actual_hours REAL DEFAULT 0,
        start_date TEXT,
        due_date TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS project_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        expense_id INTEGER,
        description TEXT,
        amount REAL NOT NULL,
        date TEXT,
        vendor_id INTEGER,
        category TEXT,
        billable INTEGER DEFAULT 0,
        invoiced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (expense_id) REFERENCES expenses(id),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
      );

      CREATE TABLE IF NOT EXISTS project_time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        task_id INTEGER,
        user_id INTEGER,
        description TEXT,
        hours REAL NOT NULL,
        date TEXT NOT NULL,
        billing_rate REAL,
        is_billable INTEGER DEFAULT 1,
        invoiced INTEGER DEFAULT 0,
        invoice_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES project_tasks(id)
      );

      CREATE TABLE IF NOT EXISTS project_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        completed_at TEXT,
        invoice_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS project_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        invoice_number TEXT UNIQUE,
        invoice_date TEXT NOT NULL,
        due_date TEXT,
        amount REAL NOT NULL,
        tax_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
    `);
  }

  // Get all projects
  async getAllProjects(db, filters = {}) {
    let query = `
      SELECT p.*, c.name as client_name,
             (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id) as total_tasks,
             (SELECT COALESCE(SUM(hours), 0) FROM project_time_entries WHERE project_id = p.id) as total_hours
      FROM projects p
      LEFT JOIN parties c ON p.client_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.is_active !== undefined) {
      query += ' AND p.is_active = ?';
      params.push(filters.is_active);
    }
    
    if (filters.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }
    
    if (filters.client_id) {
      query += ' AND p.client_id = ?';
      params.push(filters.client_id);
    }
    
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.code LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    return db.prepare(query).all(...params);
  }

  // Get project by ID
  async getProjectById(db, projectId) {
    const project = db.prepare(`
      SELECT p.*, c.name as client_name, c.email as client_email, c.phone as client_phone
      FROM projects p
      LEFT JOIN parties c ON p.client_id = c.id
      WHERE p.id = ?
    `).get(projectId);
    
    if (project) {
      project.tasks = db.prepare(`
        SELECT * FROM project_tasks 
        WHERE project_id = ?
        ORDER BY due_date ASC
      `).all(projectId);
      
      project.expenses = db.prepare(`
        SELECT pe.*, v.name as vendor_name
        FROM project_expenses pe
        LEFT JOIN vendors v ON pe.vendor_id = v.id
        WHERE pe.project_id = ?
        ORDER BY pe.date DESC
      `).all(projectId);
      
      project.timeEntries = db.prepare(`
        SELECT * FROM project_time_entries 
        WHERE project_id = ?
        ORDER BY date DESC
      `).all(projectId);
      
      project.milestones = db.prepare(`
        SELECT * FROM project_milestones 
        WHERE project_id = ?
        ORDER BY due_date ASC
      `).all(projectId);
      
      // Calculate totals
      project.totalTimeHours = project.timeEntries.reduce((sum, t) => sum + t.hours, 0);
      project.totalExpenses = project.expenses.reduce((sum, e) => sum + e.amount, 0);
      project.totalBillable = project.timeEntries
        .filter(t => t.is_billable)
        .reduce((sum, t) => sum + (t.hours * (t.billing_rate || project.hourly_rate)), 0);
    }
    
    return project;
  }

  // Create project
  async createProject(db, projectData) {
    const {
      name, code, description, client_id, start_date, end_date, deadline,
      status, budget_amount, billing_type, hourly_rate, total_estimated_hours,
      is_active, notes
    } = projectData;
    
    // Generate code if not provided
    const projectCode = code || `PRJ${Date.now().toString(36).toUpperCase()}`;
    
    const result = db.prepare(`
      INSERT INTO projects (
        name, code, description, client_id, start_date, end_date, deadline,
        status, budget_amount, billing_type, hourly_rate, total_estimated_hours,
        is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, projectCode, description || null, client_id || null,
      start_date || null, end_date || null, deadline || null,
      status || 'planning', budget_amount || 0, billing_type || 'fixed',
      hourly_rate || 0, total_estimated_hours || 0,
      is_active !== false ? 1 : 0, notes || null
    );
    
    return { id: result.lastInsertRowid, code: projectCode, ...projectData };
  }

  // Update project
  async updateProject(db, projectId, projectData) {
    const {
      name, description, client_id, start_date, end_date, deadline,
      status, budget_amount, billing_type, hourly_rate, total_estimated_hours,
      is_active, notes
    } = projectData;
    
    db.prepare(`
      UPDATE projects SET
        name = ?, description = ?, client_id = ?, start_date = ?, end_date = ?,
        deadline = ?, status = ?, budget_amount = ?, billing_type = ?,
        hourly_rate = ?, total_estimated_hours = ?, is_active = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, description, client_id, start_date, end_date, deadline,
      status, budget_amount, billing_type, hourly_rate, total_estimated_hours,
      is_active !== false ? 1 : 0, notes, projectId
    );
    
    return { id: projectId, ...projectData };
  }

  // Delete project
  async deleteProject(db, projectId) {
    db.prepare('DELETE FROM project_time_entries WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_expenses WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_milestones WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_tasks WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    return { success: true };
  }

  // Project Tasks
  async addTask(db, projectId, taskData) {
    const result = db.prepare(`
      INSERT INTO project_tasks (project_id, name, description, assigned_to, status, priority, estimated_hours, start_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId, taskData.name, taskData.description || null, taskData.assigned_to || null,
      taskData.status || 'pending', taskData.priority || 'medium', 
      taskData.estimated_hours || 0, taskData.start_date || null, taskData.due_date || null
    );
    
    return { id: result.lastInsertRowid, project_id: projectId, ...taskData };
  }

  async updateTask(db, taskId, taskData) {
    const { name, description, assigned_to, status, priority, estimated_hours, actual_hours, start_date, due_date } = taskData;
    
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    
    db.prepare(`
      UPDATE project_tasks SET
        name = ?, description = ?, assigned_to = ?, status = ?, priority = ?,
        estimated_hours = ?, actual_hours = ?, start_date = ?, due_date = ?,
        completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, description, assigned_to, status, priority,
      estimated_hours, actual_hours, start_date, due_date,
      completedAt, taskId
    );
    
    return { id: taskId, ...taskData };
  }

  async deleteTask(db, taskId) {
    db.prepare('DELETE FROM project_tasks WHERE id = ?').run(taskId);
    return { success: true };
  }

  // Time Entries
  async addTimeEntry(db, projectId, entryData) {
    const result = db.prepare(`
      INSERT INTO project_time_entries (project_id, task_id, description, hours, date, billing_rate, is_billable)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId, entryData.task_id || null, entryData.description || null,
      entryData.hours, entryData.date, entryData.billing_rate || null,
      entryData.is_billable !== false ? 1 : 0
    );
    
    // Update project actual hours
    db.prepare(`
      UPDATE projects SET 
        actual_cost = actual_cost + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(entryData.hours * (entryData.billing_rate || 0), projectId);
    
    return { id: result.lastInsertRowid, project_id: projectId, ...entryData };
  }

  async deleteTimeEntry(db, entryId) {
    const entry = db.prepare('SELECT * FROM project_time_entries WHERE id = ?').get(entryId);
    if (entry) {
      db.prepare('DELETE FROM project_time_entries WHERE id = ?').run(entryId);
      
      // Update project actual cost
      db.prepare(`
        UPDATE projects SET 
          actual_cost = actual_cost - ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(entry.hours * (entry.billing_rate || 0), entry.project_id);
    }
    return { success: true };
  }

  // Project Expenses
  async addProjectExpense(db, projectId, expenseData) {
    const result = db.prepare(`
      INSERT INTO project_expenses (project_id, expense_id, description, amount, date, vendor_id, category, billable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId, expenseData.expense_id || null, expenseData.description || null,
      expenseData.amount, expenseData.date || new Date().toISOString().split('T')[0],
      expenseData.vendor_id || null, expenseData.category || null,
      expenseData.billable ? 1 : 0
    );
    
    // Update project actual cost
    db.prepare(`
      UPDATE projects SET 
        actual_cost = actual_cost + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(expenseData.amount, projectId);
    
    return { id: result.lastInsertRowid, project_id: projectId, ...expenseData };
  }

  async deleteProjectExpense(db, expenseId) {
    const expense = db.prepare('SELECT * FROM project_expenses WHERE id = ?').get(expenseId);
    if (expense) {
      db.prepare('DELETE FROM project_expenses WHERE id = ?').run(expenseId);
      
      // Update project actual cost
      db.prepare(`
        UPDATE projects SET 
          actual_cost = actual_cost - ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(expense.amount, expense.project_id);
    }
    return { success: true };
  }

  // Milestones
  async addMilestone(db, projectId, milestoneData) {
    const result = db.prepare(`
      INSERT INTO project_milestones (project_id, name, description, due_date, amount)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      projectId, milestoneData.name, milestoneData.description || null,
      milestoneData.due_date || null, milestoneData.amount || 0
    );
    
    return { id: result.lastInsertRowid, project_id: projectId, ...milestoneData };
  }

  async updateMilestone(db, milestoneId, milestoneData) {
    const { name, description, due_date, amount, status } = milestoneData;
    
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    
    db.prepare(`
      UPDATE project_milestones SET
        name = ?, description = ?, due_date = ?, amount = ?,
        status = ?, completed_at = ?
      WHERE id = ?
    `).run(name, description, due_date, amount, status, completedAt, milestoneId);
    
    return { id: milestoneId, ...milestoneData };
  }

  // Get project summary
  async getProjectSummary(db, filters = {}) {
    const projects = await this.getAllProjects(db, { is_active: 1, ...filters });
    
    const summary = {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'in_progress').length,
      completed_projects: projects.filter(p => p.status === 'completed').length,
      total_budget: projects.reduce((sum, p) => sum + (p.budget_amount || 0), 0),
      total_actual_cost: projects.reduce((sum, p) => sum + (p.actual_cost || 0), 0),
      total_revenue: projects.reduce((sum, p) => sum + (p.revenue || 0), 0)
    };
    
    return summary;
  }

  // Get project dashboard data
  async getProjectDashboard(db) {
    const activeProjects = await this.getAllProjects(db, { status: 'in_progress' });
    
    const upcomingMilestones = db.prepare(`
      SELECT pm.*, p.name as project_name
      FROM project_milestones pm
      JOIN projects p ON pm.project_id = p.id
      WHERE pm.status = 'pending' AND pm.due_date >= date('now')
      ORDER BY pm.due_date ASC
      LIMIT 10
    `).all();
    
    const overdueTasks = db.prepare(`
      SELECT pt.*, p.name as project_name
      FROM project_tasks pt
      JOIN projects p ON pt.project_id = p.id
      WHERE pt.status != 'completed' AND pt.due_date < date('now')
      ORDER BY pt.due_date ASC
      LIMIT 10
    `).all();
    
    return {
      activeProjects,
      upcomingMilestones,
      overdueTasks
    };
  }

  // Export projects
  async exportProjects(db, filters = {}) {
    const projects = await this.getAllProjects(db, filters);
    return projects;
  }
}

module.exports = new ProjectService();
