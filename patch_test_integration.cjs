const fs = require('fs');
let code = fs.readFileSync('test.ts', 'utf8');

const newTest = `
    console.log('--- INTEGRATION TEST: public.cafes & public.heartbeats ---');
    const ggData = {
      slug: "ggcafe-test",
      capturedAt: "2026-08-30T09:50:00.000Z",
      cafe: {
        id: "ggcafe-test",
        name: "GG Cafe Test",
        categories: ["gaming", "cafe"],
        city: "Test City",
        state: "Test State",
        hours: "09:00-22:00",
        startingPrice: "100"
      },
      availability: [
        { category: "PC", available: 31, total: 31 },
        { category: "PS5", available: 21, total: 21 }
      ]
    };
    
    // First Upsert
    let ggRes = await fetch(\`\${baseUrl}/api/directory/heartbeat\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ggData)
    });
    assert.strictEqual(ggRes.status, 200);
    
    // Check through getLiveStatus API
    // Actually we can just hit /api/directory/ggcafe-test
    // But to truly verify db we should import it or hit /api/admin/live-status (which needs auth)
    
    let adminAuth = await fetch(\`\${baseUrl}/api/admin/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({username: 'admin', password: 'admin123'})
    });
    const cookie = adminAuth.headers.get('set-cookie');
    
    let liveStatusRes = await fetch(\`\${baseUrl}/api/admin/live-status\`, {
      headers: { 'Cookie': cookie || '' }
    });
    let liveData = await liveStatusRes.json();
    
    let dbCafe = liveData.find((c: any) => c.cafe_name === 'GG Cafe Test');
    assert.ok(dbCafe, 'Cafe GG Cafe Test should exist in db output');
    // We expect devices to be mapped if Postgres, but locally we use mock mock devices.
    // However, we can test that the name was persisted.
    
    // Second Upsert to ensure no duplicates
    let prevLength = liveData.length;
    await fetch(\`\${baseUrl}/api/directory/heartbeat\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ggData)
    });
    
    let liveStatusRes2 = await fetch(\`\${baseUrl}/api/admin/live-status\`, {
      headers: { 'Cookie': cookie || '' }
    });
    let liveData2 = await liveStatusRes2.json();
    assert.strictEqual(liveData2.length, prevLength, "No duplicate cafe rows should be created");

    console.log('All tests passed successfully! 🎉');
`;

code = code.replace("console.log('All tests passed successfully! 🎉');", newTest);
fs.writeFileSync('test.ts', code);
console.log("Patched test.ts with integration test");
