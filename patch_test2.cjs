const fs = require('fs');
let code = fs.readFileSync('test.ts', 'utf8');

const regex = /--- INTEGRATION TEST: public\.cafes & public\.heartbeats ---[\s\S]*?console\.log\('All tests passed successfully! 🎉'\);/;
const replacement = `--- INTEGRATION TEST: public.cafes & public.heartbeats ---');
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
      ],
      configurations: {
        devices: [
          { category: "PC", name: "PC Area", seatName: "PC-01", count: 1, status: "Active", startTime: "09:00", endTime: "22:00", enabled: true }
        ],
        pricing: [
          { category: "PC", duration: 60, price: 10, personCount: 1 }
        ],
        happyHours: [
          { category: "PC", startTime: "10:00", endTime: "14:00", enabled: true }
        ],
        happyHoursPricing: [
          { category: "PC", duration: 60, price: 5, personCount: 1 }
        ]
      }
    };
    
    // First Upsert
    let ggRes = await fetch(\`\${baseUrl}/api/directory/heartbeat\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ggData)
    });
    assert.strictEqual(ggRes.status, 200, await ggRes.text());
    
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
    if (!liveData.success) {
      console.log('liveData:', liveData);
    }
    
    let dbCafe = liveData.liveStatus.find((c: any) => c.cafe_name === 'GG Cafe Test');
    assert.ok(dbCafe, 'Cafe GG Cafe Test should exist in db output');
    
    // Check config data
    assert.strictEqual(dbCafe.configurations.devices.length, 1);
    assert.strictEqual(dbCafe.configurations.pricing.length, 1);
    assert.strictEqual(dbCafe.configurations.happyHours.length, 1);
    assert.strictEqual(dbCafe.configurations.happyHoursPricing.length, 1);
    
    // Second Upsert to ensure no duplicates
    let prevLength = liveData.liveStatus.length;
    await fetch(\`\${baseUrl}/api/directory/heartbeat\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ggData)
    });
    
    let liveStatusRes2 = await fetch(\`\${baseUrl}/api/admin/live-status\`, {
      headers: { 'Cookie': cookie || '' }
    });
    let liveData2 = await liveStatusRes2.json();
    assert.strictEqual(liveData2.liveStatus.length, prevLength, "No duplicate cafe rows should be created");

    let dbCafe2 = liveData2.liveStatus.find((c: any) => c.cafe_name === 'GG Cafe Test');
    assert.strictEqual(dbCafe2.configurations.devices.length, 1, "Duplicate device config created");
    assert.strictEqual(dbCafe2.configurations.pricing.length, 1, "Duplicate pricing config created");
    assert.strictEqual(dbCafe2.configurations.happyHours.length, 1, "Duplicate happy hours config created");
    assert.strictEqual(dbCafe2.configurations.happyHoursPricing.length, 1, "Duplicate happy hours pricing config created");

    console.log('All tests passed successfully! 🎉');`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('test.ts', code);
  console.log("Patched integration test for configs");
} else {
  console.log("Regex not matched.");
}
