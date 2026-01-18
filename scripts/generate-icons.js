/**
 * PWA Icon Generator Script
 *
 * This script generates placeholder PNG icons for PWA from the SVG source.
 * Run with: node scripts/generate-icons.js
 *
 * For production, replace these with properly designed icons using:
 * - https://realfavicongenerator.net
 * - https://maskable.app/editor
 * - npx pwa-asset-generator
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Simple colored placeholder PNG generator
// Creates a minimal valid PNG with the app's theme color
function createPlaceholderPNG(size) {
  // PNG header and IHDR chunk for a simple colored square
  const width = size;
  const height = size;

  // Create a simple 1x1 pixel PNG and note that browsers will scale it
  // For proper icons, use a real image generation tool

  // This creates a minimal PNG structure
  // In production, use sharp, canvas, or an online generator

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(2, 9);  // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.alloc(25);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdrData.copy(ihdrChunk, 8);
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);

  // IDAT chunk - create image data
  // Theme color: #E07A5F (224, 122, 95)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Create a simple gradient/pattern
      const centerX = width / 2;
      const centerY = height / 2;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);

      if (dist < maxDist * 0.7) {
        // Inner area - theme color
        rawData.push(224, 122, 95); // #E07A5F
      } else {
        // Outer area - background color
        rawData.push(255, 251, 247); // #FFFBF7
      }
    }
  }

  const rawBuffer = Buffer.from(rawData);
  const { deflateSync } = require('zlib');
  const compressed = deflateSync(rawBuffer);

  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatChunk = Buffer.alloc(12 + compressed.length);
  idatChunk.writeUInt32BE(compressed.length, 0);
  idatChunk.write('IDAT', 4);
  compressed.copy(idatChunk, 8);
  idatChunk.writeUInt32BE(idatCrc, 8 + compressed.length);

  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, ...intToBytes(iendCrc)]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation for PNG
function crc32(data) {
  let crc = 0xffffffff;
  const table = makeCrcTable();

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

function intToBytes(num) {
  return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff];
}

// Generate icons
console.log('Generating PWA icons...');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach((size) => {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);

  try {
    const png = createPlaceholderPNG(size);
    fs.writeFileSync(filepath, png);
    console.log(`  Created: ${filename}`);
  } catch (error) {
    console.error(`  Failed: ${filename} - ${error.message}`);
  }
});

// Create maskable icon (same as 512 for now)
try {
  const maskablePng = createPlaceholderPNG(512);
  fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.png'), maskablePng);
  console.log('  Created: maskable-icon-512x512.png');
} catch (error) {
  console.error(`  Failed: maskable-icon-512x512.png - ${error.message}`);
}

console.log('\nDone! Icons generated in public/icons/');
console.log('\nFor production-quality icons, use one of these tools:');
console.log('  - https://realfavicongenerator.net');
console.log('  - https://maskable.app/editor');
console.log('  - npx pwa-asset-generator ./public/icons/icon.svg ./public/icons');
