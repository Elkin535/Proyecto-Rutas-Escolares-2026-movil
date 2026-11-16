const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const userUploadedPath = 'C:/Users/KAROL CAICEDO/.gemini/antigravity/brain/c2e34348-455f-483e-b0ab-89640a87b3d7/.user_uploaded/media_1794799589813_ac1da290.jpg';
const assetsDir = path.resolve(__dirname, '../assets/images');

async function processIcons() {
  console.log('Loading new source image...');
  const img = await Jimp.read(userUploadedPath);
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const cx = w / 2;
  const cy = h / 2;

  // Make corners transparent with an anti-aliased circle mask
  const transparentImg = img.clone();
  const maxR = 504;
  const feather = 2.5;

  transparentImg.scan(0, 0, w, h, function (x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR + feather) {
      this.bitmap.data[idx + 3] = 0; // Transparent
    } else if (dist > maxR - feather) {
      const factor = (maxR + feather - dist) / (2 * feather);
      this.bitmap.data[idx + 3] = Math.round(this.bitmap.data[idx + 3] * factor);
    }
  });

  // 1. Save assets/images/logo.png (for in-app UI)
  const logoPath = path.join(assetsDir, 'logo.png');
  await transparentImg.writeAsync(logoPath);
  console.log('Created:', logoPath);

  // 2. Save assets/images/icon.png (standard app icon)
  const iconPath = path.join(assetsDir, 'icon.png');
  await transparentImg.writeAsync(iconPath);
  console.log('Created:', iconPath);

  // 3. Android adaptive icon foreground (1024x1024 canvas with 700x700 scaled icon inside safe zone)
  const fg = new Jimp(1024, 1024, 0x00000000);
  const targetSize = 700;
  const scaledLogo = transparentImg.clone().resize(targetSize, targetSize);
  const offset = Math.round((1024 - targetSize) / 2); // 162
  fg.composite(scaledLogo, offset, offset);
  const fgPath = path.join(assetsDir, 'android-icon-foreground.png');
  await fg.writeAsync(fgPath);
  console.log('Created:', fgPath);

  // 4. Android adaptive icon background (#040c18)
  const bg = new Jimp(1024, 1024, 0x040c18ff);
  const bgPath = path.join(assetsDir, 'android-icon-background.png');
  await bg.writeAsync(bgPath);
  console.log('Created:', bgPath);

  // 5. Save splash-icon.png
  const splashPath = path.join(assetsDir, 'splash-icon.png');
  await transparentImg.writeAsync(splashPath);
  console.log('Created:', splashPath);

  // 6. Save favicon.png
  const favicon = transparentImg.clone().resize(48, 48);
  const faviconPath = path.join(assetsDir, 'favicon.png');
  await favicon.writeAsync(faviconPath);
  console.log('Created:', faviconPath);

  // 7. Update Android native mipmaps if android/ exists
  const resDir = path.resolve(__dirname, '../android/app/src/main/res');
  if (fs.existsSync(resDir)) {
    const densities = [
      { name: 'mipmap-mdpi', size: 48 },
      { name: 'mipmap-hdpi', size: 72 },
      { name: 'mipmap-xhdpi', size: 96 },
      { name: 'mipmap-xxhdpi', size: 144 },
      { name: 'mipmap-xxxhdpi', size: 192 },
    ];

    for (const d of densities) {
      const folder = path.join(resDir, d.name);
      if (fs.existsSync(folder)) {
        // ic_launcher.png (legacy launcher icon)
        const legacyIcon = transparentImg.clone().resize(d.size, d.size);
        await legacyIcon.writeAsync(path.join(folder, 'ic_launcher.png'));
        await legacyIcon.writeAsync(path.join(folder, 'ic_launcher_round.png'));

        // Adaptive icon layers (108x108 ratio)
        const adaptiveCanvasSize = Math.round((d.size * 108) / 72);
        const adaptiveFg = fg.clone().resize(adaptiveCanvasSize, adaptiveCanvasSize);
        await adaptiveFg.writeAsync(path.join(folder, 'ic_launcher_foreground.png'));

        const adaptiveBg = bg.clone().resize(adaptiveCanvasSize, adaptiveCanvasSize);
        await adaptiveBg.writeAsync(path.join(folder, 'ic_launcher_background.png'));
        console.log(`Updated native Android resources in ${d.name}`);
      }
    }
  }

  console.log('Done generating all new logo and icon assets!');
}

processIcons().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
