import fs from "fs";
import path from "path";
import { PNG } from "pngjs";

const TARGET = { r: 248, g: 249, b: 251 };
const TOLERANCE = 10;

function isBackgroundColor(r, g, b) {
  const nearTarget =
    Math.abs(r - TARGET.r) <= TOLERANCE &&
    Math.abs(g - TARGET.g) <= TOLERANCE &&
    Math.abs(b - TARGET.b) <= TOLERANCE;

  const nearWhite =
    r >= 245 &&
    g >= 245 &&
    b >= 245 &&
    Math.max(r, g, b) - Math.min(r, g, b) <= 8;

  return nearTarget || nearWhite;
}

function removeBackground(inputPath, outputPath) {
  const png = PNG.sync.read(fs.readFileSync(inputPath));
  const { width, height, data } = png;
  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x++) {
    queue.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y++) {
    queue.push([0, y], [width - 1, y]);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;

    const i = y * width + x;
    if (visited[i]) continue;

    const idx = i << 2;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    if (!isBackgroundColor(r, g, b)) continue;

    visited[i] = 1;
    data[idx + 3] = 0;

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  fs.writeFileSync(outputPath, PNG.sync.write(png));
}

const imagesDir = path.resolve("images");
const files = ["Consultoria.png", "Licenciamento.png", "Assessoria.png"];

for (const file of files) {
  const filePath = path.join(imagesDir, file);
  removeBackground(filePath, filePath);
  console.log(`Processed ${file}`);
}
