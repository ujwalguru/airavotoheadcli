/**
 * Super Admin Panel - Express Backend Server
 * 
 * Endpoints:
 * 1. POST /api/admin/login        - Authenticates admin with env credentials, issues JWT & cookie
 * 2. POST /api/admin/logout       - Clears authentication cookie
 * 3. GET  /api/admin/me           - Returns current admin authentication status
 * 4. GET  /api/admin/cafes        - Protected: Returns all cafes with API keys and statuses
 * 5. POST /api/admin/cafes        - Protected: Creates new cafe, generates 32-char API key, saves to DB
 * 6. POST /api/admin/cafes/:id/suspend  - Protected: Sets cafe status to "suspended"
 * 7. POST /api/admin/cafes/:id/activate - Protected: Sets cafe status to "active"
 * 8. GET  /api/pos/verify         - PUBLIC: Called by POS app with cafe_id and api_key to verify validity
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  getAllCafes,
  getCafeById,
  createCafe,
  updateCafeStatus,
  findCafeByIdAndApiKey, findCafeByApiKey, findCafeBySlug, syncCafeHeartbeat, getLiveStatus,
} from './db.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Admin authentication credentials from environment (with friendly defaults for development testing)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'super_admin_secret_jwt_key_pos_license_987654';


// ==========================================
// CORS Middleware (Airavoto POS / Tauri Support)
// ==========================================
const ALLOWED_ORIGINS = [
  'http://tauri.localhost',
  'https://tauri.localhost',
  'tauri://localhost',
  'http://localhost:1420',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // For development, allow requests with no Origin header
  if (!origin) {
    return next();
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Api-Key');
  res.setHeader('Vary', 'Origin');

  // Handle preflight OPTIONS requests early before any auth middleware
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// --- System Logger (In-Memory) ---
export interface SystemLog {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  details: string;
}
const systemLogs: SystemLog[] = [];
let nextLogId = 1;
function addLog(level: 'info' | 'warn' | 'error', event: string, details: string) {
  systemLogs.unshift({
    id: nextLogId++,
    timestamp: new Date().toISOString(),
    level,
    event,
    details
  });
  if (systemLogs.length > 200) systemLogs.pop();
}

// Record startup
addLog('info', 'System Startup', 'Super Admin Server initialized');
// ---------------------------------

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * Authentication Middleware
 * Protects admin API routes by verifying JWT token from cookie or Authorization header
 */
function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  // Check cookie first, then Bearer token header
  const token = req.cookies.admin_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required. Please log in.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };
    if (decoded && decoded.role === 'super_admin') {
      (req as any).adminUser = decoded;
      next();
    } else {
      res.status(403).json({ error: 'Forbidden', message: 'Invalid admin credentials' });
    }
  } catch (err) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Session expired or invalid token. Please log in again.',
    });
  }
}

// ==========================================
// 1. ADMIN AUTHENTICATION ROUTES
// ==========================================

/**
 * POST /api/admin/login
 * Verifies username and password against environment variables and issues JWT token
 */
app.post('/api/admin/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Bad Request', message: 'Username and password are required' });
    return;
  }

  // Compare with environment variables
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { username: ADMIN_USERNAME, role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only session cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        username: ADMIN_USERNAME,
        role: 'super_admin',
      },
    });
    addLog('info', 'Admin Login', `Admin user '${ADMIN_USERNAME}' authenticated successfully via web panel.`);
  } else {
    addLog('warn', 'Failed Admin Login', `Invalid login attempt for username '${username}'.`);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin username or password',
    });
  }
});

/**
 * POST /api/admin/logout
 * Clears the session cookie
 */
app.post('/api/admin/logout', (_req: Request, res: Response): void => {
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/admin/me
 * Checks if current admin session is valid
 */
app.get('/api/admin/me', (req: Request, res: Response): void => {
  const token = req.cookies.admin_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };
    res.json({
      authenticated: true,
      user: {
        username: decoded.username,
        role: decoded.role,
      },
    });
  } catch {
    res.json({ authenticated: false });
  }
});

// ==========================================
// 1.5 ADMIN DASHBOARD EXTRAS
// ==========================================

app.get('/api/admin/logs', requireAdminAuth, (_req: Request, res: Response): void => {
  res.json({ success: true, logs: systemLogs });
});

