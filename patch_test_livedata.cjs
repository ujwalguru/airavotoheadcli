const fs = require('fs');
let code = fs.readFileSync('test.ts', 'utf8');

code = code.replace(
  "let liveData = await liveStatusRes.json();",
  "let liveData = await liveStatusRes.json();\n    if (!Array.isArray(liveData)) console.log('liveData:', liveData);"
);

fs.writeFileSync('test.ts', code);
