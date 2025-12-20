const sharp = require('sharp');
const fs = require('fs');

async function createFavicons() {
  const inputFile = './public/logo-temp.png';
  
  try {
    // Create favicon.ico (32x32)
    await sharp(inputFile)
      .resize(32, 32)
      .toFile('./public/favicon.ico');
    
    console.log('✅ favicon.ico created (32x32)');
    
    // Create different sizes for icon.png
    await sharp(inputFile)
      .resize(512, 512)
      .toFile('./public/icon.png');
    
    console.log('✅ icon.png created (512x512)');
    
    // Create apple-icon.png
    await sharp(inputFile)
      .resize(180, 180)
      .toFile('./public/apple-icon.png');
    
    console.log('✅ apple-icon.png created (180x180)');
    
    // Cleanup temp file
    fs.unlinkSync(inputFile);
    console.log('✅ Cleaned up temp file');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFavicons();
