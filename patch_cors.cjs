const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const corsMiddleware = `
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

// --- System Logger (In-Memory) ---`;

if (code.includes('// --- System Logger (In-Memory) ---')) {
  code = code.replace('// --- System Logger (In-Memory) ---', corsMiddleware);
  fs.writeFileSync('server.ts', code);
  console.log("CORS patch applied.");
} else {
  console.error("Target string not found in server.ts");
}
