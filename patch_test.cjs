const fs = require('fs');
let code = fs.readFileSync('test.ts', 'utf8');

const corsTests = `
    console.log('--- CORS TESTS ---');
    console.log('CORS 1: An OPTIONS request from http://tauri.localhost returns 200 or 204 with the required CORS headers.');
    let optionsRes = await fetch(\`\${baseUrl}/api/directory/heartbeat\`, {
      method: 'OPTIONS',
      headers: { 
        'Origin': 'http://tauri.localhost',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    assert.ok(optionsRes.status === 204 || optionsRes.status === 200, \`Expected 204 or 200, got \${optionsRes.status}\`);
    assert.strictEqual(optionsRes.headers.get('access-control-allow-origin'), 'http://tauri.localhost');
    assert.ok(optionsRes.headers.get('access-control-allow-methods')?.includes('POST'));
    assert.ok(optionsRes.headers.get('access-control-allow-headers')?.toLowerCase().includes('content-type'));

    console.log('CORS 2/3: A POST heartbeat from http://tauri.localhost returns a readable JSON success response (and works without an API key).');
    let postCorsRes = await fetch(\`\${baseUrl}/api/directory/heartbeat\`, {
      method: 'POST',
      headers: {
        'Origin': 'http://tauri.localhost',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validData)
    });
    assert.strictEqual(postCorsRes.status, 200);
    assert.strictEqual(postCorsRes.headers.get('access-control-allow-origin'), 'http://tauri.localhost');
    let postCorsData = await postCorsRes.json();
    assert.strictEqual(postCorsData.success, true);
    
    console.log('CORS 4: An unapproved origin is not granted access.');
    let badOriginRes = await fetch(\`\${baseUrl}/api/directory/heartbeat\`, {
      method: 'OPTIONS',
      headers: { 
        'Origin': 'http://evil.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert.notStrictEqual(badOriginRes.headers.get('access-control-allow-origin'), 'http://evil.com');

    console.log('CORS 5: The existing café and availability data is still saved.');
    let getCorsRes = await getDirectory('test-cafe-1');
    let getCorsData = await getCorsRes.json();
    assert.strictEqual(getCorsData.data.cafe.name, 'Test Cafe 1');

    console.log('All tests passed successfully! 🎉');
`;

code = code.replace("console.log('All tests passed successfully! 🎉');", corsTests);
fs.writeFileSync('test.ts', code);
console.log("Patched test.ts with CORS tests.");
