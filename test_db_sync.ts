import { syncCafeHeartbeat } from './db.js';

async function test() {
  try {
    const res = await syncCafeHeartbeat("test", "Test", [], {}, [], new Date().toISOString(), null);
    console.log("Success:", res);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