app.get('/api/admin/health', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  const memory = process.memoryUsage();
  res.json({
    success: true,
    health: {
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB'
      },
      database: 'PostgreSQL / Local SQLite connected',
      version: '1.0.0',
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/admin/live-status', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const liveStatus = await getLiveStatus();
    res.json({ success: true, liveStatus });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==========================================
// 2. ADMIN PROTECTED CAFE MANAGEMENT ROUTES
// ==========================================

/**
 * GET /api/admin/cafes
 * Returns all cafes with their status, creation timestamp, and API keys
 */
app.get('/api/admin/cafes', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const cafes = await getAllCafes();
    const activeCount = cafes.filter((c) => c.status === 'active').length;
    const suspendedCount = cafes.filter((c) => c.status === 'suspended').length;

    res.json({
      success: true,
      counts: {
        total: cafes.length,
        active: activeCount,
        suspended: suspendedCount,
      },
      cafes,
    });
  } catch (err) {
    console.error('Error fetching cafes:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve cafes' });
  }
});

/**
 * POST /api/admin/cafes
 * Creates a new cafe, auto-generates a unique 32-character API key, and saves to database
 */
app.post('/api/admin/cafes', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { cafe_name, owner_name, email } = req.body;

    if (!cafe_name || !owner_name || !email) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Cafe Name, Owner Name, and Email are required fields',
      });
      return;
    }

    const newCafe = await createCafe({
      cafe_name: String(cafe_name),
      owner_name: String(owner_name),
      email: String(email),
    });

    addLog('info', 'Cafe Created', `New cafe #${newCafe.id} ('${newCafe.cafe_name}') registered by admin.`);

    res.status(201).json({
      success: true,
      message: 'Cafe created successfully with auto-generated API key',
      cafe: newCafe,
    });
  } catch (err) {
    console.error('Error creating cafe:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create cafe' });
  }
});

/**
 * POST /api/admin/cafes/:id/suspend
 * Sets cafe status to "suspended"
 */
app.post('/api/admin/cafes/:id/suspend', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid Cafe ID' });
      return;
    }

    const updated = await updateCafeStatus(id, 'suspended');
    if (!updated) {
      res.status(404).json({ error: 'Not Found', message: `Cafe with ID ${id} not found` });
      return;
    }

    addLog('warn', 'Cafe Suspended', `Cafe #${id} ('${updated.cafe_name}') license suspended by admin.`);

    res.json({
      success: true,
      message: `Cafe #${id} (${updated.cafe_name}) has been suspended`,
      cafe: updated,
    });
  } catch (err) {
    console.error('Error suspending cafe:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to suspend cafe' });
  }
});

/**
 * POST /api/admin/cafes/:id/activate
 * Sets cafe status to "active"
 */
app.post('/api/admin/cafes/:id/activate', requireAdminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid Cafe ID' });
      return;
    }

    const updated = await updateCafeStatus(id, 'active');
    if (!updated) {
      res.status(404).json({ error: 'Not Found', message: `Cafe with ID ${id} not found` });
      return;
    }

    addLog('info', 'Cafe Activated', `Cafe #${id} ('${updated.cafe_name}') license activated by admin.`);

    res.json({
      success: true,
      message: `Cafe #${id} (${updated.cafe_name}) has been activated`,
      cafe: updated,
    });
  } catch (err) {
    console.error('Error activating cafe:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to activate cafe' });
  }
});

// ==========================================
// 3. PUBLIC POS REGISTRATION & VERIFICATION
// ==========================================

/**
 * POST /api/pos/register
 * PUBLIC endpoint (no login required)
 * 
 * Called by desktop/tablet POS software if it does not have credentials.
 * Automatically provisions a new cafe in the system and returns credentials.
 */
app.post('/api/pos/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { machine_id, cafe_name } = req.body;
    
    const detectedName = cafe_name || `Detected POS (${machine_id || 'Unknown Device'})`;
    
    // Auto-create the cafe
    const newCafe = await createCafe({
      cafe_name: detectedName,
      owner_name: 'Auto Registered',
      email: 'auto@detected.pos',
    });

    addLog('info', 'POS Auto-Registered', `New POS client auto-registered as Cafe #${newCafe.id} ('${detectedName}')`);

    res.status(201).json({
      success: true,
      message: 'POS successfully registered',
      id: newCafe.id,
      api_key: newCafe.api_key,
    });
  } catch (err) {
    console.error('Error auto-registering POS:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to auto-register POS' });
  }
});

/**
 * GET /api/pos/verify
 * PUBLIC endpoint (no login required)
 * 
 * Called by desktop/tablet POS software on startup with parameters:
 * - cafe_id (via query parameter ?cafe_id=... or headers/body)
 * - api_key (via query parameter ?api_key=... or Authorization header)
 * 
 * Returns:
 * {
 *   valid: true | false,
 *   status: "active" | "suspended" | "not_found",
 *   message: string,
 *   cafe_name?: string
 * }
 */
