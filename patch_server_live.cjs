const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace the live-status route implementation
const targetRegex = /app\.get\('\/api\/admin\/live-status', requireAdminAuth, async \(_req: Request, res: Response\): Promise<void> => \{([\s\S]*?)res\.json\(liveStatus\);\n  \} catch \(err\) \{/m;

const replacement = `app.get('/api/admin/live-status', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const liveStatus = await getLiveStatus();
    res.json(liveStatus);
  } catch (err) {`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts /api/admin/live-status");
