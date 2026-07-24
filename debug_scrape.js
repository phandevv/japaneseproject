const https = require('https');

const getHtml = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

async function debug() {
  const url = 'https://www.vnjpclub.com/mimikara-n3-tu-vung/unit-1-bai-1.html';
  const pageHtml = await getHtml(url);
  const boxtvRegex = /<div class="boxtv"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match = boxtvRegex.exec(pageHtml);
  if (match) {
    console.log("HTML of first item:");
    console.log(match[1]);
  } else {
    console.log("No boxtv found");
  }
}
debug();
