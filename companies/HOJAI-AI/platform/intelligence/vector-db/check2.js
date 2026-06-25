const fs = require('fs');
const src = fs.readFileSync('__tests__/unit/vector-db.test.js');
const lines = src.toString('utf8').split('\n');
const line = lines[381];
// Show raw bytes around the backtick at position ~47
const start = Math.max(0, 47 - 5);
const end = Math.min(line.length, 47 + 5);
console.log('Bytes around backtick:');
const slice = line.slice(start, end);
for (let i = 0; i < slice.length; i++) {
  const b = slice.charCodeAt(i);
  const pos = start + i;
  const marker = pos === 47 ? ' <-- HERE' : '';
  console.log('  ' + pos + ': ' + b.toString(16) + ' (' + String.fromCharCode(b) + ')' + marker);
}
