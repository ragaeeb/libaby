import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dir, "..");
const iconsDir = path.join(rootDir, "src-tauri", "icons");
const sourcePng = path.join(iconsDir, "icon.png");
const sourceIcns = path.join(iconsDir, "icon.icns");
const sourceWebSvg = path.join(rootDir, "public", "vite.svg");
const publicDir = path.join(rootDir, "public");

const requiredIconFiles = new Set([
  "icon.png",
  "icon.icns",
  "icon.ico",
  "32x32.png",
  "128x128.png",
  "128x128@2x.png",
  ".gitkeep",
]);

function assertSourceFiles() {
  if (!existsSync(sourcePng)) throw new Error(`Missing source icon: ${sourcePng}`);
  if (!existsSync(sourceIcns)) throw new Error(`Missing source icon: ${sourceIcns}`);
  if (!existsSync(sourceWebSvg)) throw new Error(`Missing source web icon: ${sourceWebSvg}`);
}

function generateDesktopIcons() {
  const result = Bun.spawnSync(["bunx", "tauri", "icon", sourcePng, "--output", iconsDir], {
    cwd: rootDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`tauri icon generation failed with exit code ${result.exitCode}`);
  }
}

function pruneNonDesktopIcons() {
  for (const entry of readdirSync(iconsDir)) {
    if (requiredIconFiles.has(entry)) continue;
    rmSync(path.join(iconsDir, entry), { force: true, recursive: true });
  }
}

function ensureOutputs() {
  for (const fileName of ["32x32.png", "128x128.png", "128x128@2x.png", "icon.ico"]) {
    const output = path.join(iconsDir, fileName);
    if (!existsSync(output)) {
      throw new Error(`Missing expected generated icon: ${output}`);
    }
  }

  copyFileSync(sourceWebSvg, path.join(publicDir, "favicon.svg"));
}

function run() {
  assertSourceFiles();
  mkdirSync(iconsDir, { recursive: true });

  // Preserve explicit source-of-truth assets before tauri regenerates icon set.
  const iconPng = readFileSync(sourcePng);
  const iconIcns = readFileSync(sourceIcns);

  try {
    generateDesktopIcons();
  } finally {
    writeFileSync(sourcePng, iconPng);
    writeFileSync(sourceIcns, iconIcns);
  }

  pruneNonDesktopIcons();
  ensureOutputs();

  console.log("Icon sync complete (desktop targets only).");
}

run();
