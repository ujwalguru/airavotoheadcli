const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `    directoryData[slug] = {
      slug,
      data: cleanPayload,
      lastUpdate: Date.now()
    };

    res.status(200).json({ success: true, message: 'Heartbeat received' });`;

const replacement = `    const normalizedSlug = slug.toLowerCase().replace(/\\s+/g, '-');
    const capturedAt = payload.capturedAt || new Date().toISOString();
    const categories = payload.cafe?.categories || [];
    
    const publicMetadata = payload.cafe ? { ...payload.cafe } : {};
    delete publicMetadata.name;
    delete publicMetadata.categories;

    // Persist to DB
    await syncCafeHeartbeat(normalizedSlug, cafeName, categories, publicMetadata, payload.availability || [], capturedAt);

    // Also update in-memory directory
    directoryData[normalizedSlug] = {
      slug: normalizedSlug,
      data: cleanPayload,
      lastUpdate: Date.now()
    };

    console.log(\`Heartbeat processed for cafe: \${normalizedSlug}\`);

    res.status(200).json({ 
      success: true, 
      message: 'Heartbeat received',
      cafe_id: normalizedSlug
    });`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts with DB write");
} else {
  console.log("Could not find target string in server.ts");
}
