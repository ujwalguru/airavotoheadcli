const fs = require('fs');
let code = fs.readFileSync('db.ts', 'utf8');

code = code.replace(
  "created_at: string;",
  "created_at: string;\n  slug?: string;\n  categories?: any[];\n  public_metadata?: any;\n  updated_at?: string;"
);

fs.writeFileSync('db.ts', code);
console.log("Patched Cafe interface");
