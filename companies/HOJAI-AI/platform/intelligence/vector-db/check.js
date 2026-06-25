const fs = require('fs');
const src = fs.readFileSync('__tests__/unit/vector-db.test.js', 'utf8');
const lines = src.split('\n');

// Check for non-ASCII chars in line 382
const line = lines[381];
console.log('Line 382 (' + line.length + ' chars):');
console.log(JSON.stringify(line));
console.log();
for (let i = 0; i < line.length; i++) {
  const c = line.charCodeAt(i);
  if (c > 127 || c < 32) {
    console.log('char at ' + i + ': code=' + c + ' char=' + JSON.stringify(line[i]));
  }
}

// Also check the full file for suspicious chars
const suspicious = [];
for (let i = 0; i < src.length; i++) {
  const c = src.charCodeAt(i);
  if (c === 0x2018 || c === 0x2019 || c === 0x201C || c === 0x201D || c === 0x60) {
    // Smart quotes or backtick - find line number
    const lineNum = src.substring(0, i).split('\n').length;
    suspicious.push({ pos: i, code: c, char: JSON.stringify(src[i]), line: lineNum });
  }
}
console.log('\nSuspicious chars (smart quotes / backticks):');
for (const s of suspicious) {
  console.log('  pos=' + s.pos + ' line=' + s.line + ' code=' + s.code + ' char=' + s.char);
}
