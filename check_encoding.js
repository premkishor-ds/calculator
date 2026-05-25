const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/(site)/watchlist/page.tsx');
const content = fs.readFileSync(file);
const text = content.toString('utf8');

const idx = text.indexOf('Institutional Screener\'');
if (idx > -1) {
  const snippet = text.substring(idx - 15, idx + 20);
  console.log("UTF-8 Decoded Snippet:");
  console.log(snippet);
  console.log("Hex codes of snippet:");
  for (let i = 0; i < snippet.length; i++) {
    console.log(snippet[i] + ' : ' + snippet.charCodeAt(i).toString(16));
  }
} else {
  console.log('Not found');
}
