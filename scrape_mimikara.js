const fs = require('fs');
const https = require('https');

const getHtml = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

async function scrape() {
  console.log("Fetching index...");
  const baseUrl = 'https://www.vnjpclub.com/mimikara-n3-tu-vung/';
  const html = await getHtml(baseUrl);
  
  const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  const lessons = [];
  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    if (href.startsWith('/')) href = 'https://www.vnjpclub.com' + href;
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (href.includes('mimikara') && (text.toLowerCase().includes('bài') || href.toLowerCase().includes('bai') || text.includes('Unit') || text.includes('まとめ'))) {
      lessons.push(href);
    }
  }
  
  const uniqueLessons = [...new Set(lessons)];
  console.log(`Found ${uniqueLessons.length} lessons.`);
  
  const vocabularies = [];
  
  for (const url of uniqueLessons) {
    console.log(`Fetching: ${url}`);
    const pageHtml = await getHtml(url);
    
    // Split by boxtv to get robust blocks
    const blocks = pageHtml.split('class="boxtv"');
    
    for (let i = 1; i < blocks.length; i++) {
      let content = blocks[i];
      
      const getField = (className) => {
        const regex = new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)<\\/div>`, 'i');
        const m = regex.exec(content);
        if (m) return m[1].replace(/<[^>]+>/g, '').trim();
        
        const regexSpan = new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)<\\/span>`, 'i');
        const mSpan = regexSpan.exec(content);
        return mSpan ? mSpan[1].replace(/<[^>]+>/g, '').trim() : '';
      };
      
      let rawTuvung = '';
      const tuvungMatch = content.match(/class="tuvung"[^>]*>([\s\S]*?)<\/div>/i);
      if (tuvungMatch) {
          rawTuvung = tuvungMatch[1];
      }

      let kanji = '';
      let hiragana = '';
      
      // Try to parse <ruby> 
      const rubyMatch = rawTuvung.match(/<ruby>([\s\S]*?)<\/ruby>/i);
      if (rubyMatch) {
          const rubyHtml = rubyMatch[1];
          // Replace <rt> and <rp> tags properly
          kanji = rubyHtml.replace(/<rt>.*?<\/rt>/gi, '').replace(/<rp>.*?<\/rp>/gi, '').replace(/<[^>]+>/g, '').trim();
          const rtMatch = rubyHtml.match(/<rt>([\s\S]*?)<\/rt>/i);
          if (rtMatch) {
              hiragana = rtMatch[1].replace(/<[^>]+>/g, '').trim();
          }
      }
      
      // Fallback if no ruby
      if (!kanji) {
          kanji = getField('tuvung');
          kanji = kanji.replace(/^\d+\.\s*/, ''); // remove numbering
          
          const hiraMatch = rawTuvung.match(/（\s*([^）]+)\s*）/);
          if (hiraMatch) {
            hiragana = hiraMatch[1].replace(/<[^>]+>/g, '').trim();
            kanji = kanji.replace(/（.*）/, '').trim();
          }
      }

      if (kanji && !hiragana) {
        hiragana = kanji;
      }
      
      let hanviet = getField('hanviet') || getField('hanviet1');
      let nghia = getField('nghia') || getField('nghia1');
      
      // Clean up strings
      kanji = kanji.replace(/'/g, "''");
      hiragana = hiragana.replace(/'/g, "''");
      hanviet = hanviet.replace(/'/g, "''").toLowerCase();
      nghia = nghia.replace(/'/g, "''").substring(0, 999);
      
      // Don't push empty/invalid entries
      if (kanji.length > 0 && isNaN(kanji) && kanji !== '1.') {
        vocabularies.push({
          kanji, hiragana, hanviet, nghia
        });
      }
    }
  }
  
  console.log(`Extracted ${vocabularies.length} vocabulary words.`);
  
  let sql = `-- V22: Add Mimikara N3 Vocabulary with translations (FULL)\n`;
  for (const v of vocabularies) {
    if (v.kanji) {
        sql += `INSERT INTO vocabulary (kanji, hiragana, han_viet, meaning, word_type, level, category) VALUES ('${v.kanji}', '${v.hiragana}', '${v.hanviet}', '${v.nghia}', 'vocab', 'MIMIKARA_N3', 'mimikara');\n`;
    }
  }
  
  fs.writeFileSync('d:/GIT_LAB/japaneseproject/backend/src/main/resources/db/migration/V22__add_mimikara_n3_vocab.sql', sql);
  console.log("Saved SQL migration script to V22__add_mimikara_n3_vocab.sql");
}

scrape();
