import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const outputDirectory = path.resolve('dist');
const appGzipBudgetBytes = 200 * 1024;
const initialGzipBudgetBytes = 200 * 1024;
const totalGzipBudgetBytes = 2.5 * 1024 * 1024;

function findJavaScriptAssets(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findJavaScriptAssets(entryPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
  });
}

function findHtmlScripts(html) {
  const scripts = [];
  for (const [, tag, body] of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi)) {
    const src = /\bsrc\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2];
    if (src) scripts.push({ src });
    else if (body.trim()) scripts.push({ body });
  }
  return scripts;
}

function findModulePreloads(html) {
  const references = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/\brel\s*=\s*(["'])modulepreload\1/i.test(tag)) continue;
    const href = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2];
    if (href) references.push(href);
  }
  return references;
}

function resolveOutputAsset(reference, htmlPath) {
  try {
    const url = new URL(reference, pathToFileURL(htmlPath));
    if (url.protocol !== 'file:' || !url.pathname.endsWith('.js')) return undefined;
    const absolutePath = fileURLToPath(url);
    const relativePath = path.relative(outputDirectory, absolutePath).replaceAll('\\', '/');
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return undefined;
    return relativePath;
  } catch {
    return undefined;
  }
}

if (!statSync(outputDirectory, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('Production output is missing; run `npm run build` first.');
  process.exit(1);
}

const javascriptAssets = findJavaScriptAssets(outputDirectory);
if (javascriptAssets.length === 0) {
  console.error(`No JavaScript assets found in ${outputDirectory}.`);
  process.exit(1);
}

const results = javascriptAssets.map((filePath) => {
  const sourceBytes = readFileSync(filePath);
  return {
    file: path.relative(outputDirectory, filePath).replaceAll('\\', '/'),
    sourceBytes: sourceBytes.length,
    gzipBytes: gzipSync(sourceBytes, { level: 9 }).length,
  };
});

const htmlPath = path.join(outputDirectory, 'index.html');
const initialAssetNames = new Set();
if (statSync(htmlPath, { throwIfNoEntry: false })?.isFile()) {
  const html = readFileSync(htmlPath, 'utf8');
  for (const { src, body } of findHtmlScripts(html)) {
    if (src) {
      const assetName = resolveOutputAsset(src, htmlPath);
      if (assetName) initialAssetNames.add(assetName);
    } else if (body) {
      const index = results.filter((asset) => asset.file.startsWith('index.html#inline-script-')).length + 1;
      const sourceBytes = Buffer.from(body);
      const file = `index.html#inline-script-${index}`;
      results.push({
        file,
        sourceBytes: sourceBytes.length,
        gzipBytes: gzipSync(sourceBytes, { level: 9 }).length,
      });
      initialAssetNames.add(file);
    }
  }
  for (const reference of findModulePreloads(html)) {
    const assetName = resolveOutputAsset(reference, htmlPath);
    if (assetName) initialAssetNames.add(assetName);
  }
}

const totalGzipBytes = results.reduce((sum, asset) => sum + asset.gzipBytes, 0);
const appGzipBytes = results
  .filter((asset) => asset.file.startsWith('assets/'))
  .reduce((sum, asset) => sum + asset.gzipBytes, 0);
const initialGzipBytes = results
  .filter((asset) => initialAssetNames.has(asset.file))
  .reduce((sum, asset) => sum + asset.gzipBytes, 0);

for (const asset of results) {
  console.log(
    `dist/${asset.file}: ${(asset.sourceBytes / 1024).toFixed(1)} KiB raw, ` +
      `${(asset.gzipBytes / 1024).toFixed(1)} KiB gzip`
  );
}
console.log(
  `App bundle gzip: ${(appGzipBytes / 1024).toFixed(1)} / ` +
    `${(appGzipBudgetBytes / 1024).toFixed(0)} KiB`
);
console.log(
  `Initial JavaScript gzip: ${(initialGzipBytes / 1024).toFixed(1)} / ` +
    `${(initialGzipBudgetBytes / 1024).toFixed(0)} KiB`
);
console.log(
  `Total shipped JavaScript gzip: ${(totalGzipBytes / 1024 / 1024).toFixed(2)} / ` +
    `${(totalGzipBudgetBytes / 1024 / 1024).toFixed(1)} MiB`
);

if (appGzipBytes > appGzipBudgetBytes) {
  console.error('Application bundle gzip budget exceeded.');
  process.exitCode = 1;
}
if (initialGzipBytes > initialGzipBudgetBytes) {
  console.error('Initial JavaScript gzip budget exceeded.');
  process.exitCode = 1;
}
if (totalGzipBytes > totalGzipBudgetBytes) {
  console.error('Total shipped JavaScript gzip budget exceeded.');
  process.exitCode = 1;
}
