// Pure Node.js PNG generator with zlib
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, colorHex, accentHex) {
  // Parse hex colors
  const r1 = parseInt(colorHex.slice(1, 3), 16);
  const g1 = parseInt(colorHex.slice(3, 5), 16);
  const b1 = parseInt(colorHex.slice(5, 7), 16);
  
  const r2 = parseInt(accentHex.slice(1, 3), 16);
  const g2 = parseInt(accentHex.slice(3, 5), 16);
  const b2 = parseInt(accentHex.slice(5, 7), 16);

  const width = size;
  const height = size;
  
  // Raw pixel data: each row starts with filter byte 0
  const rowBytes = 1 + width * 4;
  const buffer = Buffer.alloc(height * rowBytes);

  const radius = size * 0.44;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    buffer[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Rounded gradient circle
        const t = (x + y) / (width + height);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        
        // Inner radar / pin target dot
        const innerDist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (innerDist <= radius * 0.35) {
          buffer[pxOffset] = 255;
          buffer[pxOffset + 1] = 255;
          buffer[pxOffset + 2] = 255;
          buffer[pxOffset + 3] = 255;
        } else {
          buffer[pxOffset] = r;
          buffer[pxOffset + 1] = g;
          buffer[pxOffset + 2] = b;
          buffer[pxOffset + 3] = 255;
        }
      } else {
        // Transparent
        buffer[pxOffset] = 0;
        buffer[pxOffset + 1] = 0;
        buffer[pxOffset + 2] = 0;
        buffer[pxOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(buffer);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

[16, 48, 128].forEach(size => {
  const pngData = createPNG(size, '#6366f1', '#06b6d4');
  const targetPath = path.join(__dirname, '..', 'icons', `icon${size}.png`);
  fs.writeFileSync(targetPath, pngData);
  console.log(`Generated ${targetPath} (${pngData.length} bytes)`);
});