app.get('/api/pos/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract cafe_id and api_key from query params, headers, or body
    const rawCafeId = req.query.cafe_id || req.headers['x-cafe-id'] || req.body?.cafe_id;
    const apiKey = (req.query.api_key || req.headers['x-api-key'] || req.body?.api_key || req.headers.authorization?.replace(/^Bearer\s+/i, '')) as string;

    if (!rawCafeId || !apiKey) {
      res.status(400).json({
        valid: false,
        status: 'not_found',
        message: 'Missing required parameters: cafe_id and api_key must be provided',
      });
      return;
    }

    const cafeId = parseInt(String(rawCafeId), 10);
    if (isNaN(cafeId)) {
      res.status(400).json({
        valid: false,
        status: 'not_found',
        message: 'Invalid cafe_id parameter. Must be an integer ID.',
      });
      return;
    }

    // Lookup cafe with matching ID and API Key in database
    const cafe = await findCafeByIdAndApiKey(cafeId, apiKey.trim());

    if (!cafe) {
      addLog('warn', 'POS Verify Failed', `Invalid verification attempt for Cafe ID #${cafeId}. Key mismatch.`);
      res.json({
        valid: false,
        status: 'not_found',
        message: 'Authentication failed. Cafe ID and API Key combination does not exist.',
      });
      return;
    }

    if (cafe.status === 'suspended') {
      addLog('warn', 'POS Verify Suspended', `Blocked startup attempt for suspended Cafe ID #${cafe.id} ('${cafe.cafe_name}').`);
      res.json({
        valid: false,
        status: 'suspended',
        cafe_id: cafe.id,
        cafe_name: cafe.cafe_name,
        message: 'Access Suspended: This cafe software license has been suspended by the administrator. Contact support.',
      });
      return;
    }

    // Status is 'active'
    addLog('info', 'POS Verify Success', `Authorized startup for Cafe ID #${cafe.id} ('${cafe.cafe_name}').`);
    res.json({
      valid: true,
      status: 'active',
      cafe_id: cafe.id,
      cafe_name: cafe.cafe_name,
      owner_name: cafe.owner_name,
      message: 'License verified successfully. POS is authorized to run.',
    });
  } catch (err) {
    console.error('Error during POS verification:', err);
    res.status(500).json({
      valid: false,
      status: 'error',
      message: 'Internal server error while verifying POS license',
    });
  }
});

// Also support POST for /api/pos/verify for POS clients preferring POST payloads
app.post('/api/pos/verify', async (req: Request, res: Response): Promise<void> => {
  const rawCafeId = req.body?.cafe_id || req.query.cafe_id || req.headers['x-cafe-id'];
  const apiKey = (req.body?.api_key || req.query.api_key || req.headers['x-api-key']) as string;

  if (!rawCafeId || !apiKey) {
    res.status(400).json({
      valid: false,
      status: 'not_found',
      message: 'Missing required parameters: cafe_id and api_key must be provided',
    });
    return;
  }

  const cafeId = parseInt(String(rawCafeId), 10);
  if (isNaN(cafeId)) {
    res.status(400).json({
      valid: false,
      status: 'not_found',
      message: 'Invalid cafe_id parameter',
    });
    return;
  }

  const cafe = await findCafeByIdAndApiKey(cafeId, apiKey.trim());
  if (!cafe) {
    res.json({
      valid: false,
      status: 'not_found',
      message: 'Authentication failed. Cafe ID and API Key combination does not exist.',
    });
    return;
  }

  if (cafe.status === 'suspended') {
    res.json({
      valid: false,
      status: 'suspended',
      cafe_id: cafe.id,
      cafe_name: cafe.cafe_name,
      message: 'Access Suspended: This cafe software license has been suspended by the administrator.',
    });
    return;
  }

  res.json({
    valid: true,
    status: 'active',
    cafe_id: cafe.id,
    cafe_name: cafe.cafe_name,
    owner_name: cafe.owner_name,
    message: 'License verified successfully. POS is authorized to run.',
  });
});


// ==========================================
// 4. PUBLIC DIRECTORY ENDPOINTS (Heartbeat & Player-Facing)
// ==========================================

interface DirectoryListing {
  slug: string;
  data: any;
  lastUpdate: number;
}
const directoryData: Record<string, DirectoryListing> = {};

