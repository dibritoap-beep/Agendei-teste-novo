import sharp from 'sharp';
import fs from 'fs';

async function generateIcons() {
  const svgBuffer = fs.readFileSync('public/logo.svg');

  // 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('icon-192.png created');

  // 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('icon-512.png created');

  // 180x180 Apple Touch Icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/icon-180.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('icon-180.png & apple-touch-icon.png created');

  // Favicon (64x64 PNG & ICO)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile('public/favicon.png');

  await sharp(svgBuffer)
    .resize(32, 32)
    .toFile('public/favicon.ico');
  console.log('favicon created');

  // Maskable 512x512 PNG with safe margin padding
  const maskableSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#0B1320" />
    <g transform="translate(51, 51) scale(0.8)">
      <circle cx="256" cy="256" r="232" fill="#0F1D32" stroke="#FACC15" stroke-width="14"/>
      <g stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="180" y="140" width="160" height="210" rx="22" />
        <path d="M150 180 H190" />
        <path d="M150 220 H190" />
        <path d="M150 260 H190" />
        <path d="M150 300 H190" />
        <path d="M255 245 L305 185 C312 178 323 178 330 185 C337 192 337 203 330 210 L270 270 L240 280 Z" />
      </g>
      <circle cx="405" cy="405" r="76" fill="#FACC15" stroke="#0B1320" stroke-width="12" />
      <g fill="#0B1320">
        <path d="M405 355 C405 380, 380 405, 355 405 C380 405, 405 430, 405 455 C405 430, 430 405, 455 405 C430 405, 405 380, 405 355 Z" />
        <circle cx="372" cy="432" r="6" />
      </g>
    </g>
  </svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile('public/icon-512-maskable.png');
  console.log('icon-512-maskable.png created');
}

generateIcons().catch(console.error);
