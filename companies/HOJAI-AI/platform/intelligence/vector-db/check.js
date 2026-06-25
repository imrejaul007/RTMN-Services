const fs = require('fs');
const l = fs.readFileSync('__tests__/unit/vector-db.test.js', 'utf8').split('\n')[381];
console.log('len=' + l.length);
console.log('first80=' + JSON.stringify(l.substring(0, 80)));
for (let i = 0; i < l.length; i++) {
  const c = l.charCodeAt(i);
  if (c > 127 || c < 32) {
    console.log('non-ascii at ' + i + ': ' + c + ' (' + JSON.stringify(l[i]) + ')');
  }
}
