import { syncCafeHeartbeat } from './db.js';
async function test() {
  try {
    await syncCafeHeartbeat('test-slug', 'Test Cafe', [], {}, [], new Date().toISOString(), {
      devices: [{category: 'PC', name: 'PC1', seatName: 'PC1', count: 1, status: 'active', startTime: '09:00', endTime: '22:00', enabled: true}]
    });
    console.log("Success");
  } catch (err) {
    console.error(err);
  }
}
test();
