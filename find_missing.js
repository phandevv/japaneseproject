const https = require('https');

const getHtml = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

async function findMissing() {
  const baseUrl = 'https://www.vnjpclub.com/mimikara-n3-tu-vung/';
  const html = await getHtml(baseUrl);
  
  const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    let text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text.includes('Unit 06') || text.includes('Unit 11') || href.includes('unit-6') || href.includes('unit-11')) {
      console.log(`Found: ${text} -> ${href}`);
    }
  }
  console.log("Done checking for Unit 6 and 11");
}
findMissing();
