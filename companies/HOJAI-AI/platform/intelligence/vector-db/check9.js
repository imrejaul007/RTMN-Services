// Further split part1
const fs = require('fs');
const src = fs.readFileSync('test-minimal.js', 'utf8');
const lines = src.split('\n');
const mid1 = Math.floor(lines.length / 2); // 271
const mid2 = Math.floor(mid1 / 2); // ~135

fs.writeFileSync('p1a.js', lines.slice(0, mid2).join('\n') + '\n');
fs.writeFileSync('p1b.js', lines.slice(mid2, mid1).join('\n') + '\n');
console.log('p1a: lines 1-' + mid2);
console.log('p1b: lines ' + (mid2+1) + '-' + mid1);
