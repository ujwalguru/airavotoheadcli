const fs = require('fs');
let code = fs.readFileSync('db.ts', 'utf8');

const upsertFn = `
export async function syncCafeHeartbeat(
  slug: string,
  cafeName: string,
  categories: any[],
  publicMetadata: any,
  availability: any[],
  capturedAt: string
): Promise<void> {
  if (usePostgres && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      
      // Upsert Cafe
      const cafeRes = await client.query(
        \`INSERT INTO cafes (slug, cafe_name, categories, public_metadata, owner_name, email, api_key)
         VALUES ($1, $2, $3, $4, 'Auto Registered', 'auto@detected.pos', $5)
         ON CONFLICT (slug) DO UPDATE SET 
           cafe_name = EXCLUDED.cafe_name,
           categories = EXCLUDED.categories,
           public_metadata = EXCLUDED.public_metadata,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id\`,
        [slug, cafeName, JSON.stringify(categories || []), JSON.stringify(publicMetadata || {}), generateApiKey()]
      );

      // Upsert Heartbeat
      await client.query(
        \`INSERT INTO heartbeats (cafe_slug, captured_at, availability)
         VALUES ($1, $2, $3)
         ON CONFLICT (cafe_slug) DO UPDATE SET
           captured_at = EXCLUDED.captured_at,
           availability = EXCLUDED.availability,
           created_at = CURRENT_TIMESTAMP\`,
        [slug, capturedAt || new Date().toISOString(), JSON.stringify(availability || [])]
      );
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    // Local JSON fallback
    const cafes = readLocalCafes();
    let cafe = cafes.find(c => c.slug === slug);
    if (!cafe) {
      const nextId = cafes.length > 0 ? Math.max(...cafes.map((c) => c.id)) + 1 : 1;
      cafe = {
        id: nextId,
        slug,
        cafe_name: cafeName,
        categories,
        public_metadata: publicMetadata,
        owner_name: 'Auto Registered',
        email: 'auto@detected.pos',
        api_key: generateApiKey(),
        status: 'active',
        created_at: new Date().toISOString()
      };
      cafes.push(cafe);
    } else {
      cafe.cafe_name = cafeName;
      cafe.categories = categories;
      cafe.public_metadata = publicMetadata;
      cafe.updated_at = new Date().toISOString();
    }
    writeLocalCafes(cafes);
  }
}
`;

code += "\n" + upsertFn;
fs.writeFileSync('db.ts', code);
console.log("Patched db.ts with upsert fn");
