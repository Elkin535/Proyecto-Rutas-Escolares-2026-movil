const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const userUploadedPath =
  'C:/Users/LUISA GONZALEZ/.gemini/antigravity/brain/b7f059e8-36ae-4eb2-ae37-152b26717074/.user_uploaded/media_1795490064001_6a8d9a3f.png';
const assetsDir = path.resolve(process.cwd(), 'assets/images');

async function processIcons() {
  console.log('Loading new SchoolTrack source image...');
  const img = await Jimp.read(userUploadedPath);
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  // Detect non-transparent bounding box of the icon artwork
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  img.scan(0, 0, w, h, function (x, y, idx) {
    const a = this.bitmap.data[idx + 3];
    if (a > 10) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = img.clone().crop(minX, minY, cropW, cropH);

  // Place cropped artwork centered on a square canvas so aspect ratio is preserved
  const squareSide = Math.max(cropW, cropH);
  const squareArt = new Jimp(squareSide, squareSide, 0x00000000);
  squareArt.composite(
    cropped,
    Math.round((squareSide - cropW) / 2),
    Math.round((squareSide - cropH) / 2)
  );

  // 1. Standard 1024x1024 icon (980x980 artwork centered on 1024x1024 transparent canvas)
  const fullCanvas = new Jimp(1024, 1024, 0x00000000);
  const mainTargetSize = 980;
  const mainScaled = squareArt.clone().resize(mainTargetSize, mainTargetSize);
  const mainOffset = Math.round((1024 - mainTargetSize) / 2);
  fullCanvas.composite(mainScaled, mainOffset, mainOffset);

  // Save assets/images/logo.png (for in-app UI: index, login, drawer menu)
  const logoPath = path.join(assetsDir, 'logo.png');
  await fullCanvas.writeAsync(logoPath);
  console.log('Created:', logoPath);

  // 2. Save assets/images/icon.png (primary app icon for Expo / iOS / Android fallback)
  const iconPath = path.join(assetsDir, 'icon.png');
  await fullCanvas.writeAsync(iconPath);
  console.log('Created:', iconPath);

  // 3. Save assets/images/splash-icon.png (splash screen icon)
  const splashPath = path.join(assetsDir, 'splash-icon.png');
  await fullCanvas.writeAsync(splashPath);
  console.log('Created:', splashPath);

  // 4. Android adaptive icon foreground (1024x1024 canvas with 690x690 icon inside 66% safe zone)
  const fg = new Jimp(1024, 1024, 0x00000000);
  const fgTargetSize = 690;
  const fgScaled = squareArt.clone().resize(fgTargetSize, fgTargetSize);
  const fgOffset = Math.round((1024 - fgTargetSize) / 2);
  fg.composite(fgScaled, fgOffset, fgOffset);
  const fgPath = path.join(assetsDir, 'android-icon-foreground.png');
  await fg.writeAsync(fgPath);
  console.log('Created:', fgPath);

  // 5. Android adaptive icon background (#040c18)
  const bg = new Jimp(1024, 1024, 0x040c18ff);
  const bgPath = path.join(assetsDir, 'android-icon-background.png');
  await bg.writeAsync(bgPath);
  console.log('Created:', bgPath);

  // 6. Android adaptive monochrome icon (1024x1024 white silhouette of bus + pin + route + speed lines)
  const mono = fg.clone();
  mono.scan(0, 0, 1024, 1024, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];

    if (a < 20) {
      this.bitmap.data[idx + 3] = 0;
      return;
    }

    // White bus & yellow pin/arc/speed-lines have high R & G compared to the blue background
    const warmStrength = Math.max(0, Math.min(255, Math.round((r + g) / 2 - b * 0.45)));
    if (warmStrength > 55) {
      const alphaFactor = Math.min(1, (warmStrength - 55) / 85);
      this.bitmap.data[idx] = 255;
      this.bitmap.data[idx + 1] = 255;
      this.bitmap.data[idx + 2] = 255;
      this.bitmap.data[idx + 3] = Math.round(a * alphaFactor);
    } else {
      this.bitmap.data[idx + 3] = 0;
    }
  });
  const monoPath = path.join(assetsDir, 'android-icon-monochrome.png');
  await mono.writeAsync(monoPath);
  console.log('Created:', monoPath);

  // 7. Save assets/images/favicon.png (48x48 for web)
  const favicon = fullCanvas.clone().resize(48, 48);
  const faviconPath = path.join(assetsDir, 'favicon.png');
  await favicon.writeAsync(faviconPath);
  console.log('Created:', faviconPath);

  // 8. Update Android native mipmaps if android/ exists
  const resDir = path.resolve(process.cwd(), 'android/app/src/main/res');
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
        const legacyIcon = fullCanvas.clone().resize(d.size, d.size);
        await legacyIcon.writeAsync(path.join(folder, 'ic_launcher.png'));
        await legacyIcon.writeAsync(path.join(folder, 'ic_launcher_round.png'));

        const adaptiveCanvasSize = Math.round((d.size * 108) / 72);
        const adaptiveFg = fg.clone().resize(adaptiveCanvasSize, adaptiveCanvasSize);
        await adaptiveFg.writeAsync(path.join(folder, 'ic_launcher_foreground.png'));

        const adaptiveBg = bg.clone().resize(adaptiveCanvasSize, adaptiveCanvasSize);
        await adaptiveBg.writeAsync(path.join(folder, 'ic_launcher_background.png'));
        console.log(`Updated native Android resources in ${d.name}`);
      }
    }
  }

  console.log('Done generating all new SchoolTrack logo and icon assets!');
}

processIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
