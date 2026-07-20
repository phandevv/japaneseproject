const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

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
    
    // We want to make white and near-white pixels transparent.
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      if (red > 245 && green > 245 && blue > 245) {
        this.bitmap.data[idx + 3] = 0; 
      }
    });
    
    const outPath = path.join(dir, file.replace('.png', '_nobg.png'));
    await image.writeAsync(outPath);
    console.log(`Processed ${file} -> ${outPath}`);
  } catch(e) {
    console.error(`Error with ${file}`, e);
  }
}

files.forEach(processImage);
