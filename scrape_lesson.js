async function scrapeLesson() {
  const url = 'https://www.vnjpclub.com/mimikara-n3-tu-vung/unit-1-bai-3.html';
  try {
    const res = await fetch(url);
    const html = await res.text();
    
    // Find all <div class="boxtv">
    const boxtvRegex = /<div class="boxtv"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let match;
    let i = 0;
    while ((match = boxtvRegex.exec(html)) !== null && i < 5) {
      let content = match[1];
      
      const getSpan = (htmlContent, className) => {
        const regex = new RegExp(`<span class="${className}"[^>]*>([\\s\\S]*?)<\\/span>`, 'i');
        const m = regex.exec(htmlContent);
        return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
      };
      
      // Some classes might be inside strong or a tags, let's just strip HTML globally
      const rawText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      console.log(`Word ${i+1}:`);
      console.log(`Raw text: ${rawText}`);
      i++;
    }
  } catch (e) {
    console.error(e);
  }
}

scrapeLesson();
