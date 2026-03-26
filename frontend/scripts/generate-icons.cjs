const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '..', 'public', 'FreshMorLogo.png');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const screenshotsDir = path.join(__dirname, '..', 'public', 'screenshots');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

async function generateIcons() {
  const input = await sharp(inputPath).toBuffer();
  
  // Generate icons with exact sizes
  await sharp(input).resize(192, 192).png().toFile(path.join(iconsDir, 'freshmor-icon-192x192.png'));
  console.log('Created 192x192 icon');
  
  await sharp(input).resize(512, 512).png().toFile(path.join(iconsDir, 'freshmor-icon-512x512.png'));
  console.log('Created 512x512 icon');
  
  await sharp(input).resize(32, 32).png().toFile(path.join(iconsDir, 'freshmor-icon-32x32.png'));
  console.log('Created 32x32 icon');
  
  // Generate screenshots
  await sharp(input).resize(1280, 800).png().toFile(path.join(screenshotsDir, 'desktop-view.png'));
  console.log('Created desktop screenshot');
  
  await sharp(input).resize(390, 844).png().toFile(path.join(screenshotsDir, 'mobile-view.png'));
  console.log('Created mobile screenshot');
  
  console.log('All icons and screenshots generated!');
}

generateIcons().catch(console.error);