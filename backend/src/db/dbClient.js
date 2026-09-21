const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

let pool = null;
let sqliteDb = null;
let isPostgres = false;

// Initialize Database connection
async function initDb() {
  if (env.DATABASE_URL) {
    try {
      pool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      // Test connection
      await pool.query('SELECT NOW()');
      console.log('✅ Connected to PostgreSQL database at:', env.DATABASE_URL.split('@')[1] || 'PostgreSQL Server');
      isPostgres = true;
      return;
    } catch (err) {
      console.warn('⚠️ PostgreSQL connection failed with DATABASE_URL. Falling back to local embedded database engine:', err.message);
    }
  }

  // Fallback to SQLite with high fidelity
  const dbDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'academic_nexus.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('journal_mode = WAL');
  isPostgres = false;
  console.log('✅ Using high-performance embedded database at:', dbPath);

  // Initialize SQLite schema
  initSqliteSchema();
}

function initSqliteSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('STUDENT', 'PROFESSOR')),
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      semester TEXT DEFAULT 'Fall 2026',
      professor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(course_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      deadline DATETIME NOT NULL,
      submission_type TEXT NOT NULL CHECK (submission_type IN ('INDIVIDUAL', 'GROUP')),
      max_score INTEGER DEFAULT 100,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      submission_text TEXT,
      submission_url TEXT,
      status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'OVERDUE')),
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acknowledged_at DATETIME,
      acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      grade INTEGER,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(assignment_id, student_id),
      UNIQUE(assignment_id, group_id)
    );
  `;
  sqliteDb.exec(schema);
}

// Unified query runner
async function query(text, params = []) {
  if (!pool && !sqliteDb) {
    await initDb();
  }

  if (isPostgres && pool) {
    const res = await pool.query(text, params);
    return res;
  }

  // SQLite execution
  // Properly map $1, $2, $1 positional indices to SQLite ? parameters
  const sqliteParams = [];
  let sql = text.replace(/\$(\d+)/g, (match, idx) => {
    const paramIndex = parseInt(idx, 10) - 1;
    sqliteParams.push(params[paramIndex]);
    return '?';
  });

  // Handle PostgreSQL specific functions
  sql = sql.replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP");
  sql = sql.replace(/CURRENT_TIMESTAMP\(\)/gi, "CURRENT_TIMESTAMP");

  const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(sql);
  const isInsert = /^\s*INSERT/i.test(sql);
  const hasReturning = /RETURNING\s+(.+)$/i.test(sql);

  try {
    if (isSelect) {
      const stmt = sqliteDb.prepare(sql);
      const rows = stmt.all(...sqliteParams);
      return { rows, rowCount: rows.length };
    }

    if (hasReturning) {
      // Extract returning clause
      const match = sql.match(/RETURNING\s+(.+)$/i);
      const returningCols = match ? match[1].trim() : '*';
      const cleanSql = sql.replace(/RETURNING\s+.+$/i, '').trim();

      const stmt = sqliteDb.prepare(cleanSql);
      const info = stmt.run(...sqliteParams);

      if (isInsert && info.lastInsertRowid) {
        const tblMatch = cleanSql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
        const tbl = tblMatch ? tblMatch[1] : 'users';
        const fetchSql = `SELECT ${returningCols} FROM ${tbl} WHERE rowid = ?`;
        const returnedRow = sqliteDb.prepare(fetchSql).get(info.lastInsertRowid);
        return {
          rows: returnedRow ? [returnedRow] : [],
          rowCount: info.changes
        };
      } else {
        return { rows: [], rowCount: info.changes };
      }
    }

    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(...sqliteParams);
    return { rows: [], rowCount: info.changes, lastID: info.lastInsertRowid };
  } catch (err) {
    console.error('SQL Execution Error:', err.message, 'in query:', sql, 'params:', sqliteParams);
    throw err;
  }
}

module.exports = {
  query,
  initDb,
  getIsPostgres: () => isPostgres
};
