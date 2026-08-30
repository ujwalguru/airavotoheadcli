/**
 * Database Layer for Super Admin Panel
 * 
 * Supports:
 * 1. PostgreSQL connection via DATABASE_URL if available
 * 2. Standalone file-backed storage (cafes_db.json) fallback when PostgreSQL is not configured
 * 
 * Schema:
 * - id: integer (auto-incrementing primary key)
 * - cafe_name: text
 * - owner_name: text
 * - email: text
 * - api_key: text (32-character unique random string)
 * - status: text ("active" | "suspended", default "active")
 * - created_at: timestamp with time zone (default CURRENT_TIMESTAMP)
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface Cafe {
  id: number;
  cafe_name: string;
  owner_name: string;
  email: string;
  api_key: string;
  status: 'active' | 'suspended';
  created_at: string;
}

// In-memory / file-based storage path for fallback mode
const DATA_FILE = path.join(process.cwd(), 'cafes_data.json');

// PostgreSQL Pool instance (if configured)
let pgPool: pg.Pool | null = null;
let usePostgres = false;

/**
 * Initialize Database connection and tables
 */
export async function initDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    try {
      console.log('Connecting to PostgreSQL database...');
      pgPool = new pg.Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost')
          ? { rejectUnauthorized: false }
          : false,
        connectionTimeoutMillis: 5000,
      });

      // Test connection
      const client = await pgPool.connect();
      
      // Create 'cafes' table if it does not exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS cafes (
          id SERIAL PRIMARY KEY,
          cafe_name TEXT NOT NULL,
          owner_name TEXT NOT NULL,
          email TEXT NOT NULL,
          api_key VARCHAR(64) UNIQUE NOT NULL,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      client.release();
      usePostgres = true;
      console.log('PostgreSQL database initialized and table verified.');

      // Check if we should seed default data
      // (Removed default cafe seeding to keep DB empty by default)
      return;
    } catch (err) {
      console.warn('PostgreSQL connection failed or not available, using persistent file database:', (err as Error).message);
      usePostgres = false;
      pgPool = null;
    }
  }

  // Fallback to local persistent JSON store
  console.log('Using persistent local database storage (cafes_data.json).');
  if (!fs.existsSync(DATA_FILE)) {
    const initialData: Cafe[] = [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}


/**
 * Generate a 32-character cryptographically random unique API key
 */
export function generateApiKey(): string {
  return crypto.randomBytes(16).toString('hex'); // 16 bytes = 32 hex characters
}

/**
 * Helper to read cafes from file store
 */
function readLocalCafes(): Cafe[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading local cafes data:', err);
    return [];
  }
}

/**
 * Helper to write cafes to file store
 */
function writeLocalCafes(cafes: Cafe[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cafes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local cafes data:', err);
  }
}

/**
 * Get all cafes ordered by creation date descending
 */
export async function getAllCafes(): Promise<Cafe[]> {
  if (usePostgres && pgPool) {
    const res = await pgPool.query('SELECT * FROM cafes ORDER BY id DESC');
    return res.rows.map((row) => ({
      id: row.id,
      cafe_name: row.cafe_name,
      owner_name: row.owner_name,
      email: row.email,
      api_key: row.api_key,
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
    }));
  }

  const cafes = readLocalCafes();
  return cafes.sort((a, b) => b.id - a.id);
}

/**
 * Find cafe by ID
 */
export async function getCafeById(id: number): Promise<Cafe | null> {
  if (usePostgres && pgPool) {
    const res = await pgPool.query('SELECT * FROM cafes WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      cafe_name: row.cafe_name,
      owner_name: row.owner_name,
      email: row.email,
      api_key: row.api_key,
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  const cafes = readLocalCafes();
  return cafes.find((c) => c.id === id) || null;
}

/**
 * Find cafe by ID and API Key (Used by POS verification)
 */
export async function findCafeByIdAndApiKey(id: number, apiKey: string): Promise<Cafe | null> {
  if (usePostgres && pgPool) {
    const res = await pgPool.query(
      'SELECT * FROM cafes WHERE id = $1 AND api_key = $2',
      [id, apiKey]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      cafe_name: row.cafe_name,
      owner_name: row.owner_name,
      email: row.email,
      api_key: row.api_key,
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  const cafes = readLocalCafes();
  return cafes.find((c) => c.id === id && c.api_key === apiKey) || null;
}

/**
 * Create a new cafe with auto-generated 32-char API key and active status
 */
export async function createCafe(params: {
  cafe_name: string;
  owner_name: string;
  email: string;
}): Promise<Cafe> {
  const apiKey = generateApiKey();
  const status: 'active' = 'active';

  if (usePostgres && pgPool) {
    const res = await pgPool.query(
      `INSERT INTO cafes (cafe_name, owner_name, email, api_key, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [params.cafe_name.trim(), params.owner_name.trim(), params.email.trim(), apiKey, status]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      cafe_name: row.cafe_name,
      owner_name: row.owner_name,
      email: row.email,
      api_key: row.api_key,
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  const cafes = readLocalCafes();
  const nextId = cafes.length > 0 ? Math.max(...cafes.map((c) => c.id)) + 1 : 1;
  const newCafe: Cafe = {
    id: nextId,
    cafe_name: params.cafe_name.trim(),
    owner_name: params.owner_name.trim(),
    email: params.email.trim(),
    api_key: apiKey,
    status: 'active',
    created_at: new Date().toISOString(),
  };

  cafes.push(newCafe);
  writeLocalCafes(cafes);
  return newCafe;
}

/**
 * Update cafe status (active or suspended)
 */
export async function updateCafeStatus(id: number, status: 'active' | 'suspended'): Promise<Cafe | null> {
  if (usePostgres && pgPool) {
    const res = await pgPool.query(
      'UPDATE cafes SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      cafe_name: row.cafe_name,
      owner_name: row.owner_name,
      email: row.email,
      api_key: row.api_key,
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  const cafes = readLocalCafes();
  const index = cafes.findIndex((c) => c.id === id);
  if (index === -1) return null;

  cafes[index].status = status;
  writeLocalCafes(cafes);
  return cafes[index];
}

export async function findCafeByApiKey(apiKey: string): Promise<Cafe | null> {
  if (usePostgres && pgPool) {
    const res = await pgPool.query('SELECT * FROM cafes WHERE api_key = $1', [apiKey]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }
  const cafes = readLocalCafes();
  return cafes.find((c: Cafe) => c.api_key === apiKey) || null;
}
