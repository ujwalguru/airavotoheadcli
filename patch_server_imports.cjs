const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "findCafeByIdAndApiKey, findCafeByApiKey,",
  "findCafeByIdAndApiKey, findCafeByApiKey, syncCafeHeartbeat,"
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts imports");
