const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(__dirname, "..", "generated", "prisma");
const targetDir = path.resolve(__dirname, "..", "dist", "generated", "prisma");

if (!fs.existsSync(sourceDir)) {
  console.error(`[copy-prisma] Source directory not found: ${sourceDir}`);
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`[copy-prisma] Copied Prisma client to ${targetDir}`);

