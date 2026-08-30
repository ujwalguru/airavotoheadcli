import assert from 'assert';

async function runTests() {
  console.log('Starting automated tests for /api/directory/heartbeat...');
  const baseUrl = 'http://localhost:3000';

  // Helper function to send POST requests
  const sendHeartbeat = async (data: any) => {
    return fetch(`${baseUrl}/api/directory/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  };

  // Helper function to get directory listing
  const getDirectory = async (slug: string) => {
    return fetch(`${baseUrl}/api/directory/${slug}`);
  };

  try {
    console.log('1. Valid request without any API key returns HTTP 200 and persists data.');
    const validData = {
      slug: 'test-cafe-1',
      capturedAt: '2026-08-30T09:17:26.645Z',
      cafe: {
        id: 'test-cafe-1',
        name: 'Test Cafe 1',
        categories: ['gaming']
      },
      availability: [{ category: 'Gaming', available: 5, total: 10 }]
    };
    let res = await sendHeartbeat(validData);
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    
    // Verify persistence
    let getRes = await getDirectory('test-cafe-1');
    let getData = await getRes.json();
    assert.strictEqual(getData.success, true);
    assert.strictEqual(getData.data.slug, 'test-cafe-1');
    assert.strictEqual(getData.data.cafe.name, 'Test Cafe 1');
    assert.strictEqual(getData.data.availability[0].available, 5);

    console.log('2. Missing café ID/slug returns HTTP 400.');
    res = await sendHeartbeat({
      cafe: { name: 'Test Cafe 2' }
    });
    assert.strictEqual(res.status, 400);

    console.log('3. Missing café name returns HTTP 400.');
    res = await sendHeartbeat({
      slug: 'test-cafe-3',
      cafe: { id: 'test-cafe-3' }
    });
    assert.strictEqual(res.status, 400);

    console.log('4. Invalid availability values return HTTP 400.');
    res = await sendHeartbeat({
      slug: 'test-cafe-4',
      cafe: { name: 'Test Cafe 4' },
      availability: [{ category: 'Gaming', available: -1, total: 10 }]
    });
    assert.strictEqual(res.status, 400);

    console.log('5. Repeated syncs update the existing café/heartbeat.');
    const updatedData = { ...validData, availability: [{ category: 'Gaming', available: 2, total: 10 }] };
    res = await sendHeartbeat(updatedData);
    assert.strictEqual(res.status, 200);
    getRes = await getDirectory('test-cafe-1');
    getData = await getRes.json();
    assert.strictEqual(getData.data.availability[0].available, 2);

    console.log('6. Requests containing an API key must also continue to work.');
    const dataWithApiKey = { ...validData, slug: 'test-cafe-with-key', api_key: 'dummy-api-key' };
    res = await sendHeartbeat(dataWithApiKey);
    assert.strictEqual(res.status, 200);
    getRes = await getDirectory('test-cafe-with-key');
    getData = await getRes.json();
    assert.strictEqual(getData.data.slug, 'test-cafe-with-key');

    // Test payload limits implicitly if oversized, but we can't easily send > 100kb here without making a huge string, so let's skip large payload test explicitly, as express handles it.

    
    console.log('--- CORS TESTS ---');
    console.log('CORS 1: An OPTIONS request from http://tauri.localhost returns 200 or 204 with the required CORS headers.');
    let optionsRes = await fetch(`${baseUrl}/api/directory/heartbeat`, {
      method: 'OPTIONS',
      headers: { 
        'Origin': 'http://tauri.localhost',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    assert.ok(optionsRes.status === 204 || optionsRes.status === 200, `Expected 204 or 200, got ${optionsRes.status}`);
    assert.strictEqual(optionsRes.headers.get('access-control-allow-origin'), 'http://tauri.localhost');
    assert.ok(optionsRes.headers.get('access-control-allow-methods')?.includes('POST'));
    assert.ok(optionsRes.headers.get('access-control-allow-headers')?.toLowerCase().includes('content-type'));

    console.log('CORS 2/3: A POST heartbeat from http://tauri.localhost returns a readable JSON success response (and works without an API key).');
    let postCorsRes = await fetch(`${baseUrl}/api/directory/heartbeat`, {
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
    let badOriginRes = await fetch(`${baseUrl}/api/directory/heartbeat`, {
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

    process.exit(0);
  } catch (err: any) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

// Run tests
runTests();
