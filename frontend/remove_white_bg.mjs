import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'public', 'assets');
const files = [
  'mascot_siro_detective.png',
  'mascot_siro_sensei.png',
  'mascot_siro_reading.png',
  'mascot_siro_ninja.png'
];

async function processImage(file) {
  const filePath = path.join(dir, file);
  try {
    const image = await Jimp.read(filePath);
    
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    const visited = new Uint8Array(w * h);
    const queue = [];
    
    // Start from all edges
    for (let x = 0; x < w; x++) {
      queue.push([x, 0]);
      queue.push([x, h - 1]);
    }
    for (let y = 0; y < h; y++) {
      queue.push([0, y]);
      queue.push([w - 1, y]);
    }
    
    let head = 0;
    while(head < queue.length) {
      const [x, y] = queue[head++];
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      
      const pos = y * w + x;
      if (visited[pos]) continue;
      visited[pos] = 1;
      
      const idx = (y * w + x) * 4;
      const red = image.bitmap.data[idx];
      const green = image.bitmap.data[idx + 1];
      const blue = image.bitmap.data[idx + 2];
      
      if (red > 235 && green > 235 && blue > 235) {
        image.bitmap.data[idx + 3] = 0; // make transparent
        queue.push([x - 1, y]);
        queue.push([x + 1, y]);
        queue.push([x, y - 1]);
        queue.push([x, y + 1]);
      }
    }
    
    const outPath = path.join(dir, file.replace('.png', '_nobg.png'));
    await image.write(outPath);
    console.log(`Processed ${file} -> ${outPath}`);
  } catch(e) {
    console.error(`Error with ${file}`, e);
  }
}

files.forEach(processImage);

processImage('mascot_siro_studying.png');
