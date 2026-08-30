const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "await syncCafeHeartbeat(",
  "const syncResult = await syncCafeHeartbeat("
);

code = code.replace(
  "console.log(\`Heartbeat processed for cafe: \${normalizedSlug}\`);",
  "console.log(\`Heartbeat processed for cafe: \${normalizedSlug} | Cafe Upsert: \${syncResult.cafeUpserted} | Heartbeat Upsert: \${syncResult.heartbeatUpserted}\`);"
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts logging");
