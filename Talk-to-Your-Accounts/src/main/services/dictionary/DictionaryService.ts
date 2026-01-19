// Dictionary Service - Manages custom accounting vocabulary
// Stores and retrieves terms for better voice recognition accuracy

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DictionaryTerm, DictionaryCategory } from '../../shared/types/voice';

export class DictionaryService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'data', 'dictionary.db');
  }

  async initialize(): Promise<void> {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.createTables();
    await this.seedDefaultTerms();
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dictionary_terms (
        id TEXT PRIMARY KEY,
        spoken TEXT NOT NULL,
        mapped TEXT NOT NULL,
        category TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dictionary_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        isDefault INTEGER DEFAULT 0
      )
    `);

    // Create index for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dictionary_spoken ON dictionary_terms(spoken);
      CREATE INDEX IF NOT EXISTS idx_dictionary_category ON dictionary_terms(category);
    `);
  }

  private async seedDefaultTerms(): Promise<void> {
    if (!this.db) return;

    // Check if already seeded
    const count = this.db.prepare('SELECT COUNT(*) as count FROM dictionary_terms').get() as { count: number };
    if (count.count > 0) return;

    const defaultCategories = [
      { id: 'cat_expense', name: 'Expense Categories', isDefault: 1 },
      { id: 'cat_income', name: 'Income Sources', isDefault: 1 },
      { id: 'cat_parties', name: 'Common Parties', isDefault: 1 },
      { id: 'cat_products', name: 'Common Products', isDefault: 1 },
      { id: 'cat_accounting', name: 'Accounting Terms', isDefault: 1 },
      { id: 'cat_gst', name: 'GST/Tax Terms', isDefault: 1 },
    ];

    const insertCategory = this.db.prepare(`
      INSERT INTO dictionary_categories (id, name, isDefault) VALUES (?, ?, ?)
    `);

    const insertTerm = this.db.prepare(`
      INSERT INTO dictionary_terms (id, spoken, mapped, category, isActive) VALUES (?, ?, ?, ?, 1)
    `);

    // Insert categories
    for (const cat of defaultCategories) {
      insertCategory.run(cat.id, cat.name, cat.isDefault ? 1 : 0);
    }

    // Seed accounting terms
    const defaultTerms: Array<{ spoken: string; mapped: string; category: string }> = [
      // Expense Categories
      { spoken: 'groceries', mapped: 'Groceries', category: 'cat_expense' },
      { spoken: 'office supplies', mapped: 'Office Supplies', category: 'cat_expense' },
      { spoken: 'travel expenses', mapped: 'Travel', category: 'cat_expense' },
      { spoken: 'fuel', mapped: 'Fuel', category: 'cat_expense' },
      { spoken: 'internet bill', mapped: 'Internet', category: 'cat_expense' },
      { spoken: 'electricity bill', mapped: 'Electricity', category: 'cat_expense' },
      { spoken: 'water bill', mapped: 'Water', category: 'cat_expense' },
      { spoken: 'rent', mapped: 'Rent', category: 'cat_expense' },
      { spoken: 'salary', mapped: 'Salary', category: 'cat_expense' },
      { spoken: 'maintenance', mapped: 'Maintenance', category: 'cat_expense' },
      
      // Income Sources
      { spoken: 'sales', mapped: 'Sales Revenue', category: 'cat_income' },
      { spoken: 'consulting', mapped: 'Consulting Income', category: 'cat_income' },
      { spoken: 'interest', mapped: 'Interest Income', category: 'cat_income' },
      
      // Common Parties
      { spoken: 'mcdonalds', mapped: 'McDonalds India', category: 'cat_parties' },
      { spoken: 'starbucks', mapped: 'Starbucks India', category: 'cat_parties' },
      { spoken: 'amazon', mapped: 'Amazon India', category: 'cat_parties' },
      { spoken: 'flipkart', mapped: 'Flipkart India', category: 'cat_parties' },
      
      // Accounting Terms
      { spoken: 'e bit da', mapped: 'EBITDA', category: 'cat_accounting' },
      { spoken: 'p and l', mapped: 'P&L', category: 'cat_accounting' },
      { spoken: 'balance sheet', mapped: 'Balance Sheet', category: 'cat_accounting' },
      { spoken: 'cash flow', mapped: 'Cash Flow', category: 'cat_accounting' },
      { spoken: 'depreciation', mapped: 'Depreciation', category: 'cat_accounting' },
      { spoken: 'amortization', mapped: 'Amortization', category: 'cat_accounting' },
      { spoken: 'revenue', mapped: 'Revenue', category: 'cat_accounting' },
      { spoken: 'liabilities', mapped: 'Liabilities', category: 'cat_accounting' },
      { spoken: 'assets', mapped: 'Assets', category: 'cat_accounting' },
      
      // GST/Tax Terms
      { spoken: 'gst', mapped: 'GST', category: 'cat_gst' },
      { spoken: 'gstr one', mapped: 'GSTR-1', category: 'cat_gst' },
      { spoken: 'gstr three b', mapped: 'GSTR-3B', category: 'cat_gst' },
      { spoken: 'input tax credit', mapped: 'ITC', category: 'cat_gst' },
      { spoken: 'tds', mapped: 'TDS', category: 'cat_gst' },
      { spoken: 'tax deduction', mapped: 'TDS', category: 'cat_gst' },
    ];

    for (const term of defaultTerms) {
      const id = `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      insertTerm.run(id, term.spoken, term.mapped, term.category);
    }
  }

  async getAllTerms(): Promise<DictionaryTerm[]> {
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    const rows = this.db.prepare(`
      SELECT * FROM dictionary_terms ORDER BY category, spoken
    `).all();

    return rows.map((row: any) => ({
      id: row.id,
      spoken: row.spoken,
      mapped: row.mapped,
      category: row.category,
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt)
    }));
  }

  async getTermsByCategory(category: string): Promise<DictionaryTerm[]> {
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    const rows = this.db.prepare(`
      SELECT * FROM dictionary_terms WHERE category = ? AND isActive = 1
    `).all(category);

    return rows.map((row: any) => ({
      id: row.id,
      spoken: row.spoken,
      mapped: row.mapped,
      category: row.category,
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt)
    }));
  }

  async getCategories(): Promise<DictionaryCategory[]> {
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    const rows = this.db.prepare(`
      SELECT * FROM dictionary_categories ORDER BY name
    `).all();

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      terms: []
    }));
  }

  async addTerm(spoken: string, mapped: string, category: string): Promise<DictionaryTerm> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const id = `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.db.prepare(`
      INSERT INTO dictionary_terms (id, spoken, mapped, category, isActive) VALUES (?, ?, ?, ?, 1)
    `).run(id, spoken.toLowerCase().trim(), mapped.trim(), category);

    return {
      id,
      spoken: spoken.toLowerCase().trim(),
      mapped: mapped.trim(),
      category,
      isActive: true,
      createdAt: new Date()
    };
  }

  async updateTerm(id: string, updates: Partial<DictionaryTerm>): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    const setClause = [];
    const params = [];

    if (updates.spoken !== undefined) {
      setClause.push('spoken = ?');
      params.push(updates.spoken.toLowerCase().trim());
    }
    if (updates.mapped !== undefined) {
      setClause.push('mapped = ?');
      params.push(updates.mapped.trim());
    }
    if (updates.category !== undefined) {
      setClause.push('category = ?');
      params.push(updates.category);
    }
    if (updates.isActive !== undefined) {
      setClause.push('isActive = ?');
      params.push(updates.isActive ? 1 : 0);
    }

    if (setClause.length === 0) return;

    params.push(id);
    this.db.prepare(`
      UPDATE dictionary_terms SET ${setClause.join(', ')} WHERE id = ?
    `).run(...params);
  }

  async removeTerm(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) return;

    this.db.prepare('DELETE FROM dictionary_terms WHERE id = ?').run(id);
  }

  // Get terms as a map for quick lookup during transcription
  async getTermMap(): Promise<Map<string, string>> {
    const terms = await this.getAllTerms();
    const termMap = new Map<string, string>();
    
    for (const term of terms) {
      termMap.set(term.spoken, term.mapped);
    }
    
    return termMap;
  }

  // Get comma-separated context string for Whisper prompt
  async getContextPrompt(): Promise<string> {
    const terms = await this.getAllTerms();
    const contextTerms = terms
      .filter(t => t.isActive)
      .slice(0, 50) // Limit to first 50 terms for prompt
      .map(t => t.spoken);
    
    return contextTerms.join(', ');
  }

  async searchTerms(query: string): Promise<DictionaryTerm[]> {
    if (!this.db) await this.initialize();
    if (!this.db) return [];

    const rows = this.db.prepare(`
      SELECT * FROM dictionary_terms 
      WHERE (spoken LIKE ? OR mapped LIKE ?) AND isActive = 1
      LIMIT 20
    `).all(`%${query.toLowerCase()}%`, `%${query}%`);

    return rows.map((row: any) => ({
      id: row.id,
      spoken: row.spoken,
      mapped: row.mapped,
      category: row.category,
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt)
    }));
  }

  close(): void {
    this.db?.close();
  }
}

export const dictionaryService = new DictionaryService();
