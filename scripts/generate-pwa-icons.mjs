import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoPath = path.join(root, 'public/logo.svg');

async function main() {
  const logo = await readFile(logoPath);

  await sharp(logo).resize(192, 192).png().toFile(path.join(root, 'public/pwa-192.png'));
  await sharp(logo).resize(512, 512).png().toFile(path.join(root, 'public/pwa-512.png'));
  await sharp(logo).resize(180, 180).png().toFile(path.join(root, 'public/apple-touch-icon.png'));

  const logoPng = await sharp(logo).resize(280, 280).png().toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r: 33, g: 33, b: 33 },
    },
  })
    .composite([{ input: logoPng, left: 460, top: 175 }])
    .png()
    .toFile(path.join(root, 'public/og-image.png'));

  console.log('Wrote public/pwa-192.png, pwa-512.png, apple-touch-icon.png, og-image.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
