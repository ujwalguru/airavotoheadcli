const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "findCafeByIdAndApiKey, findCafeByApiKey, syncCafeHeartbeat,",
  "findCafeByIdAndApiKey, findCafeByApiKey, syncCafeHeartbeat, getLiveStatus,"
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts imports with getLiveStatus");
