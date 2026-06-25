const fs = require('fs');
const src = fs.readFileSync('__tests__/unit/vector-db.test.js');
const lines = src.toString('utf8').split('\n');
const line382 = lines[381];
console.log('Line 382 content:');
console.log(line382);
console.log('\nAll char codes:');
for (let i = 0; i < line382.length; i++) {
  const c = line382.charCodeAt(i);
  const ch = line382[i];
  if (c > 127 || c < 32) {
    console.log('  ' + i + ': ' + c + ' (non-ascii)');
  }
}
// Find backtick position
for (let i = 0; i < line382.length; i++) {
  if (line382[i] === '`') {
    console.log('\nBacktick at position ' + i);
    console.log('Context:', JSON.stringify(line382.substring(Math.max(0, i-10), i+15)));
  }
}
