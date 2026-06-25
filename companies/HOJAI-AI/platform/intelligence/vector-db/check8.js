// Split the full test file in half and try each half
const fs = require('fs');
const src = fs.readFileSync('test-minimal.js', 'utf8');
const lines = src.split('\n');
const mid = Math.floor(lines.length / 2);

const part1 = lines.slice(0, mid).join('\n');
const part2 = lines.slice(mid).join('\n');

fs.writeFileSync('part1.js', part1 + '\n');
fs.writeFileSync('part2.js', part2 + '\n');
console.log('Part1: lines 1-' + mid);
console.log('Part2: lines ' + (mid+1) + '-' + lines.length);
