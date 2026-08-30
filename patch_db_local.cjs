const fs = require('fs');
let code = fs.readFileSync('db.ts', 'utf8');

const regex1 = /cafe\.updated_at = new Date\(\)\.toISOString\(\);\n    \}/;
const replacement1 = `cafe.updated_at = new Date().toISOString();\n    }\n    cafe.configurations = configurations;`;

code = code.replace(regex1, replacement1);

const regex2 = /recent_entries: \[\]\n    \};/;
const replacement2 = `recent_entries: [],\n      configurations: cafe.configurations || { devices: [{}], pricing: [{}], happyHours: [{}], happyHoursPricing: [{}] }\n    };`;

code = code.replace(regex2, replacement2);

fs.writeFileSync('db.ts', code);
console.log("Patched local JSON fallback in db.ts");
