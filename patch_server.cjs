const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
// ==========================================
// 4. PUBLIC DIRECTORY ENDPOINTS (Heartbeat & Player-Facing)
// ==========================================

interface DirectoryListing {
  slug: string;
  data: any;
  lastUpdate: number;
}
const directoryData: Record<string, DirectoryListing> = {};

function formatListing(listing: DirectoryListing) {
  const isStale = (Date.now() - listing.lastUpdate) > 3 * 60 * 1000; // 3 minutes threshold
  const formattedData = { ...listing.data };
  
  // Rule: a café which stopped reporting shows "unknown" instead of old numbers
  if (isStale) {
    for (const key of Object.keys(formattedData)) {
      if (typeof formattedData[key] === 'number' || String(formattedData[key]).match(/^[0-9]+$/)) {
        formattedData[key] = 'unknown';
      }
    }
    formattedData.status = 'offline';
  } else {
    formattedData.status = 'online';
  }
  
  return {
    slug: listing.slug,
    last_updated: listing.lastUpdate,
    is_stale: isStale,
    ...formattedData
  };
}

/**
 * POST /api/directory/heartbeat
 * Receives seat counts from the desktop app (POS)
 */
app.post('/api/directory/heartbeat', express.json(), async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = (req.body?.api_key || req.headers['x-api-key'] || req.headers.authorization?.replace(/^Bearer\\s+/i, '')) as string;
    
    if (!apiKey) {
      res.status(401).json({ success: false, message: 'Missing API key' });
      return;
    }
    
    const cafe = await findCafeByApiKey(apiKey.trim());
    if (!cafe) {
      res.status(401).json({ success: false, message: 'Invalid API key' });
      return;
    }
    if (cafe.status === 'suspended') {
      res.status(403).json({ success: false, message: 'Cafe is suspended' });
      return;
    }

    // The user mentioned "listing name: a short slug like airavoto-koramangala"
    const slug = req.body?.listing_name || req.body?.slug || cafe.cafe_name.toLowerCase().replace(/\\s+/g, '-');
    
    // Clean up the payload slightly if needed (hide api_key from public)
    const payload = { ...req.body };
    delete payload.api_key;
    
    directoryData[slug] = {
      slug,
      data: payload,
      lastUpdate: Date.now()
    };

    res.json({ success: true, message: 'Heartbeat received' });
  } catch (err) {
    console.error('Error processing heartbeat:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/directory
 * Public address for player-facing site (All listings)
 */
app.get('/api/directory', (req: Request, res: Response): void => {
  const result = Object.values(directoryData).map(listing => formatListing(listing));
  res.json({ success: true, data: result });
});

/**
 * GET /api/directory/:slug
 * Public address for player-facing site (Single listing)
 */
app.get('/api/directory/:slug', (req: Request, res: Response): void => {
  const listing = directoryData[req.params.slug];
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' });
    return;
  }
  res.json({ success: true, data: formatListing(listing) });
});

// ==========================================
// 5. FRONTEND SERVING & DEV VITE MIDDLEWARE
// ==========================================
`;

const target = `// ==========================================
// 4. FRONTEND SERVING & DEV VITE MIDDLEWARE
// ==========================================`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patch applied successfully");
} else {
  console.log("Could not find anchor string in server.ts");
}
