const fs = require('fs');
let code = fs.readFileSync('db.ts', 'utf8');

const target = "configurations: cafe.configurations || { devices: [{}], pricing: [{}], happyHours: [{}], happyHoursPricing: [{}] }";
const replacement = "configurations: cafe.configurations || { devices: [], pricing: [], happyHours: [], happyHoursPricing: [] }";

code = code.replace(target, replacement);
fs.writeFileSync('db.ts', code);
