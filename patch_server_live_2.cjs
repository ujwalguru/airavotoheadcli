const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.get\('\/api\/admin\/live-status'[\s\S]*?res\.json\(\{ success: true, liveStatus \}\);\n  \} catch \(err\) \{/;

const replacement = "app.get('/api/admin/live-status', requireAdminAuth, async (_req: Request, res: Response): Promise<void> => {\n  try {\n    const liveStatus = await getLiveStatus();\n    res.json({ success: true, liveStatus });\n  } catch (err) {";

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts successfully.");
} else {
  console.log("Regex not matched.");
}
