const fs = require('fs');

async function scrape() {
  const url = 'https://www.vnjpclub.com/mimikara-n3-tu-vung/';
  try {
    const res = await fetch(url);
    const html = await res.text();
    
    // Find all hrefs containing 'mimikara' and 'bai'
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const lessons = [];
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (href.includes('mimikara') && (text.toLowerCase().includes('bài') || href.toLowerCase().includes('bai'))) {
        lessons.push({text, href});
      }
    }
    
    const uniqueLessons = [];
    const seenHrefs = new Set();
    for (const l of lessons) {
      if (!seenHrefs.has(l.href)) {
        seenHrefs.add(l.href);
        uniqueLessons.push(l);
      }
    }
    
    console.log("Found lessons:");
    console.log(uniqueLessons);
    
  } catch (e) {
    console.error(e);
  }
}

scrape();
