import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputPath = path.resolve("images/Licenciamento.png");
const backupPath = path.resolve("images/Licenciamento-original.png");

const BRAND_TEAL = { h: 187, s: 0.52, l: 0.22 };
const BRAND_MINT = { h: 186, s: 0.28, l: 0.78 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function lilacScore(h, s, l) {
  if (l < 0.1 || l > 0.92) return 0;
  const hueScore = Math.exp(-((hueDistance(h, 285) / 42) ** 2));
  const satScore = clamp((s - 0.03) / 0.28, 0, 1);
  const whiteGuard = l > 0.78 && s < 0.08 ? 0 : 1;
  return hueScore * satScore * whiteGuard;
}

function subjectScore(h, s, l) {
  let score = 0;

  if (s <= 0.07) score = Math.max(score, l > 0.82 ? 1 : 0.85);
  if (l < 0.24 && s < 0.42) score = Math.max(score, 1);
  if (h >= 8 && h <= 44 && s >= 0.1 && s <= 0.72 && l >= 0.3 && l <= 0.88) {
    score = Math.max(score, 0.95);
  }
  if (h >= 38 && h <= 68 && s >= 0.18 && l >= 0.28 && l <= 0.72) {
    score = Math.max(score, 0.55);
  }
  if (l > 0.74 && s < 0.14 && hueDistance(h, 187) > 24) score = Math.max(score, 0.92);
  if (l < 0.42 && h >= 165 && h <= 215 && s < 0.42) score = Math.max(score, 0.88);

  return score;
}

function targetTeal(h, s, l) {
  if (l > 0.56) {
    return hslToRgb(
      BRAND_MINT.h,
      clamp(BRAND_MINT.s + s * 0.08, 0.16, 0.34),
      clamp(l, 0.58, 0.84),
    );
  }
  if (l > 0.28) {
    return hslToRgb(
      BRAND_TEAL.h,
      clamp(BRAND_TEAL.s + s * 0.18, 0.28, 0.58),
      clamp(l * 0.96, 0.24, 0.56),
    );
  }
  return hslToRgb(BRAND_TEAL.h, clamp(BRAND_TEAL.s + 0.18, 0.42, 0.72), clamp(l * 0.92, 0.08, 0.24));
}

function cleanMustard(h, s, l) {
  return hslToRgb(44, clamp(s * 0.48, 0.18, 0.52), l);
}

function quantizeBackgroundTeal(l) {
  const stops = [
    [186, 0.2, 0.8],
    [187, 0.28, 0.66],
    [188, 0.38, 0.48],
    [187, 0.52, 0.3],
    [188, 0.62, 0.14],
  ];
  let nearest = stops[0];
  let best = Math.abs(l - stops[0][2]);
  for (const stop of stops) {
    const d = Math.abs(l - stop[2]);
    if (d < best) {
      best = d;
      nearest = stop;
    }
  }
  return hslToRgb(nearest[0], nearest[1], nearest[2]);
}

function cleanDarkNeutral(l) {
  return hslToRgb(0, 0, clamp(l, 0.08, 0.32));
}

function blendAmount(amount) {
  return amount > 0.55 ? 0.82 + (amount - 0.55) * 0.4 : amount;
}

function idx(width, x, y) {
  return (y * width + x) * 4;
}

function medianBackground(data, width, height, mask, x, y) {
  const values = [[], [], []];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const i = idx(width, nx, ny);
      if (mask[i >> 2] < 0.45) continue;
      values[0].push(data[i]);
      values[1].push(data[i + 1]);
      values[2].push(data[i + 2]);
    }
  }
  if (values[0].length < 4) return null;
  values.forEach((channel) => channel.sort((a, b) => a - b));
  const mid = Math.floor(values[0].length / 2);
  return [values[0][mid], values[1][mid], values[2][mid]];
}

async function main() {
  const sourcePath = fs.existsSync(backupPath) ? backupPath : inputPath;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
    console.log(`Backup saved to ${backupPath}`);
  }

  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const mask = new Float32Array(width * height);
  const output = Buffer.from(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(width, x, y);
      const a = data[i + 3];
      if (a < 16) continue;

      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);
      const bg = lilacScore(h, s, l);
      const subject = subjectScore(h, s, l);
      const amount = clamp(bg * (1 - subject), 0, 1);
      mask[y * width + x] = amount;
      const blend = blendAmount(amount);

      if (subject >= 0.82 && l < 0.42 && h >= 160 && h <= 220) {
        [r, g, b] = cleanDarkNeutral(l);
      } else if (blend > 0.02) {
        const target = blend > 0.58 ? quantizeBackgroundTeal(l) : targetTeal(h, s, l);
        [r, g, b] = mixRgb([r, g, b], target, blend);
      } else if (h >= 40 && h <= 95 && s >= 0.18 && l >= 0.24 && l <= 0.72 && subject < 0.7) {
        [r, g, b] = mixRgb([r, g, b], cleanMustard(h, s, l), 0.72);
      } else if (subject >= 0.88 && l > 0.68 && h >= 165 && h <= 215 && s < 0.28) {
        [r, g, b] = mixRgb([r, g, b], hslToRgb(0, 0, clamp(l + 0.03, 0.72, 0.98)), 0.85);
      }

      output[i] = r;
      output[i + 1] = g;
      output[i + 2] = b;
    }
  }

  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const m = mask[y * width + x];
        if (m < 0.45) continue;
        const i = idx(width, x, y);
        const smoothed = medianBackground(output, width, height, mask, x, y);
        if (!smoothed) continue;
        output[i] = smoothed[0];
        output[i + 1] = smoothed[1];
        output[i + 2] = smoothed[2];
      }
    }
  }

  await sharp(output, { raw: { width, height, channels } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(inputPath);

  console.log(`Recolored ${inputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
