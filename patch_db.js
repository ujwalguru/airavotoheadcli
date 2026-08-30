const fs = require('fs');
let code = fs.readFileSync('db.ts', 'utf8');
code += `
export async function findCafeByApiKey(apiKey: string): Promise<Cafe | null> {
  if (usePostgres && pgPool) {
    const res = await pgPool.query('SELECT * FROM cafes WHERE api_key = $1', [apiKey]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }
  const cafes = readLocalCafes();
  return cafes.find((c) => c.api_key === apiKey) || null;
}
`;
fs.writeFileSync('db.ts', code);
