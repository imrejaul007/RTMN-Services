const fs = require('fs');
const src = fs.readFileSync('__tests__/unit/vector-db.test.js', 'utf8');
const lines = src.split('\n');

// Compare line 373 and 382
[373, 382].forEach(n => {
  const line = lines[n - 1];
  console.log('\nLine ' + n + ' (' + line.length + ' chars):');
  console.log(line);
  // Find all backtick positions
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '`') {
      const start = Math.max(0, i - 5);
      const end = Math.min(line.length, i + 5);
      const ctx = line.substring(start, end);
      console.log('  Backtick at ' + i + ': ...' + ctx.replace(/`/g, '`') + '...');
    }
  }
  // Check for unusual chars
  for (let i = 0; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if (c > 127 || (c < 32 && c !== 10 && c !== 9)) {
      console.log('  UNUSUAL char at ' + i + ': code=' + c + ' char=' + JSON.stringify(line[i]));
    }
  }
});

// Also check the last few lines of the file
console.log('\n--- Last 5 lines ---');
for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
  console.log(i + 1 + ': ' + JSON.stringify(lines[i]));
}
