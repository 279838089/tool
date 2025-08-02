/**
 * 生成 public/novels 索引文件：
 * - public/novels/index.json: { books: ["书名1", ...] }
 * - public/novels/<book>/index.json: { chapters: ["001_xxx.md", ...] }
 *
 * 读取源：./novels
 * 输出目标：./public/novels
 *
 * 使用：
 *   node scripts/build-novels-index.js
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'novels');
const OUT_DIR = path.join(ROOT, 'public', 'novels');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function readDirSafe(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

function naturalKey(name) {
  const m = name.match(/^(\d+)[^\d]?/);
  const n = m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
  return [n, name.toLowerCase()];
}
function compareByPrefixNumber(a, b) {
  const ka = naturalKey(a);
  const kb = naturalKey(b);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  return ka[1].localeCompare(kb[1], 'zh-CN', { numeric: true, sensitivity: 'base' });
}

function main() {
  if (!isDir(SRC_DIR)) {
    console.error(`[build-novels-index] 源目录不存在: ${SRC_DIR}`);
    process.exit(1);
  }

  ensureDir(OUT_DIR);

  const books = readDirSafe(SRC_DIR)
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' }));

  // 写总索引
  const indexPath = path.join(OUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify({ books }, null, 2), 'utf8');

  // 为每本书生成章节索引，并复制缺失的 md 到 public/novels 下（保持与源一致）
  for (const book of books) {
    const srcBookDir = path.join(SRC_DIR, book);
    const outBookDir = path.join(OUT_DIR, book);
    ensureDir(outBookDir);

    const chapters = readDirSafe(srcBookDir)
      .filter(d => d.isFile() && d.name.toLowerCase().endsWith('.md'))
      .map(d => d.name)
      .sort(compareByPrefixNumber);

    // 写每本书的 index.json
    const bookIndexPath = path.join(outBookDir, 'index.json');
    fs.writeFileSync(bookIndexPath, JSON.stringify({ chapters }, null, 2), 'utf8');

    // 将 md 文件复制到 public/novels/<book>/ 下（若已存在则跳过）
    for (const file of chapters) {
      const srcFile = path.join(srcBookDir, file);
      const outFile = path.join(outBookDir, file);
      if (!isFile(outFile)) {
        fs.copyFileSync(srcFile, outFile);
      }
    }
  }

  console.log(`[build-novels-index] 完成。生成：${indexPath} 以及每本书的 index.json`);
}

main();