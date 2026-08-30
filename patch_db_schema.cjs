const fs = require('fs');
let code = fs.readFileSync('db.ts', 'utf8');

const newTables = `
      // Add new columns to cafes if they don't exist
      await client.query(\`
        ALTER TABLE cafes 
        ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS public_metadata JSONB,
        ADD COLUMN IF NOT EXISTS categories JSONB,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      \`);

      await client.query(\`
        CREATE TABLE IF NOT EXISTS heartbeats (
          id SERIAL PRIMARY KEY,
          cafe_slug VARCHAR(255),
          captured_at TIMESTAMPTZ,
          availability JSONB,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(cafe_slug)
        );
      \`);
`;

code = code.replace("client.release();", newTables + "\n      client.release();");
fs.writeFileSync('db.ts', code);
console.log("Patched db.ts");
