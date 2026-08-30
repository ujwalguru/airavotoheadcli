const fs = require('fs');
let code = fs.readFileSync('src/components/CafeLiveDashboard.tsx', 'utf8');

const regex1 = /= \$\{p\.price\{"}"\}/g;
code = code.replace(regex1, "= \\${p.price}");

const regex2 = /= \$\{hp\.price\{"}"\}/g;
code = code.replace(regex2, "= \\${hp.price}");

fs.writeFileSync('src/components/CafeLiveDashboard.tsx', code);
console.log("Patched CafeLiveDashboard.tsx syntax");
