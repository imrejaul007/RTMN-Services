const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('test-minimal.js', 'utf8');
console.log('File length:', src.length);
console.log('Line 382:');
const lines = src.split('\n');
console.log(lines[381]);
// Try to compile just the first 390 chars of line 382
const snippet = lines[381].substring(0, 70);
console.log('\nTrying to eval snippet:');
try {
  new Function(snippet);
  console.log('OK');
} catch (e) {
  console.log('ERROR:', e.message);
}
// Check byte at position ~47 in the file
const bytePos = src.split('\n').slice(0, 381).join('\n').length + 1 + 47;
console.log('\nFile byte at ~' + bytePos + ':', src.charCodeAt(bytePos - 1), JSON.stringify(src[bytePos - 1]));
// Check bytes around that position
for (let i = Math.max(0, bytePos - 10); i < Math.min(src.length, bytePos + 10); i++) {
  console.log('  byte ' + i + ': ' + src.charCodeAt(i).toString(16) + ' (' + JSON.stringify(src[i]) + ')');
}
