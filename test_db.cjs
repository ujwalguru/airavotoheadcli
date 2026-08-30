const fetch = require('node-fetch');
async function go() {
  const res = await fetch("http://localhost:3000/api/admin/live-status");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
go();
