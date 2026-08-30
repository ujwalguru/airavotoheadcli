import { getAllCafes, getLiveStatus } from './db.js';

async function test() {
  const live = await getLiveStatus();
  console.log("Live status:", JSON.stringify(live, null, 2));
}

test();
