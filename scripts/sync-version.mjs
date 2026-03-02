import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(import.meta.dirname, "..");

function validateVersion(raw) {
  const version = raw?.trim();
  const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
  if (!version || !semverPattern.test(version)) {
    throw new Error(
      `Invalid version \"${raw ?? ""}\". Expected semantic version like 1.2.3 or 1.2.3-beta.1.`
    );
  }
  return version;
}

function updateJsonVersion(filePath, version) {
  const raw = readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);
  json.version = version;
  writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
}

function updateCargoTomlVersion(filePath, version) {
  const raw = readFileSync(filePath, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(eol);

  let inPackage = false;
  let updated = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const sectionMatch = line.match(/^\s*\[(.+)]\s*$/);
    if (sectionMatch) {
      inPackage = sectionMatch[1] === "package";
      continue;
    }

    if (inPackage && /^\s*version\s*=\s*"[^"]+"\s*$/.test(line)) {
      lines[i] = `version = "${version}"`;
      updated = true;
      break;
    }
  }

  if (!updated) {
    throw new Error(`Could not find [package].version in ${filePath}`);
  }

  writeFileSync(filePath, `${lines.join(eol)}${eol}`, "utf8");
}

function run() {
  const version = validateVersion(process.argv[2]);

  const packageJsonPath = path.join(rootDir, "package.json");
  const tauriConfPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
  const cargoTomlPath = path.join(rootDir, "src-tauri", "Cargo.toml");

  updateJsonVersion(packageJsonPath, version);
  updateJsonVersion(tauriConfPath, version);
  updateCargoTomlVersion(cargoTomlPath, version);

  console.log(`Synchronized app version to ${version}`);
}

run();