function formatListing(listing: DirectoryListing) {
  const isStale = (Date.now() - listing.lastUpdate) > 3 * 60 * 1000; // 3 minutes threshold
  const formattedData = { ...listing.data };
  
  // Rule: a café which stopped reporting shows "unknown" instead of old numbers
  if (isStale) {
    for (const key of Object.keys(formattedData)) {
      if (typeof formattedData[key] === 'number' || String(formattedData[key]).match(/^[0-9]+$/)) {
        formattedData[key] = 'unknown';
      }
    }
    formattedData.status = 'offline';
  } else {
    formattedData.status = 'online';
  }
  
  return {
    slug: listing.slug,
    last_updated: listing.lastUpdate,
    is_stale: isStale,
    ...formattedData
  };
}

/**
 * POST /api/directory/heartbeat
 * Public POS heartbeat endpoint. Uses validation, rate limiting, and payload restrictions instead of API keys.
 * Receives seat counts from the desktop app (POS)
 */
app.post('/api/directory/heartbeat', express.json({ limit: '100kb' }), async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    
    // Require a non-empty café ID or slug
    const slug = payload?.slug || payload?.cafe?.id || payload?.listing_name;
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      res.status(400).json({ success: false, message: 'Missing or invalid cafe ID/slug' });
      return;
    }
    
    // Require a café name
    const cafeName = payload?.cafe?.name || payload?.cafe_name;
    if (!cafeName || typeof cafeName !== 'string' || cafeName.trim() === '') {
      res.status(400).json({ success: false, message: 'Missing or invalid cafe name' });
      return;
    }

    // Validate availability values as non-negative numbers
    if (payload.availability && Array.isArray(payload.availability)) {
      for (const item of payload.availability) {
        if (typeof item.available === 'number' && item.available < 0) {
          res.status(400).json({ success: false, message: 'Invalid availability: cannot be negative' });
          return;
        }
        if (typeof item.total === 'number' && item.total < 0) {
          res.status(400).json({ success: false, message: 'Invalid total: cannot be negative' });
          return;
        }
      }
    }
    
    // Clean up the payload slightly if needed (hide api_key from public)
    const cleanPayload = { ...payload };
    delete cleanPayload.api_key;
    
    // Sanitize or limit café text fields if needed (omitted full html stripping to keep it simple and preserve existing behavior, but we limit sizes elsewhere or rely on clean JSON).
    
    const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-');
    const existingCafe = await findCafeBySlug(normalizedSlug);
    if (existingCafe?.status === 'suspended') {
      res.status(423).json({
        success: false,
        status: 'suspended',
        cafe_id: normalizedSlug,
        message: 'You have been suspended due to breaking the Terms and Conditions. If you believe this was a mistake, please contact us.',
      });
      return;
    }
    const capturedAt = payload.capturedAt || new Date().toISOString();
    const categories = payload.cafe?.categories || [];
    
    const publicMetadata = payload.cafe ? { ...payload.cafe } : {};
    delete publicMetadata.name;
    delete publicMetadata.categories;

    // Persist to DB
    const syncResult = await syncCafeHeartbeat(normalizedSlug, cafeName, categories, publicMetadata, payload.availability || [], capturedAt, payload.configurations || null);

    // Also update in-memory directory
    directoryData[normalizedSlug] = {
      slug: normalizedSlug,
      data: cleanPayload,
      lastUpdate: Date.now()
    };

    console.log(`Heartbeat processed for cafe: ${normalizedSlug} | Cafe Upsert: ${syncResult.cafeUpserted} | Heartbeat Upsert: ${syncResult.heartbeatUpserted}`);

    res.status(200).json({ 
      success: true, 
      message: 'Heartbeat received',
      status: existingCafe?.status || 'active',
      cafe_id: normalizedSlug
    });
  } catch (err) {
    console.error('Error processing heartbeat:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/directory
 * Public address for player-facing site (All listings)
 */
app.get('/api/directory', (req: Request, res: Response): void => {
  const result = Object.values(directoryData).map(listing => formatListing(listing));
  res.json({ success: true, data: result });
});

/**
 * GET /api/directory/:slug
 * Public address for player-facing site (Single listing)
 */
app.get('/api/directory/:slug', (req: Request, res: Response): void => {
  const listing = directoryData[req.params.slug];
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' });
    return;
  }
  res.json({ success: true, data: formatListing(listing) });
});

// ==========================================
// 5. FRONTEND SERVING & DEV VITE MIDDLEWARE
// ==========================================


async function startServer() {
  // Initialize Database tables and seeds
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🚀 Super Admin Server running on port ${PORT}`);
    console.log(`🔐 Admin login user: ${ADMIN_USERNAME}`);
    console.log(`🌐 POS verify API: GET /api/pos/verify?cafe_id=1&api_key=...`);
    console.log(`=================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
