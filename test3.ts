import { getLiveStatus } from './db.js';
async function run() {
  const data = await getLiveStatus();
  console.log(JSON.stringify(data[0], null, 2));
}
run();
