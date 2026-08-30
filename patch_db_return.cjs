const fs = require('fs');
let code = fs.readFileSync('db.ts', 'utf8');

code = code.replace(
  "Promise<void> {",
  "Promise<{cafeUpserted: boolean, heartbeatUpserted: boolean}> {"
);

code = code.replace(
  "await client.query('COMMIT');",
  "await client.query('COMMIT');\n      return { cafeUpserted: true, heartbeatUpserted: true };"
);

code = code.replace(
  "writeLocalCafes(cafes);",
  "writeLocalCafes(cafes);\n    return { cafeUpserted: true, heartbeatUpserted: true };"
);

fs.writeFileSync('db.ts', code);
console.log("Patched db.ts return value");
